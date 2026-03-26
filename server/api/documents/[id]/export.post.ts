import { getDb } from '../../../utils/db';
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
    
    let innerHtml = doc.manual_html_override;
    
    if (!innerHtml) {
      const [pages]: any = await db.query(`SELECT extracted_json FROM pages WHERE document_id = ? AND is_deleted = FALSE AND is_excluded = FALSE ORDER BY sort_order ASC`, [id]);
      
      const { renderLayoutBlock } = await import('../../../../utils/renderer');
      
      innerHtml = '';
      for (const page of pages) {
        if (page.extracted_json) {
          try {
            const data = JSON.parse(page.extracted_json);
            if (data.layout_blocks && Array.isArray(data.layout_blocks)) {
              data.layout_blocks.forEach((block: any) => innerHtml += renderLayoutBlock(block));
            }
            innerHtml += '<div class="page-break" style="page-break-after: always;"></div>\n';
          } catch (e) {}
        }
      }
    }

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Caveat:wght@500;700&display=swap');
          @page { size: letter; margin: 1in; }
          body { font-family: 'Merriweather', serif; color: #111827; margin: 0; padding: 0; font-size: 11pt; line-height: 1.6; background: #fff; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        ${innerHtml}
      </body>
      </html>
    `;

    console.log(`[Export Util] Dispatching PDF render request to ${config.renderServiceUrl}...`);
    
    // Robust multi-layered auth payload to survive strict API Gateways
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