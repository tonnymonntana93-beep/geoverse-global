import React, { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, serverTimestamp } from "firebase/database";
import { MessageSquare, MapPin, Package, ShoppingCart, Star, Send, ShieldAlert, Store, Coffee, Building } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
  apiKey: "BM1VxAtBCrkFr7fL5xYlaQF26MioB6LQjsMyCw09GZxURi1pBNCFaXS48aHe_CNakn-snN5hb7R2VBQkIDHF8tA",
  authDomain: "geoverse-global.firebaseapp.com",
  databaseURL: "https://geoverse-global-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "geoverse-global",
  storageBucket: "geoverse-global.appspot.com",
  appId: "1:221084205561:web:5317789304620663" 
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- DEFINICJE FRAKCJI / KLAS ---
const FACTIONS = {
  KURIER: { name: 'Kurier', color: '#22d3ee', perk: 'Szybkość ruchu +20%' },
  TECHNIK: { name: 'Technik', color: '#a855f7', perk: 'Hakowanie systemów' },
  HANDLARZ: { name: 'Handlarz', color: '#facc15', perk: 'Zniżki w Markecie' }
};

// --- SILNIK GRAFICZNY (IZOMETRIA I POI) ---
const isoIcon = (color, label) => L.divIcon({
  className: 'pixel-iso-marker',
  html: `
    <div style="position: relative; width: 60px; height: 80px; transform: scale(1);">
      ${label ? `<div style="position: absolute; top: -45px; left: -20px; background: #0d001a; border: 3px solid ${color}; color: ${color}; padding: 3px 6px; font-size: 8px; white-space: nowrap; box-shadow: 4px 4px 0px #000; font-family: 'Press Start 2P', cursive; z-index: 100;">💬 ${label}</div>` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg) rotateZ(45deg); width: 45px; height: 45px; border: 4px solid ${color}; border-radius: 50%; box-shadow: 0 0 15px ${color}; opacity: 0.9; z-index: 1;"></div>
      <div style="position:absolute; bottom:5px; left:50%; transform:translateX(-50%) rotateX(60deg); width:25px; height:25px; background:rgba(0,0,0,0.6); border-radius:50%; z-index:2;"></div>
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 26px; height: 50px; background: ${color}; border: 3px solid white; box-shadow: 4px 4px 0px #000; z-index: 10;">
          <div style="width: 100%; height: 12px; background: rgba(0,0,0,0.5);"></div>
      </div>
    </div>`,
  iconSize: [60, 80],
  iconAnchor: [30, 75]
});

