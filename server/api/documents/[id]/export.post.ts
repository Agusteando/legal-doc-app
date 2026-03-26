import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();
  const config = useRuntimeConfig();

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    if (!docs.length) throw new Error('Document not found.');
    
    const doc = docs[0];
    const filename = doc.filename.replace(/\s+/g, '_') + '_Export.pdf';
    
    // Strict JSON -> HTML pipeline compilation
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
          // Force a strict container around each page to guarantee 1:1 printing
          innerHtml += `<div class="page-container">\n`;
          if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
            data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
          }
          innerHtml += `</div>\n`;
        } catch (e) {}
      }
    }

    // Wrap HTML in a print-ready document structure
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          /* Strict Print Styling */
          @page { size: letter; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .page-container { 
            width: 8.5in; 
            height: 11in; 
            padding: 1in; 
            box-sizing: border-box; 
            overflow: hidden; 
            page-break-after: always;
            position: relative;
          }
        </style>
      </head>
      <body>
        ${innerHtml}
      </body>
      </html>
    `;

    console.log(`[Export Pipeline] Dispatching Render Request for ${filename}`);
    
    // External service call using multi-layered Auth headers
    const renderResponse: any = await $fetch(`${config.renderServiceUrl}/render-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.renderServiceToken}`,
        'x-api-key': config.renderServiceToken,
        'Content-Type': 'application/json'
      },
      body: {
        html: fullHtml,
        filename: filename,
        token: config.renderServiceToken 
      }
    });

    if (!renderResponse.success || !renderResponse.url) {
      throw new Error(renderResponse.error || "Render service failed to return a valid PDF URL.");
    }

    return { success: true, url: renderResponse.url };

  } catch (err: any) {
    console.error("External Render Service Error:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});