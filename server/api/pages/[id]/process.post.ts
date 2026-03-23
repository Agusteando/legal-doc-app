import { getDb } from '../../../utils/db';
import { useRuntimeConfig } from '#imports';
import OpenAI from 'openai';

const schema = {
  type: "object",
  properties: {
    source_text: { type: "string" },
    translated_text: { type: "string" },
    confidence_score: { type: "number" },
    needs_review: { type: "boolean" },
    layout_blocks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { 
            type: "string", 
            enum: ["heading", "paragraph", "signature", "stamp", "table", "divider", "form_field"] 
          },
          alignment: { 
            type: "string", 
            enum: ["left", "center", "right", "justify"],
            description: "Text alignment. Default to 'left' if unsure or not applicable."
          },
          source_content: { 
            type: "string",
            description: "Raw source text. Empty string if not applicable."
          },
          translated_content: { 
            type: "string", 
            description: "Translated content. Use <b> for bold, <i> for italic, and <u> for underline tags inline where applicable. Empty string if not applicable." 
          },
          form_label: { 
            type: "string", 
            description: "Only populate if type is form_field. Otherwise leave as an empty string." 
          },
          form_value: { 
            type: "string", 
            description: "Only populate if type is form_field. Otherwise leave as an empty string." 
          },
          table_data: {
            type: "array",
            description: "2D array [row][column] of strings. Top row is headers. Return an empty array [] if type is not a table.",
            items: { 
              type: "array", 
              items: { type: "string" } 
            }
          }
        },
        // In OpenAI strict mode, EVERY property must be explicitly marked as required.
        // We handle optionality by instructing the model to return empty strings or arrays.
        required: [
          "type", 
          "alignment", 
          "source_content", 
          "translated_content", 
          "form_label", 
          "form_value", 
          "table_data"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["source_text", "translated_text", "confidence_score", "needs_review", "layout_blocks"],
  additionalProperties: false
};

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();
  const config = useRuntimeConfig();
  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const [pages]: any = await db.query(`SELECT image_url FROM pages WHERE id = ?`, [id]);
  if (!pages.length) throw createError({ statusCode: 404, statusMessage: 'Page not found in database.' });

  const start = Date.now();
  await db.query(`UPDATE pages SET job_status = 'processing', job_error = NULL WHERE id = ?`, [id]);

  try {
    const imageUrl = pages[0].image_url;

    // We fetch the image from the URL server-to-server and convert it to Base64.
    // This entirely bypasses OpenAI's bot crawler, preventing the "Timeout while downloading" error.
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Our server failed to fetch the image from storage: ${imageResponse.statusText}`);
    }
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    const base64ImageUrl = `data:${mimeType};base64,${base64String}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "Extract and translate the legal document page into structured JSON layout blocks. Strictly respect formatting (bold=<b>, italic=<i>, underline=<u>) within translated_content. Identify dividers, alignments, and form field rows carefully." 
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Process this legal document page image into structured JSON." },
            { type: "image_url", image_url: { url: base64ImageUrl } }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "legal_translation", strict: true, schema }
      }
    });

    const jsonStr = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(jsonStr);
    const duration = Math.round((Date.now() - start) / 1000);

    await db.query(`
      UPDATE pages 
      SET job_status = 'completed', job_duration_sec = ?, 
          extracted_json = ?, source_text = ?, translated_text = ?, status = 'translated'
      WHERE id = ?
    `, [duration, jsonStr, parsed.source_text, parsed.translated_text, id]);

    return { success: true, json: parsed };

  } catch (error: any) {
    const duration = Math.round((Date.now() - start) / 1000);
    const errorMessage = error.message || 'An unknown error occurred';
    
    await db.query(`UPDATE pages SET job_status = 'error', job_duration_sec = ?, job_error = ? WHERE id = ?`, [duration, errorMessage, id]);
    
    throw createError({ statusCode: 500, statusMessage: errorMessage });
  }
});