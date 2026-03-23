import { getDb } from '../utils/db';

export default defineNitroPlugin(async () => {
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
      status VARCHAR(50) DEFAULT 'pending',
      label VARCHAR(100),
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
});