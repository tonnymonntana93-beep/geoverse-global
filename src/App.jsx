import React, { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { toast, Toaster } from 'sonner';

const userIcon = L.divIcon({
  className: 'bg-transparent',
  html: `<div class="w-6 h-6 bg-[#00f3ff] rounded-full border-2 border-white shadow-[0_0_15px_#00f3ff] animate-pulse"></div>`,
  iconSize: [24, 24]
});

const App = () => {
  const [userPos, setUserPos] = useState(null);
  const [errorInfo, setErrorInfo] = useState("Inicjalizacja...");

  useEffect(() => {
    const startTracking = async () => {
      try {
        // KROK 1: Sprawdzenie uprawnień
        const perm = await Geolocation.checkPermissions();
        setErrorInfo(`Uprawnienia: ${perm.location}`);

        if (perm.location !== 'granted') {
          const req = await Geolocation.requestPermissions();
          if (req.location !== 'granted') {
            setErrorInfo("BRAK ZGODY NA GPS W SYSTEMIE");
            return;
          }
        }

        // KROK 2: Próba pobrania pozycji
        setErrorInfo("Czekam na pierwszy sygnał satelity...");
        
        await Geolocation.watchPosition({
          enableHighAccuracy: false, // Zmieniamy na false - szybciej łapie w budynkach
          timeout: 15000
        }, (pos, err) => {
          if (err) {
            setErrorInfo(`BŁĄD GPS: ${err.message}`);
          } else if (pos) {
            setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setErrorInfo(null); // Sukces
          }
        });

      } catch (e) {
        setErrorInfo(`Błąd krytyczny: ${e.message}`);
      }
    };

    startTracking();
  }, []);

  return (
    <div className="h-screen w-screen bg-[#050505] text-white font-mono flex flex-col">
      <Toaster richColors />
      
      {/* PASEK STATUSU (DIAGNOSTYKA) */}
      {errorInfo && (
        <div className="absolute top-20 left-4 right-4 z-[3000] bg-red-900/80 p-4 border border-red-500 rounded text-[10px]">
          <p className="font-bold uppercase">Status Systemu:</p>
          <p className="text-red-200 mt-1">{errorInfo}</p>
          <p className="mt-2 text-gray-400 italic">Podpowiedź: Upewnij się, że masz włączony GPS w górnym menu telefonu.</p>
        </div>
      )}

      {userPos ? (
        <MapContainer center={[userPos.lat, userPos.lng]} zoom={16} zoomControl={false} className="flex-1">
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          <Marker position={[userPos.lat, userPos.lng]} icon={userIcon} />
        </MapContainer>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="w-12 h-12 border-4 border-[#00f3ff] border-t-transparent rounded-full animate-spin mb-4"></div>
          <h1 className="text-[#00f3ff] text-xs tracking-widest uppercase">Szukanie Twojej pozycji...</h1>
        </div>
      )}
    </div>
  );
};

export default App;
