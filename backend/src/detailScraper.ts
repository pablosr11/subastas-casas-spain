import axios from 'axios';
import * as cheerio from 'cheerio';
import { getDb } from './db';

const BASE_URL = 'https://subastas.boe.es';

// Helper to parse currency strings "1.234,56 €" -> 1234.56
function parseMoney(str: string): number | null {
  if (!str) return null;
  const clean = str.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(clean) || null;
}

// Helper to extract text from a specific table row header
function getTableValue($: cheerio.CheerioAPI, headerText: string): string {
  let val = '';
  $('th').each((_, el) => {
    if ($(el).text().trim().includes(headerText)) {
      val = $(el).next('td').text().trim();
      return false; // break
    }
  });
  return val;
}

async function scrapeDetails() {
  const db = await getDb();
  
  // Find auctions that haven't been enriched yet (identifier is null)
  // Limit to 50 per run to avoid timeout/blocking, cron runs daily so it will catch up
  const auctions = await db.all('SELECT id, url FROM auctions WHERE identifier IS NULL LIMIT 100');
  
  console.log(`Found ${auctions.length} auctions pending detailed scrape.`);

  for (const auction of auctions) {
    try {
      console.log(`Enriching ${auction.id}...`);
      const updates: any = {};
      
      // 1. General Info (ver=1)
      // The URL in DB usually points to ver=1 by default or has no param
      // We force ver=1 to be sure
      const urlV1 = new URL(auction.url);
      urlV1.searchParams.set('ver', '1');
      
      const res1 = await axios.get(urlV1.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const $1 = cheerio.load(res1.data);
      
      updates.identifier = getTableValue($1, 'Identificador');
      updates.auction_type = getTableValue($1, 'Tipo de subasta');
      updates.claim_amount = parseMoney(getTableValue($1, 'Cantidad reclamada'));
      updates.appraisal_amount = parseMoney(getTableValue($1, 'Tasación'));
      updates.min_bid = parseMoney(getTableValue($1, 'Puja mínima'));
      updates.deposit_amount = parseMoney(getTableValue($1, 'Importe del depósito'));
      
      // 2. Assets Info (ver=3)
      const urlV3 = new URL(auction.url);
      urlV3.searchParams.set('ver', '3');
      
      const res3 = await axios.get(urlV3.toString(), {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const $3 = cheerio.load(res3.data);
      
      updates.catastral_ref = getTableValue($3, 'Referencia catastral');
      updates.full_address = getTableValue($3, 'Dirección');
      updates.postal_code = getTableValue($3, 'Código Postal');
      updates.visitable = getTableValue($3, 'Visitable');
      updates.possession_status = getTableValue($3, 'Situación posesoria');
      
      // Update DB
      await db.run(`
        UPDATE auctions SET
          identifier = ?,
          auction_type = ?,
          claim_amount = ?,
          appraisal_amount = ?,
          min_bid = ?,
          deposit_amount = ?,
          catastral_ref = ?,
          full_address = ?,
          postal_code = ?,
          visitable = ?,
          possession_status = ?
        WHERE id = ?
      `, [
        updates.identifier,
        updates.auction_type,
        updates.claim_amount,
        updates.appraisal_amount,
        updates.min_bid,
        updates.deposit_amount,
        updates.catastral_ref,
        updates.full_address,
        updates.postal_code,
        updates.visitable,
        updates.possession_status,
        auction.id
      ]);

      // Sleep 1s
      await new Promise(r => setTimeout(r, 1000));
      
    } catch (error: any) {
      console.error(`Failed to enrich ${auction.id}:`, error.message);
      // Optional: Mark as processed even if failed so we don't retry forever? 
      // For now, let's leave it null to retry next time.
    }
  }
}

if (require.main === module) {
  scrapeDetails();
}

export { scrapeDetails };
