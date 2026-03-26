import { getDb } from '../../utils/db';
import { uploadToCasita } from '../../utils/casita';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  console.log(`[Server API] POST /pages/upload - Request received.`);
  
  try {
    const formData = await readMultipartFormData(event);
    if (!formData || formData.length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No file data received in payload.' });
    }

    const docIdField = formData.find(f => f.name === 'document_id');
    const pageNumField = formData.find(f => f.name === 'page_number');
    const sourceFileField = formData.find(f => f.name === 'source_filename');
    const fileField = formData.find(f => f.name === 'file');           // HD Main Image
    const fileThumbField = formData.find(f => f.name === 'file_thumb'); // Thumb

    if (!docIdField || !pageNumField || !fileField || !sourceFileField) {
      throw createError({ statusCode: 400, statusMessage: 'Missing required form fields.' });
    }

    const docId = docIdField.data.toString();
    const pageNum = parseInt(pageNumField.data.toString());
    const sourceFilename = sourceFileField.data.toString();
    
    const [imageUrl, thumbnailUrl] = await Promise.all([
      uploadToCasita(fileField.data, `page_${docId}_${pageNum}.jpg`, 'image/jpeg'),
      fileThumbField ? uploadToCasita(fileThumbField.data, `thumb_${docId}_${pageNum}.jpg`, 'image/jpeg') : Promise.resolve(null)
    ]);

    const db = getDb();
    const pageId = randomUUID();

    const [orderRes]: any = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pages WHERE document_id = ?`, [docId]);
    const nextOrder = orderRes[0].next_order;

    await db.query(
      `INSERT INTO pages (id, document_id, source_filename, page_number, sort_order, image_url, thumbnail_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`,
      [pageId, docId, sourceFilename, pageNum, nextOrder, imageUrl, thumbnailUrl || imageUrl]
    );

    return { id: pageId, image_url: imageUrl, thumbnail_url: thumbnailUrl, sort_order: nextOrder };
    
  } catch (err: any) {
    console.error(`[Server API ERROR] Exception in /pages/upload:`, err);
    if (err.statusCode) throw err;
    throw createError({ statusCode: 500, statusMessage: err.message || 'Internal Upload Error' });
  }
});