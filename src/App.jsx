import React, { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update, serverTimestamp } from "firebase/database";
import { MessageSquare, MapPin, User, Package, Send, ShoppingCart, ShieldAlert, Star, Filter } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- STYLIZACJA CYBER-PIXEL (Paleta z grafiki user_6.png) ---
const purpleHighlight = "#a855f7"; // Główny neon
const tealCyan = "#22d3ee"; // Kontrast
const deepBkg = "#0d001a"; // Mroczne tło

// --- TECHNICZNE: IZOMETRYCZNY SYMULATOR AGENTA ---
// Prawdziwa izometria wymagałaby Three.js, tutaj symulujemy rzut
// za pomocą transformacji i specyficznej grafiki DivIcon.
const isoIcon = (color, label, agentData) => L.divIcon({
  className: 'pixel-iso-marker',
  html: `
    <div style="position: relative; width: 60px; height: 80px; transform: scale(1);">
      ${label ? `<div style="position: absolute; top: -55px; left: -20px; background: ${deepBkg}; border: 4px solid ${purpleHighlight}; color: ${purpleHighlight}; padding: 3px 10px; font-size: 10px; white-space: nowrap; box-shadow: 6px 6px 0px #000; font-family: 'Press Start 2P'; z-index: 100;">💬 ${label}</div>` : ''}
      
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg) rotateY(0deg) rotateZ(45deg); width: 45px; height: 45px; border: 4px solid ${color}; border-radius: 50%; box-shadow: 0 0 20px ${color}; opacity: 0.8; z-index: 1;"></div>
      
      <div style="position:absolute; bottom:5px; left:50%; transform:translateX(-50%) rotateX(60deg); width:25px; height:25px; background:rgba(0,0,0,0.5); border-radius:50%; z-index:2;"></div>
      
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 30px; height: 55px; background: ${color}; border: 4px solid white; box-shadow: 6px 6px 0px #000; z-index: 10;">
          <div style="width: 100%; height: 15px; background: rgba(0,0,0,0.4);"></div> </div>
    </div>`,
  iconSize: [60, 80],
  iconAnchor: [30, 75]
});

