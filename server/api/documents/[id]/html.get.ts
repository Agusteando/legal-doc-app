import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();

  const [docs]: any = await db.query(`SELECT id FROM documents WHERE id = ? LIMIT 1`, [id]);
  if (!docs.length) throw createError({ statusCode: 404, statusMessage: 'Document not found.' });

  const [pages]: any = await db.query(`
    SELECT extracted_json FROM pages 
    WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
    ORDER BY sort_order ASC
  `, [id]);

  let computedHtml = '';
  for (const page of pages) {
    if (page.extracted_json) {
      try {
        const data = JSON.parse(page.extracted_json);
        // Container matches rigorous PDF Oficio 1-to-1 mapping
        computedHtml += `<div class="page-container" style="width: 8.5in; height: 13in; padding: 0.8in 1in; box-sizing: border-box; position: relative; margin-bottom: 2rem; page-break-after: always; display: flex; flex-direction: column; justify-content: flex-start; overflow: hidden; font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; line-height: 1.35; text-align: justify; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); background: #fff;">\n`;
        if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
          data.layout_blocks.forEach((block: any) => computedHtml += renderLayoutBlock(block));
        } else {
          computedHtml += `<div style="flex-shrink: 1;">${data.translated_text || ''}</div>`;
        }
        computedHtml += `</div>\n`;
      } catch (e) {
        console.warn("Skipped invalid JSON block during compile");
      }
    }
  }

  return { 
    is_override: false,
    html: computedHtml || '<div style="color:#94a3b8; font-style:italic; text-align:center; padding-top: 2rem;">No extracted page data found yet. Process pages to begin document assembly.</div>',
    computed_html: computedHtml
  };
});