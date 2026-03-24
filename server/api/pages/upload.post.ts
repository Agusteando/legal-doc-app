import { getDb } from '../../utils/db';
import { uploadToCasita } from '../../utils/casita';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  console.log(`[Server API] POST /pages/upload - Request received.`);
  
  try {
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      console.error(`[Server API ERROR] Multipart payload is empty or undefined.`);
      throw createError({ statusCode: 400, statusMessage: 'No file data received in payload.' });
    }

    const docIdField = formData.find(f => f.name === 'document_id');
    const pageNumField = formData.find(f => f.name === 'page_number');
    const fileField = formData.find(f => f.name === 'file');
    const sourceFileField = formData.find(f => f.name === 'source_filename');

    if (!docIdField || !pageNumField || !fileField || !sourceFileField) {
      console.error(`[Server API ERROR] Missing fields. docId=${!!docIdField}, pageNum=${!!pageNumField}, file=${!!fileField}, sourceFile=${!!sourceFileField}`);
      throw createError({ statusCode: 400, statusMessage: 'Missing required form fields.' });
    }

    const docId = docIdField.data.toString();
    const pageNum = parseInt(pageNumField.data.toString());
    const sourceFilename = sourceFileField.data.toString();
    
    console.log(`[Server API] Processing page ${pageNum} for doc ${docId}. Delegating to Casita...`);
    const imageUrl = await uploadToCasita(fileField.data, `page_${docId}_${pageNum}.png`, 'image/png');

    const db = getDb();
    const pageId = randomUUID();

    console.log(`[Server API] Querying MAX sort_order for doc ${docId}...`);
    const [orderRes]: any = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pages WHERE document_id = ?`, [docId]);
    const nextOrder = orderRes[0].next_order;

    console.log(`[Server API] Inserting DB record for page ${pageId} at order ${nextOrder}...`);
    await db.query(
      `INSERT INTO pages (id, document_id, source_filename, page_number, sort_order, image_url, status) VALUES (?, ?, ?, ?, ?, ?, 'pending_review')`,
      [pageId, docId, sourceFilename, pageNum, nextOrder, imageUrl]
    );

    console.log(`[Server API] Page insert successful.`);
    return { id: pageId, image_url: imageUrl, sort_order: nextOrder };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/upload:`, err);
    // Preserve existing statusCode if it's a known error, otherwise wrap in 500
    if (err.statusCode) throw err;
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Upload Error' });
  }
});