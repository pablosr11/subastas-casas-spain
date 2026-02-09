import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Search, MapPin, ExternalLink, Filter, Building2, Gavel } from 'lucide-react';
import L from 'leaflet';

// Leaflet markers fix
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
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get('./api/auctions.json');
      setAuctions(response.data);
      
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
      setViewMode('map');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <header className="bg-blue-700 text-white shadow-md p-4 flex flex-col md:flex-row justify-between items-center gap-4 z-[1001]">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8" />
          <div>
            <h1 className="text-lg font-bold">Subastas España</h1>
            {lastUpdatedDate && <p className="text-[10px] text-blue-200">Act: {lastUpdatedDate}</p>}
          </div>
        </div>
        
        <div className="flex flex-1 max-w-2xl gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-white text-slate-900 focus:outline-none border-none shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="hidden sm:block px-4 py-2 rounded-lg bg-white text-slate-900 focus:outline-none border-none shadow-inner cursor-pointer"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
          >
            <option value="">Provincias</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex md:hidden w-full gap-2">
           <button onClick={() => setViewMode('list')} className={`flex-1 py-1 rounded ${viewMode === 'list' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>Lista</button>
           <button onClick={() => setViewMode('map')} className={`flex-1 py-1 rounded ${viewMode === 'map' ? 'bg-white text-blue-700' : 'bg-blue-600 text-white'}`}>Mapa</button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        <div className={`${viewMode === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-[400px] overflow-y-auto flex-col border-r bg-white shadow-xl z-20`}>
          <div className="p-3 bg-slate-100 border-b flex justify-between items-center text-sm">
            <span className="font-semibold text-slate-600">{filteredAuctions.length} Resultados</span>
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />}
          </div>
          
          <div className="flex-1">
            {filteredAuctions.map(auction => (
              <div key={auction.id} className="p-4 border-b hover:bg-blue-50 transition-colors cursor-pointer group" onClick={() => handleFocusAuction(auction)}>
                <div className="flex justify-between items-start mb-1">
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-[9px] font-bold uppercase text-slate-400 bg-slate-100 px-1 rounded">{auction.id}</span>
                    {auction.status === 'LIVE' && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1 rounded animate-pulse">LIVE</span>}
                  </div>
                  {auction.lat && <MapPin className="w-3 h-3 text-red-500" />}
                </div>
                <h3 className="font-bold text-sm text-slate-800 leading-tight mb-1 line-clamp-2">{auction.description || auction.title}</h3>
                <p className="text-[11px] text-slate-500 mb-2 capitalize">{auction.location_city?.toLowerCase()} ({auction.location_province})</p>
                <div className="flex items-center justify-between">
                  <span className="text-blue-700 font-bold">{auction.amount ? `${auction.amount.toLocaleString()} €` : 'Consultar'}</span>
                  <a href={auction.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-700 hover:text-white transition-all shadow-sm" onClick={(e) => e.stopPropagation()}>BOE</a>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`${viewMode === 'map' ? 'block' : 'hidden'} md:block flex-1 bg-slate-200 relative`}>
          <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <ChangeView center={mapCenter} zoom={mapZoom} />
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {filteredAuctions.filter(a => a.lat && a.lng).map(auction => (
              <Marker key={auction.id} position={[auction.lat!, auction.lng!]}>
                <Popup>
                  <div className="w-48 text-sm">
                    <h4 className="font-bold mb-1">{auction.title}</h4>
                    <p className="text-xs text-slate-600 mb-2 line-clamp-2">{auction.description}</p>
                    <div className="flex items-center justify-between border-t pt-1">
                       <span className="font-bold text-blue-700">{auction.amount ? `${auction.amount.toLocaleString()} €` : ''}</span>
                       <a href={auction.url} target="_blank" className="text-blue-500 font-bold" rel="noreferrer">BOE</a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </main>
    </div>
  );
}

export default App;
