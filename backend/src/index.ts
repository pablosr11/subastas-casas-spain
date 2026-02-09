import express from 'express';
import cors from 'cors';
import { getDb } from './db';
import { scrapeBOE } from './scraper';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/auctions', async (req, res) => {
  const db = await getDb();
  const auctions = await db.all('SELECT * FROM auctions ORDER BY last_updated DESC');
  res.json(auctions);
});

app.post('/api/scrape', async (req, res) => {
  try {
    await scrapeBOE();
    res.json({ message: 'Scraping triggered successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', async (req, res) => {
  const db = await getDb();
  const count = await db.get('SELECT COUNT(*) as total FROM auctions');
  const lastLog = await db.get('SELECT * FROM scraper_logs ORDER BY timestamp DESC LIMIT 1');
  res.json({ count: count.total, lastLog });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
