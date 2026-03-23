import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    if (!docs.length) throw new Error('Workspace Document not found in DB.');
    const filename = docs[0].filename.replace(/\s+/g, '_') + '_Export.pdf';

    const [pages]: any = await db.query(`
      SELECT extracted_json FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
      ORDER BY sort_order ASC
    `, [id]);

    let innerHtml = '';
    for (const page of pages) {
      if (page.extracted_json) {
        try {
          const data = JSON.parse(page.extracted_json);
          if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
            data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
          }
          innerHtml += '<div class="page-break"></div>';
        } catch (e) {
          console.warn("Skipped invalid JSON block during export");
        }
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Caveat:wght@500;700&display=swap');
          
          @page { 
            size: letter; 
            margin: 1in; 
          }
          
          body { 
            font-family: 'Merriweather', serif; 
            color: #111827; 
            margin: 0; 
            padding: 0; 
            font-size: 11pt; 
            line-height: 1.6;
            background: #fff;
          }
          
          .page-break { page-break-after: always; }
          
          /* Hide print artifacts */
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${innerHtml}
        <script>
          // Automatically trigger print dialog once layout is fully rendered
          window.onload = () => {
            setTimeout(() => {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    return { success: true, html: fullHtml, filename };

  } catch (err: any) {
    console.error("Export Generation Error:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});