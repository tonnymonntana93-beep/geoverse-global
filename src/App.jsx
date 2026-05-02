import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, set, update } from "firebase/database";
import { UserCircle, Shield, ShoppingBag, MessageSquare, MapPin, Search } from 'lucide-react';

// --- KONFIGURACJA FIREBASE (WKLEJ SWOJE DANE TUTAJ) ---
const firebaseConfig = {
  apiKey: "BM1VxAtBCrkFr7fL5xYlaQF26MioB6LQjsMyCw09GZxURi1pBNCFaXS48aHe_CNakn-snN5hb7R2VBQkIDHF8tA",
  authDomain: "geoverse.firebaseapp.com",
  databaseURL: "TWOJA_URL_BAZY",
  projectId: "geoverse-global",
  storageBucket: "geoverse.appspot.com",
  messagingSenderId: "ID",
  appId: "ID_APP"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- IKONY IZOMETRYCZNE ---
const createIsoIcon = (color, label, isUser) => L.divIcon({
  className: 'iso-marker',
  html: `
    <div style="position: relative; width: 50px; height: 60px;">
      ${label ? `<div style="position: absolute; top: -45px; left: -10px; background: #0d1117; border: 2px solid ${color}; color: ${color}; padding: 3px 10px; font-size: 14px; white-space: nowrap; border-radius: 2px; box-shadow: 4px 4px 0px #000; z-index: 100;">${label}</div>` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg); width: 40px; height: 40px; border: 3px solid ${color}; border-radius: 50%; box-shadow: 0 0 20px ${color}; opacity: 0.8;"></div>
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 20px; height: 40px; background: ${color}; border: 3px solid white; ${isUser ? 'animation: bounce 2s infinite;' : ''}"></div>
    </div>
  `,
  iconSize: [50, 60],
  iconAnchor: [25, 55]
});

const App = () => {
  const [user, setUser] = useState(null); // Profil Agenta
  const [userPos, setUserPos] = useState(null);
  const [onlineAgents, setOnlineAgents] = useState({});
  const [view, setView] = useState('MAP');

  // 1. Ładowanie/Tworzenie Profilu
  useEffect(() => {
    const savedProfile = localStorage.getItem('gv_agent');
    if (savedProfile) setUser(JSON.parse(savedProfile));
  }, []);

  // 2. Synchronizacja z Bazą (Realtime)
  useEffect(() => {
    if (!user || !userPos) return;

    // Wysyłaj moją pozycję i status do świata
    update(ref(db, 'agents/' + user.id), {
      name: user.name,
      status: user.status,
      pos: userPos,
      lastSeen: Date.now()
    });

    // Słuchaj innych agentów
    const agentsRef = ref(db, 'agents');
    onValue(agentsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setOnlineAgents(data);
    });
  }, [user, userPos]);

  // 3. GPS Tracking
  useEffect(() => {
    Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
      if (pos) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  // Funkcja tworzenia profilu (Kreator)
  const createAgent = (e) => {
    e.preventDefault();
    const newAgent = {
      id: 'AGENT_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      name: e.target.name.value,
      status: 'SYSTEM_ONLINE',
      xp: 0
    };
    setUser(newAgent);
    localStorage.setItem('gv_agent', JSON.stringify(newAgent));
  };

  // --- EKRAN KREATORA ---
  if (!user) {
    return (
      <div className="h-screen w-screen bg-[#050505] flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-md border-2 border-[#1dfa9e] p-8 bg-[#0d1117] shadow-[8px_8px_0px_#000]">
          <h1 className="text-[#1dfa9e] text-3xl font-black italic mb-6 tracking-tighter">GEOWERSUM_INITIALIZE</h1>
          <form onSubmit={createAgent} className="space-y-6">
            <div>
              <label className="text-[#1dfa9e] text-[12px] uppercase">Kryptonim Agenta:</label>
              <input name="name" required className="w-full bg-black border-2 border-[#1dfa9e] p-3 text-[#1dfa9e] outline-none mt-2 focus:bg-[#1dfa9e]/10" placeholder="np. Master_Leon" />
            </div>
            <button type="submit" className="w-full bg-[#1dfa9e] text-black font-black p-4 uppercase hover:bg-white transition-colors">Dołącz do Sektora</button>
          </form>
        </div>
      </div>
    );
  }

  // --- GLÓWNY HUD ---
  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col font-mono text-[#1dfa9e] overflow-hidden">
      <header className="p-4 border-b-2 border-[#1dfa9e]/20 flex justify-between items-center bg-black/80 backdrop-blur-md z-[2000]">
        <div className="flex items-center gap-3">
          <Shield className="text-[#1dfa9e] animate-pulse" size={32} />
          <div>
            <p className="text-xs opacity-50">STATUS: POŁĄCZONO</p>
            <p className="font-black text-lg">{user.name}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px]">LOKALIZACJA</p>
          <p className="text-xs font-bold underline">SEKTOR_OŚWIĘCIM</p>
        </div>
      </header>

      <main className="flex-1 relative">
        {view === 'MAP' && userPos && (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full grayscale-[0.9]">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            
            {/* TY NA MAPIE */}
            <Marker position={[userPos.lat, userPos.lng]} icon={createIsoIcon('#1dfa9e', 'TY', true)} />

            {/* INNI AGENCI Z BAZY REALTIME */}
            {Object.keys(onlineAgents).map(id => {
              const agent = onlineAgents[id];
              if (id === user.id) return null; // Nie rysuj siebie podwójnie
              return (
                <Marker key={id} position={[agent.pos.lat, agent.pos.lng]} icon={createIsoIcon('#b535f6', agent.status, false)}>
                  <Popup>
                    <div className="bg-[#0d1117] p-2 text-[#1dfa9e]">
                      <p className="font-black border-b border-[#1dfa9e] mb-2">{agent.name}</p>
                      <p className="text-xs italic">{agent.status}</p>
                      <button className="mt-4 w-full border border-[#1dfa9e] p-1 text-[10px] hover:bg-[#1dfa9e] hover:text-black">WYŚLIJ LINK</button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        )}
      </main>

      <nav className="p-4 bg-black border-t-2 border-[#1dfa9e]/20 flex justify-around z-[2000]">
        <button onClick={() => setView('MAP')} className={`flex flex-col items-center gap-1 ${view === 'MAP' ? 'text-[#1dfa9e]' : 'text-gray-500'}`}>
          <MapPin size={24} /><span className="text-[8px]">RADAR</span>
        </button>
        <button className="text-gray-500 flex flex-col items-center gap-1">
          <ShoppingBag size={24} /><span className="text-[8px]">MARKET</span>
        </button>
        <button className="text-gray-500 flex flex-col items-center gap-1">
          <MessageSquare size={24} /><span className="text-[8px]">MESSENGER</span>
        </button>
        <button className="text-[#1dfa9e] flex flex-col items-center gap-1">
          <UserCircle size={24} /><span className="text-[8px]">PROFILE</span>
        </button>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce { 0%, 100% { transform: translate(-50%, 0); } 50% { transform: translate(-50%, -10px); } }
        .leaflet-container { background: #050505 !important; }
      `}} />
    </div>
  );
};

export default App;
