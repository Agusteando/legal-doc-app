import { getDb } from '../../utils/db';

export default defineEventHandler(async (event) => {
  const db = getDb();

  try {
    // 1. Gather global diagnostic counts from the DB
    const [docCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM documents`);
    const [pageCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM pages`);
    const [deletedPageCountRes]: any = await db.query(`SELECT COUNT(*) as c FROM pages WHERE is_deleted = TRUE`);
    
    // 2. Deep diagnostic: Where do the pages actually live?
    const [allPagesDebug]: any = await db.query(`SELECT id, document_id, is_deleted FROM pages`);

    const stats = {
      totalDocuments: docCountRes[0].c,
      totalPages: pageCountRes[0].c,
      deletedPages: deletedPageCountRes[0].c,
      allPagesRaw: allPagesDebug
    };

    // 3. Fetch all docs with their active page counts to find the TRUE active project
    const [docs]: any = await db.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM pages p WHERE p.document_id = d.id AND p.is_deleted = FALSE) as active_page_count
      FROM documents d
      ORDER BY d.created_at DESC
    `);
    
    if (!docs || docs.length === 0) {
      return { document: null, pages: [], stats, candidateDocs: [] };
    }

    // REGRESSION FIX: Bypass orphaned empty documents created by failed uploads.
    // Find the newest document that actually has active pages. 
    // If absolutely no documents have pages, fall back to the newest one.
    let activeDoc = docs.find((d: any) => d.active_page_count > 0);
    let selectionReason = `Selected newest document [${activeDoc?.id}] because it has ${activeDoc?.active_page_count} active pages.`;
    
    if (!activeDoc) {
      activeDoc = docs[0];
      selectionReason = `No documents have active pages. Falling back to absolute newest empty document [${activeDoc.id}].`;
    }

    // 4. Fetch pages for the successfully identified active document
    const [pages]: any = await db.query(`
      SELECT * FROM pages 
      WHERE document_id = ? AND is_deleted = FALSE
      ORDER BY sort_order ASC
    `, [activeDoc.id]);
    
    return { 
      document: activeDoc, 
      pages: pages || [], 
      stats, 
      candidateDocs: docs.map((d: any) => ({ id: d.id, active_page_count: d.active_page_count })),
      selectionReason
    };
  } catch (err: any) {
    throw createError({ statusCode: 500, statusMessage: `DB Fetch Error: ${err.message}` });
  }
});