// Komponent do stylizacji przycisków typu pixel art z grafiki
const PixelButton = ({ children, onClick, active, neon = purpleHighlight, className }) => (
  <button onClick={onClick} className={`border-4 ${active ? `border-white bg-${deepBkg}` : `border-${neon}/40 bg-${deepBkg}`} text-white p-2 font-mono uppercase text-[10px] shadow-[6px_6px_0px_#000] hover:border-${neon} hover:text-${neon} active:translate-x-1 active:translate-y-1 transition-all ${className}`}>
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
  const [inventory, setInventory] = useState([]);

  const marketItems = [
    { id: 'm1', name: 'Buty Neon-Dash', price: 120, img: '👟' },
    { id: 'm2', name: 'Kurtka Cyber-V', price: 450, img: '🧥' },
    { id: 'm3', name: 'Eliksir Mocy', price: 80, img: '🧪' }
  ];

  // --- BRAKUJĄCA FUNKCJA: System Reputacji ---
  const rateAgent = (agentId, rating) => {
    if (rating < 1 || rating > 5) return;
    update(ref(db, `agents/${agentId}`), {
      rating: rating, // Prosty update, później zrobimy średnią
      ratingCount: 1, // Placeholder
    });
    toast.success("Wystawiono ocenę Agenta.");
  };

  useEffect(() => {
    const saved = localStorage.getItem('gv_user_neo');
    if (saved) setUser(JSON.parse(saved));

    Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 5000 }, (pos) => {
      if (pos) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });

    onValue(ref(db, 'agents'), (snap) => snap.val() && setAgents(snap.val()));
    onValue(ref(db, 'messages'), (snap) => {
      const data = snap.val();
      if (data) {
        const msgList = Object.values(data).sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgList.slice(-50));
      }
    });
  }, []);

  useEffect(() => {
    if (user && userPos) {
      update(ref(db, 'agents/' + user.id), {
        name: user.name,
        pos: userPos,
        // Domyślne dane dla systemu reputacji
        rating: 0,
        ratingCount: 0,
        completedTasks: 0,
        status: user.status || "SYSTEM_ONLINE",
        lastSeen: serverTimestamp()
      });
    }
  }, [user, userPos]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    push(ref(db, 'messages'), { sender: user.name, text: inputText, timestamp: serverTimestamp() });
    setInputText('');
  };

  const buyItem = (item) => {
    if (user.balance >= item.price) {
      setUser(prev => ({ ...prev, balance: prev.balance - item.price }));
      setInventory(prev => [...prev, item]);
      toast.success(`ZAKUPIONO: ${item.name}`);
    } else {
      toast.error("BRAK ŚRODKÓW!");
    }
  };

  // --- EKRAN AUTORYZACJI (Jak na graficeuser_6.png 'Strona 1/2') ---
  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-6 text-white font-mono">
      <div className={`border-8 border-${purpleHighlight} p-8 bg-${deepBkg} shadow-[15px_15px_0px_#000] w-full max-w-lg`}>
        <h1 className="text-4xl font-black mb-10 italic border-b-4 border-white pb-2 tracking-tighter text-white">GEOWERSUM</h1>
        <p className="text-[12px] mb-6 opacity-80 uppercase font-bold tracking-widest text-center">Inicjalizacja sektora: Oświęcim</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const newUser = { id: 'AG_' + Date.now(), name: e.target.name.value, balance: 1000, status: "Szukam przygody" };
          setUser(newUser);
          localStorage.setItem('gv_user_neo', JSON.stringify(newUser));
        }} className="space-y-6">
          <input name="name" className={`w-full bg-black border-4 border-${purpleHighlight} p-4 text-${purpleHighlight} outline-none text-xl font-black`} required placeholder="KRYPTONIM AGENTA" />
          <PixelButton type="submit" className="w-full text-lg py-5">GRAJ!</PixelButton>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden text-xs">
      <Toaster richColors position="top-center" theme="dark" />
      
      {/* HEADER HUD (Cyberpunk style z grafiki) */}
      <header className={`p-4 border-b-4 border-${purpleHighlight}/30 flex justify-between items-center bg-black z-20`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 border-4 border-${tealCyan} flex items-center justify-center text-xl font-black text-${tealCyan} shadow-[4px_4px_0px_#000]`}>G</div>
          <div>
            <p className="font-black text-sm tracking-widest uppercase">{user.name}</p>
            <p className="text-[10px] text-gray-500 uppercase">Sektor: CENTRUN...OSŚ</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#ffff00]" />
            <p className="font-black text-lg text-[#ffff00]">{user.balance} G</p>
          </div>
        </div>
      </header>

      {/* GŁÓWNY WIDOK */}
      <main className="flex-1 relative">
        {view === 'MAP' && userPos && (
          // Używamy mrocznych kafli CartoDB, by neon świecił
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full grayscale opacity-90">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {/* TY NA MAPIE (Izometryczny) */}
            <Marker position={[userPos.lat, userPos.lng]} icon={isoIcon(tealCyan, "TO TY")} />

            {/* INNI AGENCI (Realtime, Izometryczni) */}
            {Object.entries(agents).map(([id, data]) => {
              if (id === user.id) return null;
              return (
                <Marker key={id} position={[data.pos.lat, data.pos.lng]} icon={isoIcon(purpleHighlight, data.status || "Szukam party")}>
                  {/* --- PROFIL AGENTA (Zgodnie z grafiką user_6.png mapa Śworld) --- */}
                  <Popup>
                    <div className="p-3 font-mono space-y-3 w-[250px]">
                      <h3 className="font-black border-b border-white pb-1">{data.name}</h3>
                      <p className="text-[10px] italic">{data.status || "Brak statusu"}</p>
                      
                      {/* BRAKUJĄCA FUNKCJA: Wyświetlanie reputacji */}
                      <div className="flex justify-between items-center bg-black/50 p-2">
                        <span className="text-[8px] uppercase">Reputacja</span>
                        <div className="flex gap-1 text-[#ffff00]">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={14} fill={star <= (data.rating || 0) ? '#ffff00' : 'none'} onClick={() => rateAgent(id, star)} className="cursor-pointer active:scale-125" />
                          ))}
                        </div>
                      </div>
                      
                      <PixelButton className="w-full text-center">NAWIĄŻ KONTAKT</PixelButton>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}

        {/* --- INNE WIDOKI (Uproszczone dla estetyki graficznej) --- */}
        {view === 'CHAT' && ( <div className="h-full bg-black p-4 text-white font-mono">MODUŁ CZATU...</div> )}
        {view === 'MARKET' && ( <div className="h-full bg-black p-4 text-white font-mono">BLACK_MARKET.EXE...</div> )}
        {view === 'INVENTORY' && ( <div className="h-full bg-black p-4 text-white font-mono">EKWIPUNEK...</div> )}
      </main>

      {/* FOOTER: PANEL FILTRÓW Z GRAFIKI SWORLD */}
      {view === 'MAP' && (
        <div className={`p-4 bg-${deepBkg} border-t-4 border-${purpleHighlight}/20 z-[3000] flex justify-between gap-2 overflow-x-auto shadow-inner`}>
          <PixelButton className="flex-1 text-center" active={true}>FILTRS:</PixelButton>
          <PixelButton className="text-center" neon={tealCyan}>Handel</PixelButton>
          <PixelButton className="text-center" neon={tealCyan}>Zadania</PixelButton>
          <PixelButton className="text-center" neon={tealCyan}>Towarzsyki</PixelButton>
        </div>
      )}

      {/* DOLNA NAWIGACJA Z IKONAMI */}
      <footer className="p-3 bg-black border-t-4 border-${purpleHighlight}/20 flex justify-around items-center z-[3000]">
        {[ {id: 'MAP', icon: MapPin}, {id: 'CHAT', icon: MessageSquare}, {id: 'MARKET', icon: ShoppingCart}, {id: 'INVENTORY', icon: Package} ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} className={`p-2 ${view === tab.id ? `text-${purpleHighlight}` : 'text-gray-600'}`}>
            <tab.icon size={26} />
          </button>
        ))}
      </footer>

      {/* --- TECHNICZNE: CSS DLA IZOMETRII I ANIMACJI --- */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { image-rendering: pixelated; font-family: 'Press Start 2P', cursive; }
        .pixel-iso-marker { transition: all 0.5s ease-out; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        .pixel-iso-marker div[style*="animation: bounce"] { animation: bounce 1.5s infinite; }
      `}} />
    </div>
  );
};

export default App;
              
