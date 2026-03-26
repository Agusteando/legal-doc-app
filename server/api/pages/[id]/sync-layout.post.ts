import { getDb } from '../../../utils/db';
import { useRuntimeConfig } from '#imports';
import OpenAI from 'openai';

const schema = {
  type: "object",
  properties: {
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
  required:["layout_blocks"],
  additionalProperties: false
};

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const body = await readBody(event);
  const db = getDb();
  const config = useRuntimeConfig();
  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  await db.query(`UPDATE pages SET job_status = 'processing' WHERE id = ?`, [id]);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      reasoning_effort: "medium",
      max_completion_tokens: 15000,
      messages:[
        { 
          role: "system", 
          content: "You are a legal layout packager. Take the provided manually edited English text and map it directly into the strict JSON layout_blocks schema. Focus entirely on accurate structural tagging (type: heading, paragraph, table). Do not try to micromanage precise margins or fonts. Standard paragraphs MUST use `justify` alignment. NEVER include JSON syntax artifacts like `},{` inside text strings. CRITICAL BILINGUAL BEHAVIOR: Place the English text into the `translated_*` fields (e.g., `translated_list_items`, `translated_table_data`, `translated_form_label`) and leave the `source_*` fields empty if you don't have the original source." 
        },
        { role: "user", content: `Repackage this text into layout blocks:\n\n${body.translated_text}` }
      ],
      response_format: { type: "json_schema", json_schema: { name: "sync_layout", strict: true, schema } }
    });

    const parsed = JSON.parse(response.choices[0].message.content || '{}');
    
    const [existing]: any = await db.query(`SELECT extracted_json FROM pages WHERE id = ?`, [id]);
    let currentData = { source_text: body.source_text, translated_text: body.translated_text, confidence_score: 1, needs_review: false, layout_blocks: [] };
    if (existing.length && existing[0].extracted_json) {
      currentData = JSON.parse(existing[0].extracted_json);
    }
    currentData.layout_blocks = parsed.layout_blocks;

    const finalJsonStr = JSON.stringify(currentData);

    await db.query(`
      UPDATE pages 
      SET job_status = 'completed', extracted_json = ?, is_stale = FALSE
      WHERE id = ?
    `,[finalJsonStr, id]);

    return { success: true, json: currentData };
  } catch (error: any) {
    await db.query(`UPDATE pages SET job_status = 'error', job_error = ? WHERE id = ?`, [error.message, id]);
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});