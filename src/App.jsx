import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast, Toaster } from 'sonner';

const userIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div class="w-8 h-8 bg-[#00f3ff] rounded-full border-4 border-white shadow-[0_0_20px_#00f3ff] animate-pulse"></div>`,
  iconSize: [32, 32]
});

const App = () => {
  const [userPos, setUserPos] = useState(null);
  const [gpsStatus, setGpsStatus] = useState("Oczekiwanie na aktywację...");

  const requestGps = async () => {
    try {
      setGpsStatus("Proszę o uprawnienia...");
      const perm = await Geolocation.requestPermissions();
      
      if (perm.location === 'granted') {
        setGpsStatus("Szukam satelitów (wyjdź do okna/na zewnątrz)...");
        const watchId = await Geolocation.watchPosition({
          enableHighAccuracy: true,
          timeout: 20000
        }, (pos, err) => {
          if (err) {
            setGpsStatus(`Błąd: ${err.message}`);
            toast.error("Błąd GPS: " + err.message);
          } else if (pos) {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setGpsStatus("POŁĄCZONO");
          }
        });
      } else {
        setGpsStatus("Odrzucono dostęp do GPS");
      }
    } catch (e) {
      setGpsStatus("Błąd krytyczny: " + e.message);
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col font-mono">
      <Toaster richColors />
      
      {/* STATUS GPS */}
      <div className="p-4 bg-[#111] border-b border-[#333] z-[3000]">
        <h1 className="text-[#00f3ff] text-xs font-black italic">GEOVERSE SYSTEM</h1>
        <p className="text-[10px] text-gray-500 mt-1">STATUS: {gpsStatus}</p>
        
        {!userPos && (
          <button 
            onClick={requestGps}
            className="mt-2 w-full bg-[#00f3ff] text-black text-[10px] font-bold py-2 rounded uppercase"
          >
            Aktywuj Radar GPS
          </button>
        )}
      </div>

      {userPos ? (
        <MapContainer center={[userPos.lat, userPos.lng]} zoom={16} zoomControl={false} className="flex-1">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
        </MapContainer>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-50">
          <div className="w-10 h-10 border-2 border-[#00f3ff] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-[10px]">OCZEKIWANIE NA SYGNAŁ Z URZĄDZENIA...</p>
        </div>
      )}
    </div>
  );
};

export default App;
