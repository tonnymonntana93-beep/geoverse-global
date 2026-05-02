import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Compass, User, EyeOff, ListTodo } from 'lucide-react';
import { toast, Toaster } from 'sonner';

const userIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div class="w-6 h-6 bg-[#00f3ff] rounded-full border-2 border-white shadow-[0_0_15px_#00f3ff] animate-pulse"></div>`,
  iconSize: [24, 24]
});

const MapController = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16); }, [center, map]);
  return null;
};

const App = () => {
  const [userPos, setUserPos] = useState(null);
  const [view, setView] = useState('MAP'); // MAP lub QUESTS
  const [ghostMode, setGhostMode] = useState(false);

    useEffect(() => {
    const initGPS = async () => {
      try {
        // 1. Sprawdź i poproś o uprawnienia
        const perm = await Geolocation.checkPermissions();
        
        if (perm.location !== 'granted') {
          const request = await Geolocation.requestPermissions();
          if (request.location !== 'granted') {
            toast.error("Aplikacja potrzebuje zgody na GPS, aby działać!");
            return;
          }
        }

        // 2. Zacznij śledzenie
        await Geolocation.watchPosition({ 
          enableHighAccuracy: true, // Wymuś wysoką dokładność
          timeout: 10000            // Czekaj max 10 sekund
        }, (pos, err) => {
          if (err) {
            console.error(err);
            toast.error("Błąd GPS: " + err.message);
            return;
          }
          if (pos) {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          }
        });
      } catch (e) {
        toast.error("Nie udało się zainicjować modułu GPS.");
      }
    };
    initGPS();
  }, []);
  

  const toggleGhost = () => {
    setGhostMode(!ghostMode);
    toast.info(ghostMode ? "Jesteś widoczny na mapie." : "Tryb Ducha: Włączony.");
  };

  return (
    <div className="h-screen w-screen bg-[#050505] flex flex-col relative overflow-hidden">
      <Toaster richColors theme="dark" />
      
      {/* NAGŁÓWEK */}
      <header className="absolute top-0 left-0 right-0 z-[2000] p-4 bg-black/80 border-b border-white/10 backdrop-blur-md flex justify-between items-center">
        <h1 className="text-lg font-black text-[#00f3ff] tracking-widest">GEOVERSE</h1>
        <div className="flex gap-2">
          <button onClick={toggleGhost} className={`p-2 rounded-md border ${ghostMode ? 'border-red-500 text-red-500' : 'border-[#00f3ff] text-[#00f3ff]'}`}>
            <EyeOff size={18} />
          </button>
          <div className="p-2 border border-white/20 rounded-md bg-white/5">
            <User size={18} />
          </div>
        </div>
      </header>

      {/* OBSZAR GŁÓWNY */}
      <main className="flex-1 mt-[70px] relative">
        {view === 'MAP' && (
          userPos ? (
            <MapContainer center={[userPos.lat, userPos.lng]} zoom={16} zoomControl={false} className="w-full h-full">
              <MapController center={[userPos.lat, userPos.lng]} />
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {!ghostMode && <Marker position={[userPos.lat, userPos.lng]} icon={userIcon}><Popup>Twoja pozycja</Popup></Marker>}
            </MapContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-[#00f3ff] text-xs animate-pulse">TRWA ŁĄCZENIE Z SATELITĄ...</div>
          )
        )}

        {view === 'QUESTS' && (
          <div className="p-4 h-full overflow-y-auto pb-24">
            <h2 className="text-[#00f3ff] border-b border-gray-700 pb-2 mb-4">LOKALNE ZLECENIA (P2P)</h2>
            <div className="bg-[#111] border border-gray-800 p-4 mb-3 rounded-sm pixel-border">
              <p className="text-yellow-400 font-bold text-sm">[KURIER] Przynieś mi kawę</p>
              <p className="text-xs text-gray-400 mt-1">Dystans: 300m | Zleca: Master_Leon</p>
              <button className="mt-3 w-full bg-[#b535f6] text-white py-2 text-xs uppercase active:scale-95 transition-transform">Akceptuj (Nagroda: 15 PLN)</button>
            </div>
            <div className="bg-[#111] border border-gray-800 p-4 mb-3 rounded-sm pixel-border">
              <p className="text-[#00f3ff] font-bold text-sm">[HANDEL] Sprzedam Rower</p>
              <p className="text-xs text-gray-400 mt-1">Dystans: 800m | Wystawia: Anna_92</p>
              <button className="mt-3 w-full bg-transparent border border-[#00f3ff] text-[#00f3ff] py-2 text-xs uppercase active:scale-95 transition-transform">Otwórz Czat</button>
            </div>
          </div>
        )}
      </main>

      {/* NAWIGACJA DOLNA */}
      <footer className="absolute bottom-0 left-0 right-0 z-[2000] bg-black border-t border-white/10 flex justify-around p-3">
        <button onClick={() => setView('MAP')} className={`flex flex-col items-center ${view === 'MAP' ? 'text-[#00f3ff]' : 'text-gray-600'}`}>
          <Compass size={24} />
          <span className="text-[10px] mt-1">MAPA</span>
        </button>
        <button onClick={() => setView('QUESTS')} className={`flex flex-col items-center ${view === 'QUESTS' ? 'text-[#b535f6]' : 'text-gray-600'}`}>
          <ListTodo size={24} />
          <span className="text-[10px] mt-1">QUESTY</span>
        </button>
      </footer>
    </div>
  );
};

export default App;
      
