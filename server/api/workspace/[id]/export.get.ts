import { getDb } from '../../../utils/db';
import { uploadToCasita } from '../../../utils/casita';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { renderLayoutBlock } from '../../../utils/renderer';

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
          innerHtml += '<div style="page-break-after: always;"></div>';
        } catch (e) {
          console.warn("Skipped invalid JSON block during export");
        }
      }
    }

    const fullHtml = `
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Caveat:wght@500;700&display=swap');
        body { font-family: 'Merriweather', serif; color: #111827; margin: 0; padding: 0; font-size: 11pt; }
      </style></head><body>${innerHtml}</body></html>
    `;

    let executablePath = await chromium.executablePath();
    const isLocal = process.env.NODE_ENV === 'development';
    
    if (!executablePath && isLocal) {
      executablePath = process.platform === 'win32' 
        ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' 
        : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    }

    const browser = await puppeteer.launch({ 
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });
    
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'load' });
    
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } 
    });
    
    await browser.close();

    const pdfUrl = await uploadToCasita(Buffer.from(pdfBuffer), filename, 'application/pdf');
    return { success: true, url: pdfUrl };

  } catch (err: any) {
    console.error("Puppeteer Export Fatal Error:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});