import { getDb } from '../../../utils/db';
import { uploadToCasita } from '../../../utils/casita';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

function renderLayoutBlock(block: any): string {
  const align = block.alignment ? `text-align: ${block.alignment};` : 'text-align: left;';
  const content = block.translated_content || ''; 
  let html = '';
  switch (block.type) {
    case 'heading': html = `<h2 style="font-size: 1.35rem; font-weight: 700; margin-top: 1.75rem; margin-bottom: 0.75rem; color: #111827; ${align}">${content}</h2>`; break;
    case 'paragraph': html = `<p style="margin-bottom: 1.125rem; line-height: 1.7; color: #374151; ${align}">${content}</p>`; break;
    case 'signature': html = `<div style="margin: 2.5rem 0 1rem 0; padding-top: 0.5rem; border-top: 1px solid #000; width: 250px; ${align}"><span style="font-size: 0.875rem; font-style: italic; color: #6b7280;">${content || 'Signature'}</span></div>`; break;
    case 'stamp': html = `<div style="margin: 1.5rem 0; padding: 1.5rem; border: 2px dashed #4b5563; color: #4b5563; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; border-radius: 50%; max-width: 250px; text-align: center; font-size: 0.8rem; transform: rotate(-5deg); ${align}">${content || 'STAMP / SEAL'}</div>`; break;
    case 'handwritten_note': html = `<div style="margin: 1rem 0; padding: 0.75rem; color: #1e3a8a; font-family: 'Caveat', cursive; font-size: 1.25rem; line-height: 1.2; transform: rotate(-2deg); background-color: rgba(59, 130, 246, 0.05); border-left: 2px solid #3b82f6; width: fit-content; max-width: 90%; ${align}">${content}</div>`; break;
    case 'divider': html = `<hr style="margin: 2rem 0; border: none; border-top: 1px solid #d1d5db;" />`; break;
    case 'form_field': html = `<div style="margin-bottom: 1rem; display: flex; align-items: baseline; font-size: 0.95rem; color: #374151;"><span style="font-weight: 600; margin-right: 0.75rem; min-width: 140px; color: #111827;">${block.form_label || ''}:</span><span style="flex-grow: 1; border-bottom: 1px solid #6b7280; padding-bottom: 2px;">${block.form_value || ''}</span></div>`; break;
    case 'list':
      const listStyle = block.alignment === 'center' ? 'list-style-position: inside;' : '';
      html += `<ul style="margin: 1rem 0; padding-left: 2rem; color: #374151; line-height: 1.7; ${align} ${listStyle}">`;
      if (block.list_items && Array.isArray(block.list_items)) block.list_items.forEach((item: string) => { html += `<li style="margin-bottom: 0.5rem;">${item}</li>`; });
      html += `</ul>`;
      break;
    case 'table':
      if (block.table_data && Array.isArray(block.table_data)) {
        html += `<table style="width: 100%; border-collapse: collapse; margin: 1.5rem 0; font-size: 0.9rem; color: #374151;"><tbody>`;
        block.table_data.forEach((row: any, i: number) => {
          html += `<tr>`;
          if (Array.isArray(row)) row.forEach((cell: any) => {
            const tag = i === 0 ? 'th' : 'td';
            const style = i === 0 ? 'border: 1px solid #9ca3af; padding: 0.75rem; background-color: #f3f4f6; font-weight: 600; color: #111827; text-align: left;' : 'border: 1px solid #d1d5db; padding: 0.75rem; text-align: left;';
            html += `<${tag} style="${style}">${cell}</${tag}>`;
          });
          html += `</tr>`;
        });
        html += `</tbody></table>`;
      }
      break;
    default: html = `<p style="margin-bottom: 1rem; line-height: 1.6; color: #374151; ${align}">${content}</p>`;
  }
  return html;
}

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
        @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Caveat:wght@500;700&display=swap');
        body { font-family: 'Merriweather', serif; color: #111827; margin: 0; padding: 0; font-size: 11pt; }
      </style></head><body>${innerHtml}</body></html>
    `;

    // Initialize headless browser securely
    let executablePath = await chromium.executablePath();
    const isLocal = process.env.NODE_ENV === 'development';
    
    // Fallback for local testing where Sparticuz isn't available
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
    
    // Generate PDF in memory Buffer
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' } 
    });
    
    await browser.close();

    // Fix for Vercel 500 error: Instead of returning large raw buffer through Nitro which crashes Vercel,
    // upload securely to cloud storage and return the public URL.
    const pdfUrl = await uploadToCasita(Buffer.from(pdfBuffer), filename, 'application/pdf');
    
    return { success: true, url: pdfUrl };

  } catch (err: any) {
    console.error("Puppeteer Export Fatal Error:", err.message);
    throw createError({ statusCode: 500, statusMessage: err.message });
  }
});