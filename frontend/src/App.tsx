import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Search, MapPin, ExternalLink, Filter, Building2, Gavel, List, Map as MapIcon, ArrowUpDown } from 'lucide-react';
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
  const [sortBy, setSortBy] = useState<'date' | 'price-asc' | 'price-desc'>('date');

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    try {
      const response = await axios.get('./api/auctions.json?v=' + Date.now());
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

  const filteredAndSortedAuctions = useMemo(() => {
    let result = auctions.filter(a => {
      const matchesSearch = 
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location_city?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProvince = !provinceFilter || a.location_province === provinceFilter;
      return matchesSearch && matchesProvince;
    });

    if (sortBy === 'price-asc') {
      result.sort((a, b) => (a.amount || 0) - (b.amount || 0));
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    } else {
      result.sort((a, b) => b.last_updated.localeCompare(a.last_updated));
    }

    return result;
  }, [auctions, searchTerm, provinceFilter, sortBy]);

  const handleFocusAuction = (a: Auction) => {
    if (a.lat && a.lng) {
      setMapCenter([a.lat, a.lng]);
      setMapZoom(14);
      setViewMode('map');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 font-sans text-slate-900 overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      <header className="bg-blue-700 text-white shadow-md p-3 flex flex-col md:flex-row justify-between items-center gap-3 z-[1001] shrink-0">
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            <div>
              <h1 className="text-base font-bold leading-tight">Subastas España</h1>
              <p className="text-[9px] text-blue-200">BUILD: 20260209-V6 | {lastUpdatedDate}</p>
            </div>
          </div>
          {/* Mobile view toggles in header top row */}
          <div className="flex md:hidden bg-blue-800 p-0.5 rounded-lg gap-0.5 border border-blue-600/50">
             <button 
              onClick={() => setViewMode('list')} 
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100'}`}
             >
               <List className="w-4 h-4" />
             </button>
             <button 
              onClick={() => setViewMode('map')} 
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100'}`}
             >
               <MapIcon className="w-4 h-4" />
             </button>
          </div>
        </div>
        
        <div className="flex flex-1 max-w-xl gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg bg-white text-slate-900 focus:outline-none border-none shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-1.5 text-sm rounded-lg bg-white text-slate-900 focus:outline-none border-none shadow-inner cursor-pointer"
            value={provinceFilter}
            onChange={(e) => setProvinceFilter(e.target.value)}
          >
            <option value="">Provincias</option>
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Desktop Toggles */}
        <div className="hidden md:flex bg-blue-800 p-1 rounded-lg gap-1 border border-blue-600/50">
           <button 
            onClick={() => setViewMode('list')} 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-blue-700'}`}
           >
             <List className="w-3.5 h-3.5" /> Lista
           </button>
           <button 
            onClick={() => setViewMode('map')} 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-blue-700 shadow-sm' : 'text-blue-100 hover:bg-blue-700'}`}
           >
             <MapIcon className="w-3.5 h-3.5" /> Mapa
           </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* Sidebar / List View */}
        <div className={`${viewMode === 'list' ? 'flex-1' : 'w-full md:w-[400px] hidden md:flex'} overflow-y-auto flex-col border-r bg-white shadow-xl z-20 shrink-0`}>
          <div className="p-3 bg-slate-50 border-b flex justify-between items-center text-xs sticky top-0 z-30 shadow-sm">
            <span className="font-bold text-slate-500 uppercase tracking-wider">{filteredAndSortedAuctions.length} Inmuebles</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-slate-400">
                <ArrowUpDown className="w-3 h-3" />
                <select 
                  className="bg-transparent border-none focus:outline-none font-semibold text-slate-600 cursor-pointer"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="date">Recientes</option>
                  <option value="price-asc">Precio Min</option>
                  <option value="price-desc">Precio Max</option>
                </select>
              </div>
              {loading && <div className="animate-spin rounded-full h-3 w-3 border-2 border-blue-500 border-t-transparent" />}
            </div>
          </div>
          
          <div className={`flex-1 ${viewMode === 'list' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0' : 'flex flex-col'}`}>
            {filteredAndSortedAuctions.map(auction => (
              <div 
                key={auction.id} 
                className={`p-4 border-b hover:bg-blue-50/50 transition-colors cursor-pointer group flex flex-col justify-between ${viewMode === 'list' ? 'border-r border-slate-100' : ''}`} 
                onClick={() => handleFocusAuction(auction)}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded leading-none">{auction.id}</span>
                      {auction.status === 'LIVE' && <span className="text-[9px] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded leading-none flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>LIVE</span>}
                    </div>
                    {auction.lat && <div className="p-1 rounded-full bg-red-50"><MapPin className="w-3 h-3 text-red-500" /></div>}
                  </div>
                  <h3 className={`font-bold text-slate-800 leading-snug mb-2 group-hover:text-blue-700 transition-colors ${viewMode === 'list' ? 'text-base' : 'text-sm line-clamp-2'}`}>
                    {auction.description || auction.title}
                  </h3>
                  <div className="space-y-1.5 mb-4">
                    <p className="text-[11px] font-semibold text-slate-500 capitalize flex items-center gap-1">
                      <MapPin className="w-3 h-3 opacity-50" /> {auction.location_city?.toLowerCase()} ({auction.location_province})
                    </p>
                    <p className="text-[10px] text-slate-400 italic flex items-center gap-1 truncate">
                      <Gavel className="w-3 h-3 opacity-50" /> {auction.court}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[9px] uppercase font-bold text-slate-400 leading-none mb-1">Valor Subasta</span>
                    <span className="text-blue-700 font-extrabold text-lg leading-none">
                      {auction.amount ? `${auction.amount.toLocaleString('es-ES')} €` : 'N/A'}
                    </span>
                  </div>
                  <a 
                    href={auction.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    BOE <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className={`${viewMode === 'map' ? 'block' : 'hidden'} flex-1 bg-slate-200 relative`}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: '100%', width: '100%' }} zoomControl={false}>
              <ChangeView center={mapCenter} zoom={mapZoom} />
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {filteredAndSortedAuctions.filter(a => a.lat && a.lng).map(auction => (
                <Marker key={auction.id} position={[auction.lat!, auction.lng!]}>
                  <Popup>
                    <div className="w-56 p-1">
                      <div className="flex items-center gap-1 mb-2">
                        <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-1 rounded">{auction.id}</span>
                        {auction.status === 'LIVE' && <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1 rounded">LIVE</span>}
                      </div>
                      <h4 className="font-bold text-sm mb-2 leading-tight text-slate-800">{auction.title}</h4>
                      <p className="text-[11px] text-slate-600 mb-3 line-clamp-2">{auction.description}</p>
                      <div className="flex items-center justify-between border-t pt-2 mt-2">
                         <span className="font-black text-blue-700">{auction.amount ? `${auction.amount.toLocaleString('es-ES')} €` : ''}</span>
                         <a href={auction.url} target="_blank" className="text-[10px] text-white bg-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-700 flex items-center gap-1" rel="noreferrer">
                          VER BOE <ExternalLink className="w-2.5 h-2.5" />
                         </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
          
          {/* Map Attribution Overlay (custom position) */}
          <div className="absolute bottom-4 right-4 z-[1000] bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] text-slate-500 shadow-sm border border-slate-200">
            &copy; OpenStreetMap contributors
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
