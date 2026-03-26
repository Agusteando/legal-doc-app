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
            enum:["heading", "paragraph", "signature", "stamp", "table", "divider", "form_field", "handwritten_note", "list"] 
          },
          alignment: { 
            type: "string", 
            enum: ["left", "center", "right", "justify"]
          },
          source_content: { type: "string" },
          translated_content: { type: "string" },
          form_label: { type: "string" },
          form_value: { type: "string" },
          table_data: {
            type: "array",
            items: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          list_items: {
            type: "array",
            items: { type: "string" }
          }
        },
        required:[
          "type", 
          "alignment", 
          "source_content", 
          "translated_content", 
          "form_label", 
          "form_value", 
          "table_data",
          "list_items"
        ],
        additionalProperties: false
      }
    }
  },
  required:["source_text", "translated_text", "confidence_score", "needs_review", "layout_blocks"],
  additionalProperties: false
};

const systemPrompt = `Extract and translate the legal document page into structured JSON layout blocks. You are an expert at parsing complex Latin American legal layouts. Break the document down granularly.

CRITICAL HARD REQUIREMENTS:
1. PRESERVE LEGAL FIDELITY: Paragraphs, true line breaks, headers, font size hierarchy, and overall text density MUST be reconstructed exactly as they appear visually. Use explicit \\n characters for literal line breaks within text strings.
2. NEVER invent placeholders like 'Signature here' or 'Circular stamp with text'. Extract legible text ONLY. If it is illegible, do NOT extract or describe it.
3. Do NOT invent decorative separators or aesthetic borders.
4. Reproduce the layout accurately. Use 'table' strictly for tabular data or multi-column structural alignment.
5. Respect text formatting (<b>, <i>, <u>). Use <big> or <small> for drastic size changes.
6. Remember: The ultimate goal is an exact professional reproduction, not beautification.`;

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
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Fetch error: ${imageResponse.statusText}`);
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    const base64ImageUrl = `data:${mimeType};base64,${base64String}`;

    // Kept gpt-5.4 exact specification as mandated
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      reasoning_effort: "medium",
      max_completion_tokens: 25000,
      messages:[
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:[
            { type: "text", text: "Process this complex legal document page image into structured JSON layout blocks prioritizing line break and font-size fidelity." },
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
          extracted_json = ?, source_text = ?, translated_text = ?
      WHERE id = ?
    `,[duration, jsonStr, parsed.source_text, parsed.translated_text, id]);

    return { success: true, json: parsed };

  } catch (error: any) {
    const duration = Math.round((Date.now() - start) / 1000);
    const errorMessage = error.message || 'An unknown error occurred';
    await db.query(`UPDATE pages SET job_status = 'error', job_duration_sec = ?, job_error = ? WHERE id = ?`, [duration, errorMessage, id]);
    throw createError({ statusCode: 500, statusMessage: errorMessage });
  }
});