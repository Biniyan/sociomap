import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { 
  Mountain, 
  Waves, 
  Droplets, 
  Sprout, 
  Building2, 
  Info, 
  Search, 
  Layers,
  Map as MapIcon,
  ChevronRight,
  ChevronDown,
  X,
  TreePine,
  Church,
  Store,
  MessageSquare,
  Send,
  Loader2,
  Route,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { NEPAL_DATA, GeographicFeature, ProvinceData, HIGHWAYS } from './data';
import { cn } from './lib/utils';

// Fix for default marker icons in Leaflet
const DEFAULT_ICON = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DEFAULT_ICON;

const CATEGORY_ICONS = {
  mountains: { icon: Mountain, color: '#6d4c41', label: 'हिमाल', bg: 'bg-[#6d4c41]' },
  rivers: { icon: Waves, color: '#1976d2', label: 'नदी', bg: 'bg-[#1976d2]' },
  lakes: { icon: Droplets, color: '#00acc1', label: 'ताल', bg: 'bg-[#00acc1]' },
  production: { icon: Sprout, color: '#2e7d32', label: 'उत्पादन क्षेत्र', bg: 'bg-[#2e7d32]' },
  protectedAreas: { icon: TreePine, color: '#1b5e20', label: 'संरक्षित क्षेत्र', bg: 'bg-[#1b5e20]' },
  religiousSites: { icon: Church, color: '#f57c00', label: 'धार्मिक स्थल', bg: 'bg-[#f57c00]' },
  tradeCenters: { icon: Store, color: '#455a64', label: 'व्यापारिक केन्द्र', bg: 'bg-[#455a64]' },
  nationalPrideProjects: { icon: Star, color: '#fbc02d', label: 'राष्ट्रिय गौरव', bg: 'bg-[#fbc02d]' },
  highways: { icon: Route, color: '#212121', label: 'राजमार्ग', bg: 'bg-[#212121]' },
  capitals: { icon: Building2, color: '#c62828', label: 'राजधानी', bg: 'bg-[#c62828]' },
};

const getIconPath = (type: keyof typeof CATEGORY_ICONS) => {
  switch (type) {
    case 'mountains': return "m8 3 4 8 5-5 5 15H2L8 3z";
    case 'rivers': return "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1";
    case 'lakes': return "M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z";
    case 'production': return "M7 20h10M10 20V8a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v12M12 14v6M12 10V6M12 6V3";
    case 'protectedAreas': return "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z";
    case 'religiousSites': return "M12 22v-9m0 0l-5-5m5 5l5-5M7 8l5-5 5 5";
    case 'tradeCenters': return "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
    case 'nationalPrideProjects': return "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
    case 'capitals': return "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4";
    default: return "";
  }
};

type Category = keyof typeof CATEGORY_ICONS;

function MapUpdater({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function App() {
  const [activeCategories, setActiveCategories] = useState<Set<Category>>(new Set(['mountains', 'capitals', 'protectedAreas', 'highways']));
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showIntro, setShowIntro] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Gemini Assistant State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;
    
    const userMsg = userInput;
    setUserInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [
          {
            role: 'user',
            parts: [{ text: `तपाईं नेपालको कक्षा १० का विद्यार्थीहरूका लागि एक सहयोगी भूगोल सहायक हुनुहुन्छ।
              नेपालको भूगोल, प्रदेश, हिमाल, नदी र राष्ट्रिय निकुञ्जका बारेमा सोधिएका प्रश्नहरूको उत्तर दिनुहोस्।
              उत्तरहरू संक्षिप्त, शैक्षिक र नेपाली भाषामा हुनुपर्छ।
              प्रयोगकर्ताले सोध्छन्: ${userMsg}` }]
          }
        ],
        config: {
          systemInstruction: "तपाईं नेपालको भूगोलका विशेषज्ञ हुनुहुन्छ। १५ वर्षका विद्यार्थीहरूका लागि उपयुक्त सरल नेपाली भाषा प्रयोग गर्नुहोस्।"
        }
      });
      
      const assistantText = response.text || "माफ गर्नुहोस्, मैले त्यो अनुरोध प्रशोधन गर्न सकिन।";
      setChatMessages(prev => [...prev, { role: 'assistant', text: assistantText }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setChatMessages(prev => [...prev, { role: 'assistant', text: "माफ गर्नुहोस्, मलाई अहिले केही समस्या भइरहेको छ। कृपया पछि फेरि प्रयास गर्नुहोस्।" }]);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleCategory = (cat: Category) => {
    const next = new Set(activeCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setActiveCategories(next);
  };

  const filteredData = useMemo(() => {
    const result: { type: Category; data: GeographicFeature }[] = [];
    
    Object.values(NEPAL_DATA).forEach((province) => {
      if (selectedProvince && province.name !== selectedProvince) return;

      if (activeCategories.has('mountains')) {
        province.mountains.forEach(m => result.push({ type: 'mountains', data: m }));
      }
      if (activeCategories.has('rivers')) {
        province.rivers.forEach(r => result.push({ type: 'rivers', data: r }));
      }
      if (activeCategories.has('lakes')) {
        province.lakes.forEach(l => result.push({ type: 'lakes', data: l }));
      }
      if (activeCategories.has('production')) {
        province.production.forEach(p => result.push({ type: 'production', data: p }));
      }
      if (activeCategories.has('protectedAreas')) {
        province.protectedAreas?.forEach(p => result.push({ type: 'protectedAreas', data: p }));
      }
      if (activeCategories.has('religiousSites')) {
        province.religiousSites?.forEach(p => result.push({ type: 'religiousSites', data: p }));
      }
      if (activeCategories.has('tradeCenters')) {
        province.tradeCenters?.forEach(p => result.push({ type: 'tradeCenters', data: p }));
      }
      if (activeCategories.has('nationalPrideProjects')) {
        province.nationalPrideProjects?.forEach(p => result.push({ type: 'nationalPrideProjects', data: p }));
      }
      if (activeCategories.has('capitals')) {
        result.push({ type: 'capitals', data: province.capital });
      }
    });

    if (searchQuery) {
      return result.filter(item => 
        item.data.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.data.province.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return result;
  }, [activeCategories, selectedProvince, searchQuery]);

  const mapCenter: [number, number] = [28.3949, 84.1240];
  const mapZoom = 7;

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Intro Modal */}
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center"
            >
              <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg">
                <MapIcon size={32} />
              </div>
              <h2 className="text-2xl font-bold mb-4">नमस्ते विद्यार्थी साथीहरू!</h2>
              <p className="text-slate-600 mb-4 leading-relaxed text-sm">
                यो नेपालको डिजिटल नक्सा हो, जसले तपाईंलाई कक्षा १० को सामाजिक अध्ययनमा मद्दत गर्नेछ।
              </p>
              <div className="bg-blue-50 p-5 rounded-2xl mb-8 text-left border border-blue-100">
                <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                  <Info size={16} /> नक्सा सम्झने सजिलो तरिका:
                </h3>
                <ul className="text-xs text-blue-700 space-y-3 list-none">
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">चुचुरो (Peak):</span> 
                    <span>नक्साको सबैभन्दा माथिल्लो चुचुरोमा <b>अपि हिमाल</b> छ।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">पहिलो मोड:</span> 
                    <span>पश्चिमबाट पहिलो खाल्डो (Dip) मा <b>कुबेर पर्वत</b> छ।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">दोस्रो मोड:</span> 
                    <span>दोस्रो खाल्डो (Dip) मा <b>कान्जिरोवा हिमाल</b> छ।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">पूर्वी सीमा:</span> 
                    <span>नक्साको सबैभन्दा पूर्वमा <b>मेची नदी</b> र <b>कञ्चनजङ्घा</b> छन्।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">महेन्द्र राज:</span> 
                    <span>नेपालको तल्लो भाग (तराई) बाट पूर्व-पश्चिम जाने सबैभन्दा लामो रेखा।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">त्रिभुवन राज:</span> 
                    <span>वीरगञ्ज (दक्षिण) बाट काठमाडौँ जोड्ने नेपालको पहिलो बाटो।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">पृथ्वी राज:</span> 
                    <span>काठमाडौँबाट पर्यटकीय सहर पोखरा जाने प्रमुख बाटो।</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-blue-900 min-w-[80px]">पुष्पलाल राज:</span> 
                    <span>पहाडी भेगको बीचबाट पूर्व-पश्चिम जाने मध्य-पहाडी बाटो।</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setShowIntro(false)}
                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-md active:scale-95"
              >
                सुरु गरौं
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-600"
          >
            <Layers size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 md:p-2 rounded-lg text-white">
              <MapIcon size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight leading-none mb-1">नेपाल शैक्षिक GIS</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider hidden sm:block">कक्षा १० सामाजिक अध्ययन स्रोत</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="खोज्नुहोस्..." 
              className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('map')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'map' ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900"
              )}
            >
              नक्सा दृश्य
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                viewMode === 'list' ? "bg-white shadow-sm text-blue-600" : "text-slate-600 hover:text-slate-900"
              )}
            >
              सूची दृश्य
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar / Controls */}
        <aside className={cn(
          "fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 z-[1500] transition-transform duration-300 lg:relative lg:translate-x-0 lg:z-40",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex items-center justify-between mb-6 lg:hidden">
            <h2 className="font-bold text-lg">फिल्टरहरू</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Layers size={14} /> तहहरू
            </h2>
            <div className="space-y-2">
              {(Object.keys(CATEGORY_ICONS) as Category[]).map((key) => {
                const { icon: Icon, label, color, bg } = CATEGORY_ICONS[key];
                const isActive = activeCategories.has(key);
                return (
                  <button
                    key={key}
                    onClick={() => toggleCategory(key)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border transition-all duration-200 group",
                      isActive 
                        ? "bg-white border-slate-200 shadow-sm ring-1 ring-slate-100" 
                        : "bg-slate-50 border-transparent opacity-60 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg text-white transition-transform group-hover:scale-110", bg)}>
                        <Icon size={18} />
                      </div>
                      <span className="font-medium text-sm">{label}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all",
                      isActive ? "bg-blue-600 border-blue-600" : "border-slate-300"
                    )} />
                  </button>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Info size={14} /> प्रदेशहरू
            </h2>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setSelectedProvince(null)}
                className={cn(
                  "text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  selectedProvince === null ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100 text-slate-600"
                )}
              >
                सबै प्रदेशहरू
              </button>
              {Object.keys(NEPAL_DATA).map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedProvince(name)}
                  className={cn(
                    "text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group",
                    selectedProvince === name ? "bg-blue-50 text-blue-700" : "hover:bg-slate-100 text-slate-600"
                  )}
                >
                  {name}
                  <ChevronRight size={14} className={cn("transition-transform", selectedProvince === name ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                </button>
              ))}
            </div>
          </section>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 relative bg-slate-200 overflow-hidden">
          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[1400] lg:hidden"
              />
            )}
          </AnimatePresence>

          {viewMode === 'map' ? (
            <div className="h-full w-full z-10">
              <MapContainer 
                center={mapCenter} 
                zoom={mapZoom} 
                className="h-full w-full"
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapUpdater center={mapCenter} zoom={mapZoom} />
                
                {activeCategories.has('highways') && HIGHWAYS.map((highway, idx) => (
                  <Polyline 
                    key={`highway-${idx}`}
                    positions={highway.path}
                    pathOptions={{ color: '#ef4444', weight: 4, opacity: 0.8, dashArray: '10, 10' }}
                  >
                    <Tooltip sticky direction="top" opacity={1}>
                      <span className="font-bold text-xs">{highway.name}</span>
                    </Tooltip>
                    <Popup>
                      <div className="p-1">
                        <h3 className="font-bold text-sm">{highway.name}</h3>
                        <p className="text-xs text-slate-500">{highway.description}</p>
                      </div>
                    </Popup>
                  </Polyline>
                ))}

                {filteredData.map((item, idx) => {
                  const IconComp = CATEGORY_ICONS[item.type].icon;
                  const color = CATEGORY_ICONS[item.type].color;
                  
                  // Create a custom icon for each marker
                  const customIcon = L.divIcon({
                    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}; color: white;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${getIconPath(item.type)}"/></svg>
                          </div>`,
                    className: 'custom-marker-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 32],
                    popupAnchor: [0, -32]
                  });
                  
                  return (
                    <Marker 
                      key={`${item.data.name}-${idx}`} 
                      position={[item.data.lat, item.data.lng]}
                      icon={customIcon}
                    >
                      <Popup className="custom-popup">
                        <div className="p-1 min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={cn("p-1.5 rounded text-white", CATEGORY_ICONS[item.type].bg)}>
                              <IconComp size={14} />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {CATEGORY_ICONS[item.type].label}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 mb-1">{item.data.name}</h3>
                          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                            {item.data.description || `${item.data.province} प्रदेशमा अवस्थित एक महत्वपूर्ण भौगोलिक विशेषता।`}
                          </p>
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">प्रदेश</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {item.data.province}
                            </span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              {/* Legend Overlay */}
              <div className="absolute top-6 right-6 z-[1000] bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white/20 hidden md:block">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">संकेतहरू</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {(Object.keys(CATEGORY_ICONS) as Category[]).map((key) => {
                    const { icon: Icon, label, color } = CATEGORY_ICONS[key];
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-bold text-slate-600">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Controls Overlay */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 lg:hidden z-[1000]">
                <button 
                  onClick={() => {
                    const el = document.getElementById('mobile-taskbar');
                    if (el) el.classList.toggle('translate-y-[calc(100%+24px)]');
                    const arrow = document.getElementById('taskbar-arrow');
                    if (arrow) arrow.classList.toggle('rotate-180');
                  }}
                  className="bg-white/90 backdrop-blur p-1.5 rounded-full shadow-lg border border-white/20 text-slate-400 transition-transform"
                >
                  <ChevronDown id="taskbar-arrow" size={16} className="transition-transform rotate-180" />
                </button>
                <div id="mobile-taskbar" className="flex gap-2 bg-white/90 backdrop-blur p-2 rounded-2xl shadow-xl border border-white/20 transition-transform duration-300">
                  {(Object.keys(CATEGORY_ICONS) as Category[]).map((key) => {
                  const { icon: Icon, bg } = CATEGORY_ICONS[key];
                  const isActive = activeCategories.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key)}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        isActive ? cn(bg, "text-white scale-110 shadow-lg") : "bg-white text-slate-400"
                      )}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          ) : (
            <div className="h-full w-full bg-white overflow-y-auto p-8">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">भौगोलिक विशेषताहरू</h2>
                    <p className="text-slate-500">तपाईंको फिल्टर अनुसार {filteredData.length} वस्तुहरू देखाइएको छ</p>
                  </div>
                  {selectedProvince && (
                    <button 
                      onClick={() => setSelectedProvince(null)}
                      className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-full transition-all"
                    >
                      {selectedProvince} <X size={14} />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredData.map((item, idx) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      key={`${item.data.name}-${idx}`}
                      className="group p-4 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn("p-3 rounded-xl text-white shadow-sm", CATEGORY_ICONS[item.type].bg)}>
                          {React.createElement(CATEGORY_ICONS[item.type].icon, { size: 20 })}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.data.name}</h4>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{CATEGORY_ICONS[item.type].label}</span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                            {item.data.description || `${item.data.province} प्रदेशको भौगोलिक विशेषता।`}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              {item.data.province}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Gemini Assistant Button */}
      <div className="fixed bottom-16 right-6 z-[1000] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-80 h-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
            >
              <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare size={18} />
                  <span className="font-bold text-sm">भूगोल सहायक</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-blue-700 p-1 rounded transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-400 mt-10">
                    <p className="text-xs">मलाई नेपालको भूगोलको बारेमा केहि सोध्नुहोस्!</p>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white ml-auto rounded-tr-none" 
                      : "bg-white text-slate-700 mr-auto rounded-tl-none border border-slate-100 shadow-sm"
                  )}>
                    {msg.text}
                  </div>
                ))}
                {isTyping && (
                  <div className="bg-white text-slate-700 mr-auto rounded-2xl rounded-tl-none border border-slate-100 shadow-sm p-3 max-w-[80%]">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input 
                  type="text" 
                  placeholder="प्रश्न टाइप गर्नुहोस्..." 
                  className="flex-1 bg-slate-100 border-none rounded-full px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isTyping}
                  className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
        >
          <MessageSquare size={24} />
        </button>
      </div>

      {/* Footer / Status Bar */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest z-50">
        <div className="flex items-center gap-4">
          <span>नेपाल शैक्षिक GIS v1.1</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>स्रोत: कक्षा १० पाठ्यक्रम</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          अन्तरक्रियात्मक मोड सक्रिय
        </div>
      </footer>
    </div>
  );
}
