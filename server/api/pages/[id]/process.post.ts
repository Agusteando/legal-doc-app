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
          type: { type: "string", enum: ["heading", "paragraph", "signature", "stamp", "table"] },
          source_content: { type: "string" },
          translated_content: { type: "string" }
        },
        required: ["type", "source_content", "translated_content"],
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
  if (!pages.length) throw createError({ statusCode: 404 });

  const start = Date.now();
  await db.query(`UPDATE pages SET job_status = 'processing', job_error = NULL WHERE id = ?`, [id]);

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      messages: [
        { role: "system", content: "Extract and translate the legal document page exactly according to the schema. Return only valid JSON." },
        {
          role: "user",
          content: [
            { type: "text", text: "Process this legal document page image into structured JSON." },
            { type: "image_url", image_url: { url: pages[0].image_url } }
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
    await db.query(`UPDATE pages SET job_status = 'error', job_duration_sec = ?, job_error = ? WHERE id = ?`, [duration, error.message, id]);
    throw createError({ statusCode: 500, statusMessage: error.message });
  }
});