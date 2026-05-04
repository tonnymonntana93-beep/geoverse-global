import React, { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, serverTimestamp } from "firebase/database";
import { MessageSquare, MapPin, Package, ShoppingCart, Star } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- KONFIGURACJA FIREBASE (Z TWOIMI KLUCZAMI) ---
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

// --- IZOMETRYCZNY SYMULATOR AGENTA ---
const isoIcon = (color, label, agentData) => L.divIcon({
  className: 'pixel-iso-marker',
  html: `
    <div style="position: relative; width: 60px; height: 80px; transform: scale(1);">
      ${label ? `<div style="position: absolute; top: -55px; left: -20px; background: #0d001a; border: 4px solid #a855f7; color: #a855f7; padding: 3px 10px; font-size: 10px; white-space: nowrap; box-shadow: 6px 6px 0px #000; font-family: 'Press Start 2P', cursive; z-index: 100;">💬 ${label}</div>` : ''}
      
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg) rotateY(0deg) rotateZ(45deg); width: 45px; height: 45px; border: 4px solid ${color}; border-radius: 50%; box-shadow: 0 0 20px ${color}; opacity: 0.8; z-index: 1;"></div>
      
      <div style="position:absolute; bottom:5px; left:50%; transform:translateX(-50%) rotateX(60deg); width:25px; height:25px; background:rgba(0,0,0,0.5); border-radius:50%; z-index:2;"></div>
      
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 30px; height: 55px; background: ${color}; border: 4px solid white; box-shadow: 6px 6px 0px #000; z-index: 10;">
          <div style="width: 100%; height: 15px; background: rgba(0,0,0,0.4);"></div> </div>
    </div>`,
  iconSize: [60, 80],
  iconAnchor: [30, 75]
});