const poiIcon = (type) => {
  const colors = { RESTAURACJA: '#f43f5e', SKLEP: '#10b981', INSTYTUCJA: '#3b82f6' };
  const color = colors[type] || '#ffffff';
  return L.divIcon({
    className: 'poi-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px;">
        <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg) rotateZ(45deg); width: 30px; height: 30px; background: ${color}40; border: 2px solid ${color}; box-shadow: 0 0 10px ${color}; z-index: 1;"></div>
        <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 20px; height: 20px; background: #0d001a; border: 2px solid ${color}; box-shadow: 3px 3px 0px #000; display:flex; justify-content:center; align-items:center; color:${color}; font-size:10px; z-index: 10;">
          ${type === 'RESTAURACJA' ? '🍔' : type === 'SKLEP' ? '🛒' : '🏛️'}
        </div>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// --- KOMPONENTY UI ---
const PixelButton = ({ children, onClick, active, color = "#ffffff", className, type = "button" }) => (
  <button 
    type={type} onClick={onClick} 
    className={`border-4 p-2 font-mono uppercase text-[10px] shadow-[4px_4px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all ${active ? 'bg-white text-black border-white' : 'bg-[#0d001a] text-white hover:brightness-125'} ${className}`}
    style={{ borderColor: active ? '#ffffff' : color, color: active ? '#000000' : color }}
  >
    {children}
  </button>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [agents, setAgents] = useState({});
  const [view, setView] = useState('MAP');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);
  const [localPois, setLocalPois] = useState([]);

  // Baza asortymentu
  const marketItems = [
    { id: 'm1', name: 'Kurtka Cyber-V', price: 450, img: '🧥', desc: '+10 Reputacja' },
    { id: 'm2', name: 'Buty Neon-Dash', price: 120, img: '👟', desc: '+5 Szybkość' },
    { id: 'm3', name: 'Eliksir Mocy', price: 80, img: '🧪', desc: 'Regeneracja' },
    { id: 'm4', name: 'Dron Zwiadowczy', price: 950, img: '🚁', desc: 'Odkrywa Sektor' }
  ];

  // Inicjalizacja i pobieranie danych
  useEffect(() => {
    const saved = localStorage.getItem('gv_user_v2');
    if (saved) setUser(JSON.parse(saved));

    Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 5000 }, (pos) => {
      if (pos) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });

    onValue(ref(db, 'agents'), (snap) => snap.val() && setAgents(snap.val()));
    onValue(ref(db, 'messages'), (snap) => {
      const data = snap.val();
      if (data) setMessages(Object.values(data).sort((a, b) => a.timestamp - b.timestamp).slice(-50));
    });
  }, []);

  // Aktualizacja pozycji agenta w bazie
  useEffect(() => {
    if (user && userPos) {
      update(ref(db, 'agents/' + user.id), {
        name: user.name, pos: userPos, faction: user.faction, color: user.color, status: user.status, rating: user.rating || 0, lastSeen: serverTimestamp()
      });
    }
  }, [user, userPos]);

  // Generowanie Punktów Zainteresowania (POI) wokół gracza
  useEffect(() => {
    if (userPos && localPois.length === 0) {
      setLocalPois([
        { id: 1, name: "Kebab u Grubego", type: "RESTAURACJA", promo: "-20% Z KODEM GEO", lat: userPos.lat + 0.0015, lng: userPos.lng + 0.002 },
        { id: 2, name: "Cyber-Żabka", type: "SKLEP", promo: "KUP 2 ENERGETYKI, +50$G", lat: userPos.lat - 0.001, lng: userPos.lng + 0.0025 },
        { id: 3, name: "Urząd Miasta", type: "INSTYTUCJA", promo: "ZADANIE: DOSTARCZ DOKUMENTY", lat: userPos.lat + 0.002, lng: userPos.lng - 0.0015 }
      ]);
    }
  }, [userPos, localPois.length]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, view]);

  // Akcje
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    push(ref(db, 'messages'), { sender: user.name, text: inputText, color: user.color, timestamp: serverTimestamp() });
    setInputText('');
  };

  const buyItem = (item) => {
    if (user.balance >= item.price) {
      const updatedUser = { ...user, balance: user.balance - item.price, inventory: [...(user.inventory || []), item] };
      setUser(updatedUser);
      localStorage.setItem('gv_user_v2', JSON.stringify(updatedUser));
      toast.success(`ZAKUPIONO: ${item.name}`);
    } else {
      toast.error("BRAK ŚRODKÓW!");
    }
  };

  const rateAgent = (agentId, rating) => {
    update(ref(db, `agents/${agentId}`), { rating: rating });
    toast.success("Oceniono Agenta.");
  };

  // --- WIDOK KREATORA POSTACI (LOGOWANIE) ---
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 text-white font-mono bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
        <div className="border-4 border-[#a855f7] p-6 bg-[#0d001a]/95 shadow-[10px_10px_0px_#000] w-full max-w-md backdrop-blur-sm">
          <h1 className="text-3xl font-black mb-2 italic tracking-tighter text-[#22d3ee] drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]">GEOVERSE</h1>
          <p className="text-[10px] mb-8 uppercase font-bold tracking-widest text-gray-400">Rejestracja w systemie</p>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const factionKey = formData.get('faction');
            const newUser = { 
              id: 'AG_' + Date.now(), 
              name: formData.get('name'), 
              faction: FACTIONS[factionKey].name,
              color: FACTIONS[factionKey].color,
              balance: 1500, 
              status: "W grze",
              rating: 5,
              inventory: []
            };
            setUser(newUser);
            localStorage.setItem('gv_user_v2', JSON.stringify(newUser));
          }} className="space-y-6">
            
            <div>
              <label className="text-[8px] text-gray-500 uppercase mb-1 block">Kryptonim Operacyjny</label>
              <input name="name" className="w-full bg-black border-2 border-gray-700 p-3 text-white outline-none text-sm font-bold focus:border-[#22d3ee] transition-colors" required placeholder="Wpisz nazwę..." maxLength={15} />
            </div>

            <div>
              <label className="text-[8px] text-gray-500 uppercase mb-2 block">Wybierz Specjalizację</label>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(FACTIONS).map(([key, data]) => (
                  <label key={key} className="cursor-pointer">
                    <input type="radio" name="faction" value={key} defaultChecked={key === 'KURIER'} className="peer sr-only" />
                    <div className="border-2 border-gray-800 bg-black p-3 peer-checked:border-[3px] opacity-60 peer-checked:opacity-100 flex items-center justify-between transition-all" style={{ '--tw-ring-color': data.color, borderLeftColor: data.color }}>
                      <div>
                        <p className="font-bold text-[12px]" style={{ color: data.color }}>{data.name}</p>
                        <p className="text-[8px] text-gray-400 mt-1">{data.perk}</p>
                      </div>
                      <div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: data.color }}></div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full bg-[#22d3ee] text-black font-black py-4 mt-4 uppercase text-xs hover:bg-white transition-colors shadow-[4px_4px_0px_#000]">
              Inicjalizuj Agenta
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- GŁÓWNY INTERFEJS APLIKACJI ---
  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden text-xs font-mono">
      <Toaster richColors position="top-center" theme="dark" />
      
      {/* HEADER */}
      <header className="p-3 border-b-4 border-gray-900 flex justify-between items-center bg-[#05000a] z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 flex items-center justify-center text-lg font-black shadow-[2px_2px_0px_#000] bg-black" style={{ borderColor: user.color, color: user.color }}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-black text-[11px] tracking-wider uppercase">{user.name}</p>
            <p className="text-[8px] text-gray-500 uppercase">{user.faction} • Lvl 1</p>
          </div>
        </div>
        <div className="text-right bg-black border border-gray-800 px-3 py-1 shadow-inner">
          <p className="text-[7px] text-gray-500 mb-1">KREDYTY</p>
          <p className="font-black text-sm text-[#facc15]">{user.balance} $G</p>
        </div>
      </header>

      {/* PRZESTRZEŃ ROBOCZA */}
      <main className="flex-1 relative bg-[#0a0a0a]">
        
        {/* --- MAPA --- */}
        {view === 'MAP' && userPos ? (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full">
            {/* Lżejsza i bardziej czytelna mapa */}
            <TileLayer 
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" 
              className="map-tiles-adjusted"
            />
            
            {/* TY */}
            <Marker position={[userPos.lat, userPos.lng]} icon={isoIcon(user.color, "TO TY")} zIndexOffset={1000} />

            {/* INNI AGENCI */}
            {Object.entries(agents).map(([id, data]) => {
              if (id === user.id || !data.pos) return null;
              return (
                <Marker key={id} position={[data.pos.lat, data.pos.lng]} icon={isoIcon(data.color || '#fff', data.status)}>
                  <Popup className="custom-popup">
                    <div className="p-2 font-mono space-y-2 w-[180px] bg-black border-2 text-white" style={{ borderColor: data.color || '#fff' }}>
                      <h3 className="font-black border-b border-gray-700 pb-1" style={{ color: data.color || '#fff' }}>{data.name}</h3>
                      <p className="text-[8px] text-gray-400">{data.faction || 'Nieznana frakcja'}</p>
                      <div className="flex justify-between items-center bg-gray-900 p-2 mt-2">
                        <span className="text-[8px]">REP:</span>
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={10} fill={star <= (data.rating || 0) ? '#facc15' : 'none'} color={star <= (data.rating || 0) ? '#facc15' : '#4b5563'} onClick={() => rateAgent(id, star)} className="cursor-pointer" />
                          ))}
                        </div>
                      </div>
                      <button className="w-full text-center mt-2 border p-1 text-[8px] hover:bg-white hover:text-black transition-colors" style={{ borderColor: data.color || '#fff' }}>WYŚLIJ WIADOMOŚĆ</button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* PUNKTY POI (Restauracje, Sklepy) */}
            {localPois.map(poi => (
              <Marker key={poi.id} position={[poi.lat, poi.lng]} icon={poiIcon(poi.type)}>
                <Popup className="custom-popup">
                  <div className="p-2 font-mono w-[180px] bg-black border-2 border-white text-white">
                    <p className="text-[8px] text-gray-400 mb-1">{poi.type}</p>
                    <h3 className="font-bold text-[10px] mb-2">{poi.name}</h3>
                    <div className="bg-[#22d3ee]/20 text-[#22d3ee] p-2 border border-[#22d3ee] text-[9px] text-center mb-2 animate-pulse">
                      {poi.promo}
                    </div>
                    <button className="w-full bg-white text-black p-1 text-[8px] font-bold">ODBIERZ BONUS</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        ) : view === 'MAP' && (
          <div className="h-full flex items-center justify-center flex-col gap-4 text-[#22d3ee]">
            <ShieldAlert size={40} className="animate-bounce" />
            <p className="animate-pulse tracking-widest text-[10px]">ŁĄCZENIE Z SATELITĄ GPS...</p>
          </div>
        )}

        {/* --- CZAT --- */}
        {view === 'CHAT' && (
          <div className="h-full flex flex-col bg-[#0d001a]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.sender === user.name ? 'items-end' : 'items-start'}`}>
                  <span className="text-[7px] text-gray-500 mb-1 px-1">{m.sender}</span>
                  <div className={`p-3 max-w-[80%] border-2 shadow-[2px_2px_0px_#000] ${m.sender === user.name ? 'bg-black text-white' : 'bg-black text-white'}`} style={{ borderColor: m.color || '#555' }}>
                    <p className="text-[10px] leading-relaxed">{m.text}</p>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-3 bg-black border-t border-gray-800 flex gap-2">
              <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="Nadaj komunikat..." className="flex-1 bg-gray-900 border border-gray-700 p-3 outline-none text-white text-xs focus:border-[#22d3ee]" />
              <button type="submit" className="bg-[#22d3ee] text-black px-4 shadow-[2px_2px_0px_#000] hover:bg-white"><Send size={18} /></button>
            </form>
          </div>
        )}

        {/* --- MARKET --- */}
        {view === 'MARKET' && (
          <div className="h-full bg-[#0d001a] p-4 overflow-y-auto">
            <h2 className="text-[#facc15] border-b-2 border-[#facc15] pb-2 mb-4 text-sm font-black uppercase">Czarny Rynek</h2>
            <div className="space-y-3">
              {marketItems.map(item => (
                <div key={item.id} className="border-2 border-gray-700 bg-black p-3 flex justify-between items-center hover:border-[#facc15] transition-colors">
                  <div className="w-12 h-12 bg-gray-900 border border-gray-800 flex items-center justify-center text-2xl">{item.img}</div>
                  <div className="flex-1 px-3">
                    <p className="font-bold text-[11px] text-white">{item.name}</p>
                    <p className="text-[8px] text-gray-500 mt-1">{item.desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#facc15] mb-2">{item.price} G</p>
                    <button onClick={() => buyItem(item)} className="bg-white text-black font-bold px-3 py-1 text-[8px] uppercase hover:bg-[#facc15]">KUP</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- EKWIPUNEK --- */}
        {view === 'INVENTORY' && (
          <div className="h-full bg-[#0d001a] p-4">
            <h2 className="text-white border-b-2 border-white pb-2 mb-4 text-sm font-black uppercase flex justify-between">
              <span>Ekwipunek</span>
              <span className="text-[#22d3ee]">{user.inventory?.length || 0} / 20</span>
            </h2>
            {(!user.inventory || user.inventory.length === 0) ? (
              <div className="h-40 flex items-center justify-center text-gray-600 text-[10px] border-2 border-dashed border-gray-800">
                BRAK PRZEDMIOTÓW
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {user.inventory.map((item, i) => (
                  <div key={i} className="aspect-square bg-black border-2 border-gray-700 flex flex-col items-center justify-center relative group">
                    <span className="text-2xl">{item.img}</span>
                    <div className="absolute inset-0 bg-black/90 opacity-0 group-hover:opacity-100 flex items-center justify-center p-1 text-center transition-opacity">
                      <span className="text-[6px] text-[#22d3ee]">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- DOLNA NAWIGACJA --- */}
      <footer className="bg-[#05000a] border-t-2 border-gray-800 flex justify-around items-center z-30 pb-safe">
        {[ 
          {id: 'MAP', icon: MapPin, label: 'MAPA'}, 
          {id: 'CHAT', icon: MessageSquare, label: 'CZAT'}, 
          {id: 'MARKET', icon: ShoppingCart, label: 'RYNEK'}, 
          {id: 'INVENTORY', icon: Package, label: 'PLECAK'} 
        ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-colors ${view === t
