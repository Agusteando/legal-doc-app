import { getDb } from '../utils/db';

export default defineNitroPlugin(async () => {
  try {
    const db = getDb();
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(36) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'open',
        merged_json LONGTEXT,
        rendered_html LONGTEXT,
        manual_html_override LONGTEXT,
        approval_1_name VARCHAR(100),
        approval_1_status VARCHAR(50),
        approval_1_notes TEXT,
        approval_2_name VARCHAR(100),
        approval_2_status VARCHAR(50),
        approval_2_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id VARCHAR(36) PRIMARY KEY,
        document_id VARCHAR(36) NOT NULL,
        source_filename VARCHAR(255) NOT NULL,
        page_number INT NOT NULL,
        sort_order INT NOT NULL,
        image_url TEXT NOT NULL,
        thumbnail_url TEXT,
        status VARCHAR(50) DEFAULT 'pending_review',
        label VARCHAR(100),
        notes TEXT,
        rotation INT DEFAULT 0,
        is_excluded BOOLEAN DEFAULT FALSE,
        is_deleted BOOLEAN DEFAULT FALSE,
        source_text LONGTEXT,
        translated_text LONGTEXT,
        extracted_json LONGTEXT,
        job_status VARCHAR(50) DEFAULT 'idle',
        job_duration_sec INT DEFAULT 0,
        job_error TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      )
    `);

    // Safe schema migrations for live environments
    try { await db.query(`ALTER TABLE pages ADD COLUMN is_manual_translation BOOLEAN DEFAULT FALSE`); } catch (e) {}
    try { await db.query(`ALTER TABLE pages ADD COLUMN is_stale BOOLEAN DEFAULT FALSE`); } catch (e) {}
    try { await db.query(`ALTER TABLE pages ADD COLUMN notes TEXT`); } catch (e) {}
    try { await db.query(`ALTER TABLE pages ADD COLUMN manual_html_override LONGTEXT`); } catch (e) {}
    try { await db.query(`UPDATE pages SET status = 'pending_review' WHERE status = 'pending'`); } catch (e) {}

    console.log("Database tables initialized successfully.");
  } catch (error: any) {
    console.error("Database Initialization Skipped/Failed:", error.message);
  }
});