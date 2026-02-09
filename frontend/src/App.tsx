import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, MapPin, ExternalLink, Filter, Building2, Calendar, Euro, AlertCircle } from 'lucide-react';

interface Auction {
  id: string;
  title: string;
  description: string;
  court: string;
  url: string;
  location_city: string;
  location_province: string;
  amount: number | null;
  last_updated: string;
  status: string;
}

function App() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL'); // ALL, LIVE, UPCOMING
  const [sortBy, setSortBy] = useState('date'); // date, price-asc, price-desc

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await axios.get('./api/auctions.json?v=' + Date.now());
        setAuctions(res.data);
        
        // Find latest update date
        if (res.data.length > 0) {
          const maxDate = res.data.reduce((max: string, curr: Auction) => 
            (curr.last_updated > max ? curr.last_updated : max), '');
          setLastUpdated(new Date(maxDate).toLocaleDateString('es-ES', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
          }));
        }
      } catch (e) {
        console.error("Failed to load auctions", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Derived Data
  const provinces = useMemo(() => {
    const p = new Set(auctions.map(a => a.location_province).filter(Boolean));
    return Array.from(p).sort();
  }, [auctions]);

  const filteredAuctions = useMemo(() => {
    return auctions.filter(a => {
      // Text Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        a.title.toLowerCase().includes(searchLower) || 
        a.description.toLowerCase().includes(searchLower) ||
        a.location_city.toLowerCase().includes(searchLower);

      // Province
      const matchesProvince = !selectedProvince || 
                              (a.location_province && a.location_province === selectedProvince) || 
                              // Fallback for empty province if city contains it
                              (a.location_city && a.location_city.includes(selectedProvince));

      // Status
      // Map 'UPCOMING' or 'Próxima apertura'
      const isUpcoming = a.status === 'UPCOMING' || (a.status === 'Desconocido' && a.description.includes('Próxima'));
      const isLive = a.status === 'LIVE' || (a.status === 'Desconocido' && a.description.includes('Celebrándose'));

      const matchesStatus = selectedStatus === 'ALL' || 
        (selectedStatus === 'LIVE' && isLive) ||
        (selectedStatus === 'UPCOMING' && isUpcoming);

      return matchesSearch && matchesProvince && matchesStatus;
    }).sort((a, b) => {
      // Helper to get price safely
      const getPrice = (item: Auction) => item.amount || 0;
      
      if (sortBy === 'price-asc') {
        const pA = getPrice(a);
        const pB = getPrice(b);
        // Put zero prices at the end
        if (pA === 0) return 1;
        if (pB === 0) return -1;
        return pA - pB;
      } 
      if (sortBy === 'price-desc') {
        return getPrice(b) - getPrice(a);
      }
      // Default: Date desc
      return (b.last_updated || '').localeCompare(a.last_updated || '');
    });
  }, [auctions, searchTerm, selectedProvince, selectedStatus, sortBy]);

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none">Subastas España</h1>
                <p className="text-xs text-slate-500 mt-0.5">Actualizado: {lastUpdated}</p>
              </div>
            </div>
            <div className="text-sm font-medium text-slate-600">
              {filteredAuctions.length} Inmuebles
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Filters Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar por ciudad, calle, descripción..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Province */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select 
                className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                value={selectedProvince}
                onChange={e => setSelectedProvince(e.target.value)}
              >
                <option value="">Todas las provincias</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Sort */}
            <select 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
            >
              <option value="date">Más recientes</option>
              <option value="price-asc">Precio: Menor a Mayor</option>
              <option value="price-desc">Precio: Mayor a Menor</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-2 mt-4 border-t border-gray-100 pt-4">
            {['ALL', 'LIVE', 'UPCOMING'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  selectedStatus === status 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL' ? 'Todos' : status === 'LIVE' ? 'En Vivo' : 'Próximas'}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAuctions.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No se encontraron resultados</h3>
            <p className="text-gray-500">Prueba a ajustar los filtros de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map(auction => (
              <article key={auction.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 flex-1">
                  
                  {/* Tags Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2">
                      {auction.status === 'LIVE' ? (
                        <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> En Vivo
                        </span>
                      ) : (
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wide">
                          Próxima
                        </span>
                      )}
                      <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-2 py-1 rounded uppercase">
                        {auction.id.split('-').slice(1, 3).join('-')}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-snug">
                    {auction.title}
                  </h2>
                  
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                    {auction.description}
                  </p>

                  {/* Meta Info */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="capitalize">
                        {auction.location_city?.toLowerCase() || 'Ubicación desconocida'} 
                        {auction.location_province && `, ${auction.location_province}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-slate-500">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{auction.court}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="bg-gray-50 px-5 py-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Valor Subasta</p>
                    <div className="flex items-center gap-1 text-slate-900 font-extrabold text-xl">
                      {auction.amount ? (
                        <>
                          {auction.amount.toLocaleString('es-ES')} <Euro className="h-4 w-4" />
                        </>
                      ) : (
                        <span className="text-gray-400 text-base">---</span>
                      )}
                    </div>
                  </div>
                  
                  <a 
                    href={auction.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-white border border-gray-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                  >
                    Ver BOE <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
