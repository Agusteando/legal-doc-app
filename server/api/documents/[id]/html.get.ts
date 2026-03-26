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
        // Container relies strictly on 100% width matching the rigorous PDF margins. Bottom margin mimics standard previewing breaks.
        computedHtml += `<div class="page-container" style="width: 100%; box-sizing: border-box; overflow: hidden; page-break-after: always; position: relative; margin-bottom: 2rem;">\n`;
        if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
          data.layout_blocks.forEach((block: any) => computedHtml += renderLayoutBlock(block));
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