import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Search, MapPin, ExternalLink, Filter, Building2, Gavel } from 'lucide-react';
import L from 'leaflet';

// Fix Leaflet icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

interface Auction {
  id: string;
  title: string;
  description: string;
  court: string;
  url: string;
  location_city: string;
  location_province: string;
  lat: number | null;
  lng: number | null;
  amount: number | null;
  last_updated: string;
  status: string;
}

// Map helper to handle flyTo
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function App() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [provinceFilter, setProvinceFilter] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.416775, -3.703790]);
  const [mapZoom, setMapZoom] = useState(6);

  const [lastUpdatedDate, setLastUpdatedDate] = useState<string>('');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get('./api/auctions.json');
      setAuctions(response.data);
      
      // Get the most recent update timestamp from the data
      if (response.data.length > 0) {
        const latest = response.data.reduce((max: string, a: Auction) => 
          (a.last_updated && a.last_updated > max) ? a.last_updated : max, 
          '0'
        );
        if (latest !== '0') {
          setLastUpdatedDate(new Date(latest).toLocaleString('es-ES'));
        }
      }
    } catch (error) {
      console.error('Error fetching auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  const provinces = useMemo(() => {
    const set = new Set(auctions.map(a => a.location_province).filter(Boolean));
    return Array.from(set).sort();
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      const matchesSearch = 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location_city?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProvince = !provinceFilter || a.location_province === provinceFilter;
      
      return matchesSearch && matchesProvince;
    });
  }, [auctions, searchTerm, provinceFilter]);

  const handleFocusAuction = (a: Auction) => {
    if (a.lat && a.lng) {
      setMapCenter([a.lat, a.lng]);
      setMapZoom(14);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <header className="bg-blue-700 text-white shadow-md p-4 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">Subastas Inmuebles España</h1>
            {lastUpdatedDate && (
              <p className="text-[10px] text-blue-200">Última actualización: {lastUpdatedDate}</p>
            )}
          </div>
        </div>
        
        <div className="flex flex-1 max-w-2xl gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por calle, ciudad, referencia..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 border-none shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative w-48">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <select
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none border-none shadow-inner cursor-pointer"
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
            >
              <option value="">Todas las provincias</option>
              {provinces.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <div className="w-full md:w-[450px] overflow-y-auto flex flex-col border-r bg-white shadow-xl z-20">
          <div className="p-4 bg-slate-100 border-b flex justify-between items-center">
            <span className="font-semibold text-slate-600">{filteredAuctions.length} Resultados</span>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />}
          </div>
          
          <div className="flex-1">
            {filteredAuctions.map(auction => (
              <div 
                key={auction.id} 
                className="p-5 border-b hover:bg-blue-50 transition-colors cursor-pointer group"
                onClick={() => handleFocusAuction(auction)}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-0.5 rounded bg-slate-100 mb-2 block w-fit">
                      {auction.id}
                    </span>
                    {auction.status === 'LIVE' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-600 px-2 py-0.5 rounded bg-green-100 mb-2 block w-fit animate-pulse">
                        ● En Vivo
                      </span>
                    )}
                    {auction.status === 'UPCOMING' && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 px-2 py-0.5 rounded bg-blue-100 mb-2 block w-fit">
                        Próximamente
                      </span>
                    )}
                  </div>
                  {auction.lat && (
                    <MapPin className="w-4 h-4 text-red-500" />
                  )}
                </div>
                
                <h3 className="font-bold text-slate-800 leading-tight group-hover:text-blue-700 transition-colors mb-2">
                  {auction.description || auction.title}
                </h3>

                <div className="space-y-1 mb-3">
                   <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <MapPin className="w-3 h-3" />
                    <span className="capitalize">{auction.location_city?.toLowerCase()} ({auction.location_province})</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 italic">
                    <Gavel className="w-3 h-3" />
                    <span>{auction.court}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-blue-700 font-bold text-lg">
                    {auction.amount ? `${auction.amount.toLocaleString()} €` : 'Ver importe'}
                  </div>
                  <a 
                    href={auction.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-700 hover:text-white transition-all shadow-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span>Detalles BOE</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
            
            {filteredAuctions.length === 0 && !loading && (
              <div className="p-20 text-center text-slate-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron subastas con esos filtros.</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 bg-slate-200 relative">
          <div className="absolute inset-0">
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {filteredAuctions.filter(a => a.lat && a.lng).map(auction => (
                <Marker 
                  key={auction.id} 
                  position={[auction.lat!, auction.lng!]}
                >
                  <Popup>
                    <div className="w-64 p-1">
                      <h4 className="font-bold text-slate-900 mb-2 leading-tight">{auction.title}</h4>
                      <p className="text-xs text-slate-600 mb-3 line-clamp-3">{auction.description}</p>
                      <div className="flex items-center justify-between border-t pt-2">
                         <span className="font-bold text-blue-700">{auction.amount ? `${auction.amount.toLocaleString()} €` : ''}</span>
                         <a href={auction.url} target="_blank" className="text-xs text-blue-500 font-bold hover:underline flex items-center gap-1" rel="noreferrer">
                          IR AL BOE <ExternalLink className="w-3 h-3" />
                         </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {/* Map Attribution Overlay (custom position) */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/80 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-500 shadow-sm border">
            &copy; OpenStreetMap contributors
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
