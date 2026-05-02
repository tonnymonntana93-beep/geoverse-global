import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MessageSquare, ShoppingBag, Map as MapIcon, User, PlusSquare, Send } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- PIXEL ART ASSETS ---
const pixelIcon = (color) => L.divIcon({
  className: 'pixel-marker',
  html: `<div style="width:20px; height:20px; background:${color}; border:3px solid black; box-shadow: 3px 3px 0px rgba(0,0,0,0.4);"></div>`,
  iconSize: [20, 20]
});

const App = () => {
  const [userPos, setUserPos] = useState(null);
  const [view, setView] = useState('MAP');
  const [balance, setBalance] = useState(100);
  const [items, setItems] = useState([
    { id: 1, type: 'MARKET', pos: [50.034, 19.219], title: "Klawiatura Retro", price: "50 $G", seller: "PixelBob" },
    { id: 2, type: 'SOCIAL', pos: [50.036, 19.222], title: "Spotkanie fanów AI", user: "Ada_Lovelace" }
  ]);

  useEffect(() => {
    Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
      if (pos) setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
  }, []);

  // Stylizacja Pixel-Art dla komponentów
  const pixelBox = "bg-[#c0c0c0] border-4 border-t-white border-l-white border-b-[#808080] border-r-[#808080] p-2 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
  const pixelButton = "bg-[#000080] text-white border-2 border-t-[#4040ff] border-l-[#4040ff] p-1 px-3 active:border-t-black active:border-l-black hover:bg-[#0000a0] transition-all text-[10px] uppercase font-bold";

  return (
    <div className="h-screen w-screen bg-[#313131] font-mono text-xs flex flex-col overflow-hidden select-none">
      <Toaster richColors />

      {/* PASEK GÓRNY (DASHBOARD) */}
      <div className={`${pixelBox} m-2 flex justify-between items-center z-[3000]`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#ffff00] border-2 border-black flex items-center justify-center font-black italic text-black shadow-inner">G</div>
          <div>
            <p className="text-[8px] font-bold">PORTFEL:</p>
            <p className="text-sm font-black text-[#008000]">{balance} $G-BIT</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[8px] font-bold">STATUS:</p>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-2 h-2 bg-[#00ff00] animate-pulse border border-black"></div>
            <span className="font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* EKRAN GŁÓWNY */}
      <main className="flex-1 relative overflow-hidden m-2 border-4 border-black">
        {view === 'MAP' && userPos && (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={15} zoomControl={false} className="h-full w-full grayscale-[0.3]">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            
            {/* GRACZ */}
            <Marker position={[userPos.lat, userPos.lng]} icon={pixelIcon('#00ff00')} />

            {/* OGŁOSZENIA NA MAPIE */}
            {items.map(item => (
              <Marker key={item.id} position={item.pos} icon={pixelIcon(item.type === 'MARKET' ? '#ff00ff' : '#00ffff')}>
                <Popup className="pixel-popup">
                  <div className={pixelBox}>
                    <p className="font-bold text-[10px]">{item.title}</p>
                    <p className="text-[#008000] font-black">{item.price || item.user}</p>
                    <button className={`${pixelButton} mt-2 w-full`}>WIADOMOŚĆ</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        {view === 'MARKET' && (
          <div className="h-full bg-[#808080] p-4 overflow-y-auto space-y-4">
            <h2 className="font-black text-lg shadow-sm">LOCAL_MARKET.EXE</h2>
            <div className={pixelBox}>
              <div className="flex gap-4">
                <div className="w-16 h-16 bg-white border-2 border-black flex items-center justify-center text-[8px]">IMAGE_NA</div>
                <div className="flex-1">
                  <p className="font-black">VINTAGE MONITOR</p>
                  <p className="text-[#008000]">250 $G</p>
                  <button className={`${pixelButton} mt-1`}>KUP TERAZ</button>
                </div>
              </div>
            </div>
            <button className={`${pixelButton} w-full py-4 flex items-center justify-center gap-2 text-sm`}>
              <PlusSquare size={16} /> WYSTAW PRZEDMIOT
            </button>
          </div>
        )}

        {view === 'CHAT' && (
          <div className="h-full bg-white flex flex-col p-2 border-4 border-[#808080]">
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              <div className="bg-[#e0e0e0] p-2 self-start max-w-[80%] border-2 border-black">Siema! Widzę, że wystawiłeś klawiaturę?</div>
              <div className="bg-[#000080] text-white p-2 ml-auto max-w-[80%] border-2 border-black">Tak, sprawna w 100%. Odbiór przy rynku.</div>
            </div>
            <div className="flex gap-2 p-2 bg-[#808080] border-t-2 border-black">
              <input className="flex-1 p-2 border-2 border-black outline-none" placeholder="Pisz tutaj..." />
              <button className={pixelButton}><Send size={14} /></button>
            </div>
          </div>
        )}
      </main>

      {/* MENU DOLNE */}
      <nav className="p-2 flex justify-between gap-2 bg-[#c0c0c0] border-t-4 border-black">
        <button onClick={() => setView('MAP')} className={`${pixelButton} flex-1 flex flex-col items-center py-2 ${view === 'MAP' ? 'bg-[#000050]' : ''}`}>
          <MapIcon size={18} />
          <span className="mt-1">MAPA</span>
        </button>
        <button onClick={() => setView('MARKET')} className={`${pixelButton} flex-1 flex flex-col items-center py-2 ${view === 'MARKET' ? 'bg-[#000050]' : ''}`}>
          <ShoppingBag size={18} />
          <span className="mt-1">MARKET</span>
        </button>
        <button onClick={() => setView('CHAT')} className={`${pixelButton} flex-1 flex flex-col items-center py-2 ${view === 'CHAT' ? 'bg-[#000050]' : ''}`}>
          <MessageSquare size={18} />
          <span className="mt-1">CZAT</span>
        </button>
        <button onClick={() => setView('PROFILE')} className={`${pixelButton} flex-1 flex flex-col items-center py-2`}>
          <User size={18} />
          <span className="mt-1">PROFIL</span>
        </button>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        .pixel-popup .leaflet-popup-content-wrapper { background: transparent; border: none; box-shadow: none; }
        .pixel-popup .leaflet-popup-tip { display: none; }
        * { image-rendering: pixelated; }
      `}} />
    </div>
  );
};

export default App;
          
