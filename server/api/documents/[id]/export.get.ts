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
      innerHtml += `<div class="page-container">\n`;
      if (page.extracted_json) {
        try {
          const data = JSON.parse(page.extracted_json);
          if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
            data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
          } else {
             innerHtml += `<div style="font-family:'Times New Roman', Times, serif; font-size:11pt; line-height: 1.5; color: #000; text-align: justify;">${data.translated_text || ''}</div>`;
          }
        } catch (e) {
          console.warn("Skipped invalid JSON block during export");
        }
      }
      innerHtml += `</div>\n`;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>${filename}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap');
          
          /* Strict Print Styling - Legal Oficio Typography and Margins */
          @page { size: 8.5in 13in; margin: 1in; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.5;
            color: #000;
            text-align: justify;
            text-justify: inter-word;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .page-container { 
            width: 100%; 
            box-sizing: border-box; 
            position: relative;
            page-break-after: always;
          }
          p, div { widows: 2; orphans: 2; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          b, strong { font-weight: bold; }
          i, em { font-style: italic; }
          u { text-decoration: underline; }
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