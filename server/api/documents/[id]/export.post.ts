import { getDb } from '../../../utils/db';
import { renderLayoutBlock } from '../../../../utils/renderer';

export default defineEventHandler(async (event) => {
  const id = event.context.params?.id;
  const db = getDb();
  const token = process.env.RENDER_SERVICE_TOKEN;

  try {
    const [docs]: any = await db.query(`SELECT * FROM documents WHERE id = ? LIMIT 1`, [id]);
    if (!docs.length) throw new Error('Document not found.');
    
    const doc = docs[0];
    const filename = doc.filename.replace(/\s+/g, '_') + '_Export.pdf';
    
    // Assemble the full document strictly from page data
    const [pages]: any = await db.query(`
      SELECT extracted_json, manual_html_override FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE 
      ORDER BY sort_order ASC
    `, [id]);
    
    let innerHtml = '';
    for (const page of pages) {
      // Wrap each page in a strict Legal sized container
      innerHtml += `<div class="page-container">\n`;
      
      // If the user made WYSIWYG overrides on this page, use that.
      if (page.manual_html_override) {
        innerHtml += page.manual_html_override;
      } 
      // Otherwise use the strict JSON pipeline
      else if (page.extracted_json) {
        try {
          const data = JSON.parse(page.extracted_json);
          if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
            data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
          } else {
             innerHtml += `<p style="font-family:'Times New Roman', Times, serif; font-size:11pt;">${data.translated_text || ''}</p>`;
          }
        } catch (e) {}
      }
      innerHtml += `</div>\n`;
    }

    // Wrap HTML in a print-ready document structure
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          /* Strict Print Styling - Legal Paper Size */
          @page { size: legal; margin: 0; }
          body { 
            margin: 0; 
            padding: 0; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .page-container { 
            width: 8.5in; 
            height: 14in; 
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

    console.log(`[Export Pipeline] Dispatching Render Request for ${filename}. Auth token present: ${!!token}`);
    
    // Strict, raw JSON fetch per requirements
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

    if (!renderResponse.success || !renderResponse.url) {
      throw new Error(renderResponse.error || "Render service failed to return a valid PDF URL.");
    }

    return { success: true, url: renderResponse.url };

  } catch (err: any) {
    console.error("External Render Service Error:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});