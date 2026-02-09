import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: path.join(__dirname, '../../database.sqlite'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS auctions (
      id TEXT PRIMARY KEY,
      title TEXT,
      description TEXT,
      type TEXT,
      status TEXT,
      start_date TEXT,
      end_date TEXT,
      amount REAL,
      location_address TEXT,
      location_city TEXT,
      location_province TEXT,
      lat REAL,
      lng REAL,
      url TEXT,
      source TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      court TEXT,
      
      -- New detailed fields
      identifier TEXT,
      auction_type TEXT,
      claim_amount REAL,
      appraisal_amount REAL,
      min_bid REAL,
      deposit_amount REAL,
      catastral_ref TEXT,
      full_address TEXT,
      postal_code TEXT,
      visitable TEXT,
      possession_status TEXT,
      has_images BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS scraper_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      message TEXT,
      status TEXT
    );
  `);

  return db;
}
