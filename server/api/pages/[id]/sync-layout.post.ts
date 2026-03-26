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
          type: { type: "string", enum:["heading", "paragraph", "signature", "stamp", "table", "divider", "form_field", "handwritten_note", "list"] },
          alignment: { type: "string", enum: ["left", "center", "right", "justify"] },
          source_content: { type: "string" },
          translated_content: { type: "string" },
          form_label: { type: "string" },
          form_value: { type: "string" },
          table_data: { type: "array", items: { type: "array", items: { type: "string" } } },
          list_items: { type: "array", items: { type: "string" } }
        },
        required:["type", "alignment", "source_content", "translated_content", "form_label", "form_value", "table_data", "list_items"],
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
          content: "You are a layout packager. Take the provided manually edited translation text and map it directly into the strict JSON layout_blocks schema. Do NOT alter the text content. Preserve line breaks exactly using \\n. Assign realistic structural blocks ensuring professional and exact document fidelity." 
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