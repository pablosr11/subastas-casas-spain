import axios from 'axios';
import { getDb } from './db';

async function geocodeAuctions() {
  const db = await getDb();
  // Try to geocode anything that doesn't have lat/lng yet
  const auctions = await db.all('SELECT id, title, description, location_city, location_province FROM auctions WHERE lat IS NULL');

  console.log(`Found ${auctions.length} auctions to geocode.`);

  for (const auction of auctions) {
    try {
      let query = '';
      if (auction.location_city && auction.location_province) {
        // Clean the city name: remove common garbage prefixes
        let cleanCity = auction.location_city
            .replace(/^[0-9,%]+\s+PLENO\s+DOMINIO\s+DE\s+/i, '')
            .replace(/^[0-9,%]+\s+PLENO\s+DOMINIO\s+/i, '')
            .replace(/^[0-9,%]+\s+NUDA\s+PROPIEDAD\s+DE\s+/i, '')
            .replace(/^[0-9,%]+\s+NUDA\s+PROPIEDAD\s+/i, '')
            .replace(/^VIVIENDA\s+EN\s+/i, '')
            .replace(/^NAVE\s+INDUSTRIAL\s+EN\s+/i, '')
            .replace(/^LOCAL\s+COMERCIAL\s+EN\s+/i, '')
            .trim();
        query = `${cleanCity}, ${auction.location_province}, Spain`;
      }

      if (!query || query.length < 5) {
          console.log(`Skipping ${auction.id}: Query too short or empty ("${query}")`);
          continue;
      }

      console.log(`Geocoding: ${query}`);
      
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          countrycodes: 'es'
        },
        headers: {
          'User-Agent': 'SubastasEspanaPiAgent/1.0'
        }
      });

      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        await db.run(
          'UPDATE auctions SET lat = ?, lng = ? WHERE id = ?',
          [parseFloat(lat), parseFloat(lon), auction.id]
        );
        console.log(`Success: ${lat}, ${lon}`);
      } else {
        console.log('No results found.');
      }

      await new Promise(resolve => setTimeout(resolve, 1100));
    } catch (error: any) {
      console.error(`Error geocoding ${auction.id}:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

if (require.main === module) {
  geocodeAuctions();
}

export { geocodeAuctions };
