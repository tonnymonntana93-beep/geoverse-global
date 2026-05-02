import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MessageSquare, ShoppingBag, MapPin, User, Search, Zap, crosshair } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- STYLIZACJA NEONOWA ---
const neonGreen = "#1dfa9e";
const neonPurple = "#b535f6";

// Funkcja tworząca Izometrycznego Agenta (inspirowane grafiką)
const createIsoIcon = (color, status) => L.divIcon({
  className: 'iso-marker',
  html: `
    <div style="position: relative; width: 50px; height: 60px;">
      ${status ? `<div style="position: absolute; top: -40px; left: -20px; background: #0d1117; border: 2px solid ${color}; color: ${color}; padding: 2px 8px; font-size: 14px; white-space: nowrap; shadow: 4px 4px 0px #000; z-index: 100;">${status}</div>` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg); width: 40px; height: 40px; border: 3px solid ${color}; border-radius: 50%; box-shadow: 0 0 15px ${color};"></div>
      <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 25px; height: 45px; background: ${color}; border: 3px solid white; box-shadow: 0 0 10px ${color};">
        <div style="width: 100%; height: 15px; background: rgba(0,0,0,0.3);"></div>
      </div>
    </div>
  `,
  iconSize: [50, 60],
  iconAnchor: [25, 55]
});

// --- KOMPONENT SIATKI IZOMETRYCZNEJ ---
const GeoGrid = ({ pos }) => {
  const map = useMap();
  if (!pos) return null;
  const lines = [];
  const step = 0.0006; 
  for (let i = -12; i <= 12; i++) {
    lines.push([[pos.lat + (step * 12), pos.lng + (step * i)], [pos.lat - (step * 12), pos.lng + (step * i)]]);
    lines.push([[pos.lat + (step * i), pos.lng + (step * 12)], [pos.lat + (step * i), pos.lng - (step * 12)]]);
  }
  return lines.map((l, i) => <Polyline key={i} positions={l} pathOptions={{ color: neonGreen, weight: 1, opacity: 0.15 }} />);
};

const App = () => {
  const [userPos, setUserPos] = useState(null);
  const [view, setView] = useState('MAP');
  const [agents] = useState([
    { id: 1, name: "Master_Leon", pos: [50.0348, 19.2210], msg: "SPRZEDAM ROWER" },
    { id: 2, name: "Cyber_Ewa", pos: [50.0355, 19.2190], msg: "Szukam ekipy na raid" }
  ]);

  useEffect(() => {
    Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
      if (pos) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  const uiBox = "bg-black/80 border-2 border-[#1dfa9e] shadow-[4px_4px_0px_#000] p-2 text-[#1dfa9e]";
  const btnStyle = "border-2 border-[#1dfa9e] p-2 hover:bg-[#1dfa9e] hover:text-black transition-all uppercase font-bold text-sm";

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col overflow-hidden text-[18px]">
      <Toaster richColors theme="dark" />

      {/* AGENT HUD */}
      <header className="p-4 z-[2000] flex justify-between items-center bg-black/60 backdrop-blur-md border-b-2 border-[#1dfa9e]/30">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 border-2 border-[#1dfa9e] flex items-center justify-center font-black text-xl shadow-[0_0_10px_#1dfa9e]">GV</div>
          <div>
            <h1 className="text-[#1dfa9e] leading-tight tracking-widest font-black">AGENT_PROFILER</h1>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500 uppercase italic">Oświęcim_Sector</span>
              <div className="h-1 w-20 bg-gray-800 rounded-full overflow-hidden border border-[#1dfa9e]/30">
                <div className="h-full bg-[#1dfa9e]" style={{width: '65%'}}></div>
              </div>
            </div>
          </div>
        </div>
        <Search className="text-[#1dfa9e]" />
      </header>

      {/* MAPA / MAIN ENGINE */}
      <main className="flex-1 relative border-x-4 border-black">
        {view === 'MAP' && userPos && (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full grayscale-[0.8] opacity-80">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <GeoGrid pos={userPos} />
            
            {/* GRACZ */}
            <Marker position={[userPos.lat, userPos.lng]} icon={createIsoIcon(neonGreen, "TO TY")} />

            {/* INNI GRACZE */}
            {agents.map(a => (
              <Marker key={a.id} position={a.pos} icon={createIsoIcon(neonPurple, a.msg)}>
                <Popup>
                  <div className="p-2 font-mono">
                    <p className="font-black text-lg underline">{a.name}</p>
                    <p className="mt-2 text-sm italic">Status: {a.msg}</p>
                    <button className={`${btnStyle} mt-4 w-full`}>NAWIĄŻ KONTAKT</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {/* PLACEHOLDERY DLA RESZTY WIDOKÓW */}
        {view !== 'MAP' && (
          <div className="p-6 bg-black h-full overflow-y-auto">
            <div className={uiBox}>
              <h2 className="text-2xl font-black mb-4 underline">MODUŁ: {view}</h2>
              <p className="mb-6 opacity-70 italic font-mono text-sm">Przeszukiwanie bazy danych sektora Oświęcim... Brak aktywnych błędów.</p>
              <div className="grid gap-4">
                {[1,2,3].map(i => (
                  <div key={i} className="border border-[#1dfa9e]/30 p-4 flex justify-between items-center">
                    <span>DANE_STRUKTURALNE_{i}</span>
                    <button className={btnStyle}>OTWÓRZ</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CYBER-NAVBAR */}
      <footer className="p-4 bg-black border-t-4 border-[#1dfa9e]/20 z-[2000] flex justify-around">
        <button onClick={() => setView('MAP')} className={`flex flex-col items-center gap-1 ${view === 'MAP' ? 'text-[#1dfa9e]' : 'text-gray-600'}`}>
          <MapPin size={24} />
          <span className="text-[10px] font-bold">RADAR</span>
        </button>
        <button onClick={() => setView('MARKET')} className={`flex flex-col items-center gap-1 ${view === 'MARKET' ? 'text-[#1dfa9e]' : 'text-gray-600'}`}>
          <ShoppingBag size={24} />
          <span className="text-[10px] font-bold">RYNEK</span>
        </button>
        <button onClick={() => setView('CHAT')} className={`flex flex-col items-center gap-1 ${view === 'CHAT' ? 'text-[#1dfa9e]' : 'text-gray-600'}`}>
          <MessageSquare size={24} />
          <span className="text-[10px] font-bold">LINK</span>
        </button>
        <button onClick={() => setView('PROFILE')} className={`flex flex-col items-center gap-1 ${view === 'PROFILE' ? 'text-[#1dfa9e]' : 'text-gray-600'}`}>
          <User size={24} />
          <span className="text-[10px] font-bold">AGENT</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