// --- KOMPONENT PRZYCISKU PIXEL ART ---
const PixelButton = ({ children, onClick, active, className, type = "button" }) => (
  <button 
    type={type}
    onClick={onClick} 
    className={`border-4 p-2 font-mono uppercase text-[10px] shadow-[6px_6px_0px_#000] active:translate-x-1 active:translate-y-1 transition-all ${active ? 'border-white bg-[#0d001a] text-white' : 'border-[#a855f7]/40 bg-[#0d001a] text-white hover:border-[#a855f7] hover:text-[#a855f7]'} ${className}`}
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
  const [inventory, setInventory] = useState([]);

  const marketItems = [
    { id: 'm1', name: 'Buty Neon-Dash', price: 120, img: '👟' },
    { id: 'm2', name: 'Kurtka Cyber-V', price: 450, img: '🧥' },
    { id: 'm3', name: 'Eliksir Mocy', price: 80, img: '🧪' }
  ];

  // System Oceniania Agenta
  const rateAgent = (agentId, rating) => {
    if (rating < 1 || rating > 5) return;
    update(ref(db, `agents/${agentId}`), { rating: rating, ratingCount: 1 });
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
        rating: 0,
        ratingCount: 0,
        status: user.status || "SYSTEM_ONLINE",
        lastSeen: serverTimestamp()
      });
    }
  }, [user, userPos]);

  // EKRAN AUTORYZACJI
  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-6 text-white font-mono">
      <div className="border-8 border-[#a855f7] p-8 bg-[#0d001a] shadow-[15px_15px_0px_#000] w-full max-w-lg">
        <h1 className="text-3xl font-black mb-10 italic border-b-4 border-white pb-2 tracking-tighter text-white">GEOVERSE</h1>
        <p className="text-[12px] mb-6 opacity-80 uppercase font-bold tracking-widest text-center">Sektor: Oświęcim</p>
        <form onSubmit={(e) => {
          e.preventDefault();
          const newUser = { id: 'AG_' + Date.now(), name: e.target.name.value, balance: 1000, status: "Szukam przygody" };
          setUser(newUser);
          localStorage.setItem('gv_user_neo', JSON.stringify(newUser));
        }} className="space-y-6">
          <input name="name" className="w-full bg-black border-4 border-[#a855f7] p-4 text-[#a855f7] outline-none text-xl font-black text-center" required placeholder="KRYPTONIM" />
          <PixelButton type="submit" className="w-full text-lg py-4 border-[#a855f7]">GRAJ!</PixelButton>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-black text-white overflow-hidden text-xs font-mono">
      <Toaster richColors position="top-center" theme="dark" />
      
      {/* HEADER HUD */}
      <header className="p-4 border-b-4 border-[#a855f7]/30 flex justify-between items-center bg-black z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#22d3ee] flex items-center justify-center text-lg font-black text-[#22d3ee] shadow-[4px_4px_0px_#000]">G</div>
          <div>
            <p className="font-black text-sm tracking-widest uppercase">{user.name}</p>
            <p className="text-[9px] text-gray-500 uppercase">Centrum OŚ</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-2">
          <p className="font-black text-lg text-[#ffff00]">{user.balance} G</p>
        </div>
      </header>

      {/* GŁÓWNY WIDOK */}
      <main className="flex-1 relative">
        {view === 'MAP' && userPos ? (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full grayscale opacity-90">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            <Marker position={[userPos.lat, userPos.lng]} icon={isoIcon('#22d3ee', "TO TY")} />

            {Object.entries(agents).map(([id, data]) => {
              if (id === user.id) return null;
              return (
                <Marker key={id} position={[data.pos.lat, data.pos.lng]} icon={isoIcon('#a855f7', data.status || "Szukam party")}>
                  <Popup>
                    <div className="p-3 font-mono space-y-3 w-[200px] bg-[#0d001a] text-white">
                      <h3 className="font-black border-b border-white pb-1">{data.name}</h3>
                      <p className="text-[10px] italic">{data.status || "Brak statusu"}</p>
                      <div className="flex justify-between items-center bg-black/50 p-2 border border-[#a855f7]">
                        <span className="text-[8px] uppercase">Reputacja</span>
                        <div className="flex gap-1 text-[#ffff00]">
                          {[1,2,3,4,5].map(star => (
                            <Star key={star} size={14} fill={star <= (data.rating || 0) ? '#ffff00' : 'none'} color="#ffff00" onClick={() => rateAgent(id, star)} className="cursor-pointer" />
                          ))}
                        </div>
                      </div>
                      <PixelButton className="w-full text-center mt-2 border-[#a855f7]">KONTAKT</PixelButton>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : view === 'MAP' && (
          <div className="h-full flex items-center justify-center text-[#a855f7] animate-pulse">ŁADOWANIE SEKTORA GPS...</div>
        )}

        {view === 'CHAT' && <div className="h-full bg-[#0d001a] p-4">MODUŁ CZATU WKRÓTCE...</div>}
        {view === 'MARKET' && <div className="h-full bg-[#0d001a] p-4">BLACK_MARKET WKRÓTCE...</div>}
        {view === 'INVENTORY' && <div className="h-full bg-[#0d001a] p-4">EKWIPUNEK WKRÓTCE...</div>}
      </main>

      {/* PANEL FILTRÓW */}
      {view === 'MAP' && (
        <div className="p-4 bg-[#0d001a] border-t-4 border-[#a855f7]/20 z-[3000] flex justify-between gap-2 overflow-x-auto shadow-inner">
          <PixelButton className="flex-1 text-center" active={true}>FILTRY:</PixelButton>
          <PixelButton className="text-center border-[#22d3ee]">Handel</PixelButton>
          <PixelButton className="text-center border-[#22d3ee]">Zadania</PixelButton>
        </div>
      )}

      {/* DOLNA NAWIGACJA */}
      <footer className="p-3 bg-black border-t-4 border-[#a855f7]/20 flex justify-around items-center z-[3000]">
        {[ {id: 'MAP', icon: MapPin}, {id: 'CHAT', icon: MessageSquare}, {id: 'MARKET', icon: ShoppingCart}, {id: 'INVENTORY', icon: Package} ].map(tab => (
          <button key={tab.id} onClick={() => setView(tab.id)} className={`p-2 ${view === tab.id ? 'text-[#a855f7]' : 'text-gray-600'}`}>
            <tab.icon size={26} />
          </button>
        ))}
      </footer>

      {/* STYLE CSS DLA IZOMETRII */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { image-rendering: pixelated; font-family: 'Press Start 2P', cursive; }
        .pixel-iso-marker { transition: all 0.5s ease-out; }
      `}} />
    </div>
  );
};

export default App;
