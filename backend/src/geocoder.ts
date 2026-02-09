import axios from 'axios';
import { getDb } from './db';

async function geocodeAuctions() {
  const db = await getDb();
  // Try to geocode anything that doesn't have lat/lng yet
  const auctions = await db.all('SELECT id, title, description, location_city, location_province FROM auctions WHERE lat IS NULL');

  console.log(`Found ${auctions.length} auctions to geocode.`);

  for (const auction of auctions) {
    try {
      // Create a better query string
      // Try city + province first
      let query = '';
      if (auction.location_city && auction.location_province) {
        query = `${auction.location_city}, ${auction.location_province}, Spain`;
      } else {
        // Fallback: try to find something in description
        const match = auction.description.match(/([A-Z\s]+),\s+([A-Z\s]+)\s*$/i);
        if (match) {
          query = `${match[1]}, ${match[2]}, Spain`;
        }
      }

      if (!query || query.length < 10) {
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
        // Mark as attempted by setting a dummy value or just leaving it for next run?
        // To avoid infinite retries on bad addresses, we could set lat=0.0001
      }

      // Respect Nominatim usage policy (1 request per second)
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
