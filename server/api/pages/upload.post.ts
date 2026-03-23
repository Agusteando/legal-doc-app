import { getDb } from '../../utils/db';
import { uploadToCasita } from '../../utils/casita';
import { randomUUID } from 'crypto';

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'No file data' });

  const docIdField = formData.find(f => f.name === 'document_id');
  const pageNumField = formData.find(f => f.name === 'page_number');
  const fileField = formData.find(f => f.name === 'file');
  const sourceFileField = formData.find(f => f.name === 'source_filename');

  if (!docIdField || !pageNumField || !fileField || !sourceFileField) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required form fields' });
  }

  const docId = docIdField.data.toString();
  const pageNum = parseInt(pageNumField.data.toString());
  const sourceFilename = sourceFileField.data.toString();
  
  const imageUrl = await uploadToCasita(fileField.data, `page_${docId}_${pageNum}.png`, 'image/png');

  const db = getDb();
  const pageId = randomUUID();

  const [orderRes]: any = await db.query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pages WHERE document_id = ?`, [docId]);
  const nextOrder = orderRes[0].next_order;

  await db.query(
    `INSERT INTO pages (id, document_id, source_filename, page_number, sort_order, image_url, status) VALUES (?, ?, ?, ?, ?, ?, 'pending_review')`,
    [pageId, docId, sourceFilename, pageNum, nextOrder, imageUrl]
  );

  return { id: pageId, image_url: imageUrl, sort_order: nextOrder };
});