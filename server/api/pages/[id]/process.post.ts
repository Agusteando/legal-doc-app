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
          spacing_before: {
            type: "string",
            enum: ["none", "small", "medium", "large", "xlarge"]
          },
          spacing_after: {
            type: "string",
            enum: ["none", "small", "medium", "large", "xlarge"]
          },
          font_size: {
            type: "string",
            enum: ["small", "normal", "large", "xlarge"]
          },
          font_weight: {
            type: "string",
            enum: ["normal", "bold"]
          },
          indentation: {
            type: "string",
            enum: ["none", "small", "medium", "large"]
          },
          source_content: { type: "string" },
          translated_content: { type: "string" },
          source_form_label: { type: "string" },
          translated_form_label: { type: "string" },
          source_form_value: { type: "string" },
          translated_form_value: { type: "string" },
          source_table_data: {
            type: "array",
            items: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          translated_table_data: {
            type: "array",
            items: { 
              type: "array", 
              items: { type: "string" } 
            }
          },
          source_list_items: {
            type: "array",
            items: { type: "string" }
          },
          translated_list_items: {
            type: "array",
            items: { type: "string" }
          }
        },
        required:[
          "type", 
          "alignment",
          "spacing_before",
          "spacing_after",
          "font_size",
          "font_weight",
          "indentation",
          "source_content", 
          "translated_content", 
          "source_form_label", 
          "translated_form_label", 
          "source_form_value", 
          "translated_form_value",
          "source_table_data",
          "translated_table_data",
          "source_list_items",
          "translated_list_items"
        ],
        additionalProperties: false
      }
    }
  },
  required:["source_text", "translated_text", "confidence_score", "needs_review", "layout_blocks"],
  additionalProperties: false
};

const systemPrompt = `Extract and translate the legal document page into structured JSON layout blocks prioritizing accurate structural tagging.

CRITICAL HARD REQUIREMENTS:
1. PURE TEXT, NO ARTIFACTS: NEVER leak JSON syntax (like \`},{\` or \`"]\`) into the actual text strings. Content must be pure human-readable legal text. Do not duplicate colons in form labels.
2. STRUCTURAL INTENT OVER VISUALS: Map text to logical blocks (heading, paragraph, table, list, signature). Do NOT attempt to micromanage precise margins or justification, as the downstream rendering pipeline strictly enforces legal Oficio dimensions and typography. Use \`spacing_before\` and \`spacing_after\` to indicate logical separation, not literal pixels.
3. ALIGNMENT & JUSTIFICATION: Standard legal body paragraphs MUST be classified as \`justify\`. Only use \`center\`, \`left\`, or \`right\` when a block is explicitly and distinctly offset from standard legal flow.
4. TYPOGRAPHIC HIERARCHY: Identify headers, titles, and body text explicitly using \`font_size\` and \`font_weight\`.
5. TRUE LINE BREAKS: Use explicit \\n characters for literal line breaks within text strings ONLY when mapping physical breaks in elements like addresses, lists, or signatures. For continuous paragraph text, let the text flow without forcing breaks.
6. NO DECORATIONS: Do not invent fake separators or aesthetics. Extract legible text ONLY.
7. BILINGUAL COMPLETENESS (CRITICAL): Every structural element MUST strictly separate the original Spanish source text from the translated English text. Populate \`source_list_items\` AND \`translated_list_items\`, \`source_table_data\` AND \`translated_table_data\`, \`source_form_label\` AND \`translated_form_label\`, etc. Never mix Spanish and English languages in the translated fields.`;

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();
  const config = useRuntimeConfig();
  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const [pages]: any = await db.query(`SELECT image_url FROM pages WHERE id = ?`, [id]);
  if (!pages.length) throw createError({ statusCode: 404, statusMessage: 'Page not found in database.' });

  const start = Date.now();
  console.log(`[Processing Pipeline] START - Page ID: ${id}`);
  
  await db.query(`UPDATE pages SET job_status = 'processing', job_error = NULL WHERE id = ?`, [id]);

  try {
    const imageUrl = pages[0].image_url;
    console.log(`[Processing Pipeline] Fetching image for Base64 conversion...`);
    
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`Fetch error: ${imageResponse.statusText}`);
    
    const arrayBuffer = await imageResponse.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageResponse.headers.get('content-type') || 'image/png';
    const base64ImageUrl = `data:${mimeType};base64,${base64String}`;

    console.log(`[Processing Pipeline] Dispatching Structured Outputs request to GPT-5.4...`);

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      reasoning_effort: "medium",
      max_completion_tokens: 25000,
      messages:[
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:[
            { type: "text", text: "Process this complex legal document page image into structured JSON layout blocks. Ensure strict cleanliness of strings with zero JSON artifacts leaked into the content." },
            { type: "image_url", image_url: { url: base64ImageUrl } }
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "legal_extraction", strict: true, schema }
      }
    });

    const jsonStr = response.choices[0].message.content || '{}';
    const parsed = JSON.parse(jsonStr);
    const duration = Math.round((Date.now() - start) / 1000);

    console.log(`[Processing Pipeline] SUCCESS - Model responded. Prompt Tokens: ${response.usage?.prompt_tokens}, Completion Tokens: ${response.usage?.completion_tokens}. Time: ${duration}s`);

    await db.query(`
      UPDATE pages 
      SET job_status = 'completed', job_duration_sec = ?, 
          extracted_json = ?, source_text = ?, translated_text = ?
      WHERE id = ?
    `,[duration, jsonStr, parsed.source_text, parsed.translated_text, id]);

    console.log(`[Processing Pipeline] DB SAVE SUCCESS - UI State Synchronized.`);

    return { success: true, json: parsed };

  } catch (error: any) {
    const duration = Math.round((Date.now() - start) / 1000);
    const errorMessage = error.message || 'An unknown error occurred';
    
    console.error(`[Processing Pipeline] FATAL ERROR - Page ID: ${id} after ${duration}s. Details: ${errorMessage}`);
    
    await db.query(`UPDATE pages SET job_status = 'error', job_duration_sec = ?, job_error = ? WHERE id = ?`, [duration, errorMessage, id]);
    throw createError({ statusCode: 500, statusMessage: errorMessage });
  }
});