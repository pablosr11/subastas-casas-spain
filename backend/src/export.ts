import { getDb } from './db';
import fs from 'fs';
import path from 'path';

async function exportJson() {
  const db = await getDb();
  // Export ALL auctions so they show in the sidebar, even if not geocoded
  const auctions = await db.all('SELECT * FROM auctions ORDER BY last_updated DESC LIMIT 1000');
  
  const publicDir = path.join(__dirname, '../../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir);
  
  const apiDir = path.join(publicDir, 'api');
  if (!fs.existsSync(apiDir)) fs.mkdirSync(apiDir);

  fs.writeFileSync(
    path.join(apiDir, 'auctions.json'),
    JSON.stringify(auctions, null, 2)
  );
  
  console.log(`Exported ${auctions.length} auctions to public/api/auctions.json`);
}

if (require.main === module) {
  exportJson();
}

export { exportJson };
