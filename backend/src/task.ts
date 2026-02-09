import { scrapeBOE } from './scraper';
import { geocodeAuctions } from './geocoder';
import { exportJson } from './export';

async function main() {
  console.log('--- Starting Daily Task ---');
  await scrapeBOE();
  console.log('--- Starting Geocoding ---');
  await geocodeAuctions();
  console.log('--- Exporting JSON ---');
  await exportJson();
  console.log('--- All tasks completed ---');
  process.exit(0);
}

main().catch(err => {
  console.error('Task failed:', err);
  process.exit(1);
});
