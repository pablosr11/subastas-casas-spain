import axios from 'axios';
import * as cheerio from 'cheerio';
import { getDb } from './db';

const SEARCH_URL = 'https://subastas.boe.es/subastas_ava.php';

async function scrapeBOE() {
  const db = await getDb();
  console.log('Starting BOE scraping with detailed extraction...');

  try {
    const params = new URLSearchParams();
    params.append('campo[2]', 'SUBASTA.ESTADO.CODIGO');
    params.append('dato[2]', 'EJ');
    params.append('campo[3]', 'BIEN.TIPO');
    params.append('dato[3]', 'I');
    params.append('campo[8]', 'BIEN.COD_PROVINCIA');
    params.append('dato[8]', ''); 
    params.append('page_hits', '500'); 
    params.append('accion', 'Buscar');

    const response = await axios.post(SEARCH_URL, params.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const $ = cheerio.load(response.data);
    const items: any[] = [];

    $('.resultado-busqueda').each((i, el) => {
      const $el = $(el);
      const title = $el.find('h3').text().trim();
      const court = $el.find('h4').text().trim();
      const statusLine = $el.find('p').first().text().trim();
      const detailLine = $el.find('p').eq(1).text().trim();
      const link = $el.find('a').first().attr('href');
      
      if (link) {
        const fullUrl = new URL(link, 'https://subastas.boe.es').href;
        const id = new URL(fullUrl).searchParams.get('idSub') || new URL(fullUrl).searchParams.get('id');
        
        if (id) {
          // Extract status
          let status = 'Desconocido';
          if (statusLine.includes('Celebrándose')) status = 'LIVE';
          else if (statusLine.includes('Próxima apertura')) status = 'UPCOMING';
          else if (statusLine.includes('Concluida') || statusLine.includes('Cancelada') || statusLine.includes('Suspendida')) status = 'CLOSED';

          // Extract province/city from detailLine or court
          let city = '';
          let province = '';
          
          const geoMatch = detailLine.match(/([A-ZÁÉÍÓÚÑ'\s\-]+)\s+\(([A-ZÁÉÍÓÚÑ\s\-]+)\)$/i);
          if (geoMatch) {
            city = geoMatch[1].trim();
            province = geoMatch[2].trim();
          }

          items.push({
            id,
            title,
            court,
            status,
            statusLine,
            detailLine,
            url: fullUrl,
            city,
            province
          });
        }
      }
    });

    console.log(`Found ${items.length} auctions. Updating database...`);

    for (const item of items) {
      await db.run(
        `INSERT INTO auctions (id, title, court, status, description, url, source, location_city, location_province, last_updated) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
         title=excluded.title,
         court=excluded.court,
         status=excluded.status,
         description=excluded.description,
         location_city=excluded.location_city,
         location_province=excluded.location_province,
         last_updated=CURRENT_TIMESTAMP`,
        [item.id, item.title, item.court, item.status, item.detailLine, item.url, 'BOE', item.city, item.province]
      );
    }

    await db.run('INSERT INTO scraper_logs (message, status) VALUES (?, ?)', [
      `Scraped ${items.length} items from BOE`,
      'SUCCESS'
    ]);
  } catch (error: any) {
    console.error('Error scraping BOE:', error.message);
  }
}

if (require.main === module) {
  scrapeBOE();
}

export { scrapeBOE };
