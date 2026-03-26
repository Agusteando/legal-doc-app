import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();
  
  const token = process.env.RENDER_SERVICE_TOKEN || '';

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    if (!docs.length) throw new Error('Document not found.');
    
    const doc = docs[0];
    const filename = doc.filename.replace(/\s+/g, '_') + '_Export.pdf';
    
    const [pages]: any = await db.query(`
      SELECT extracted_json, manual_html_override FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
      ORDER BY sort_order ASC
    `, [id]);
    
    let innerHtml = '';
    for (const page of pages) {
      innerHtml += `<div class="page-container">\n`;
      if (page.manual_html_override) {
        innerHtml += page.manual_html_override;
      } else if (page.extracted_json) {
        try {
          const data = JSON.parse(page.extracted_json);
          if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
            data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
          } else {
             innerHtml += `<p style="font-family:'Times New Roman', Times, serif; font-size:11pt;">${data.translated_text || ''}</p>`;
          }
        } catch (e) {
          console.error(`[Export] Failed to parse JSON for page ${page.id}`);
        }
      }
      innerHtml += `</div>\n`;
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          /* Strict Print Styling - Tamaño Oficio (8.5 x 13 inches) */
          @page { size: 8.5in 13in; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .page-container { 
            width: 8.5in; 
            height: 13in; 
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

    const maskedToken = token ? `${token.substring(0, 4)}...${token.slice(-4)}` : 'MISSING';
    const htmlStatus = fullHtml && fullHtml.length > 0 ? `Non-empty (${fullHtml.length} bytes)` : 'EMPTY';
    
    console.log(`[Export Pipeline] Dispatching Render Request for ${filename}`);
    console.log(`[Export Pipeline] Auth Token exists: ${!!token} (Bearer ${maskedToken})`);
    console.log(`[Export Pipeline] HTML Payload: ${htmlStatus}`);
    
    const renderResponse: any = await $fetch(`https://puppeteer.casitaapps.com/render-pdf`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: {
        html: fullHtml,
        filename: filename
      }
    });

    if (!renderResponse || !renderResponse.success || !renderResponse.url) {
      throw new Error(renderResponse?.error || "Render service failed to return a valid PDF URL.");
    }

    console.log(`[Export Pipeline] Render successful. Storage URL obtained: ${renderResponse.url}`);
    
    return { success: true, url: renderResponse.url };

  } catch (err: any) {
    console.error(`[Export Pipeline Error]`, err.message || err);
    throw createError({ statusCode: 500, statusMessage: err.message || "Export failed" });
  }
});