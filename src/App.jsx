import React, { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, update, serverTimestamp } from "firebase/database";
import { MessageSquare, MapPin, User, Package, Send, ShoppingCart, Shield } from 'lucide-react';
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

const isoIcon = (color, label) => L.divIcon({
  className: 'iso-marker',
  html: `<div style="position: relative; width: 40px; height: 50px;">
      ${label ? `<div style="position: absolute; top: -35px; left: -10px; background: #000; border: 1px solid ${color}; color: ${color}; padding: 2px 6px; font-size: 10px; white-space: nowrap; box-shadow: 3px 3px 0px #000; z-index: 1000;">${label}</div>` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg); width: 30px; height: 30px; border: 2px solid ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>
      <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); width: 18px; height: 35px; background: ${color}; border: 2px solid white;"></div>
    </div>`,
  iconSize: [40, 50],
  iconAnchor: [20, 45]
});

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
    { id: 'm3', name: 'Zestaw Naprawczy', price: 80, img: '🔧' }
  ];

  useEffect(() => {
    const saved = localStorage.getItem('gv_user');
    if (saved) setUser(JSON.parse(saved));

    Geolocation.watchPosition({ enableHighAccuracy: true }, (pos) => {
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
        lastSeen: serverTimestamp()
      });
    }
  }, [user, userPos]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    push(ref(db, 'messages'), {
      sender: user.name,
      text: inputText,
      timestamp: serverTimestamp()
    });
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

  if (!user) return (
    <div className="h-screen bg-black flex items-center justify-center p-6 text-[#1dfa9e] font-mono">
      <div className="border-4 border-[#1dfa9e] p-8 bg-[#0d1117] shadow-[10px_10px_0px_#000] w-full">
        <h1 className="text-3xl font-black mb-6 italic border-b-2 border-[#1dfa9e]">AUTORYZACJA...</h1>
        <form onSubmit={(e) => {
          e.preventDefault();
          const newUser = { id: 'AG_' + Date.now(), name: e.target.name.value, balance: 1000 };
          setUser(newUser);
          localStorage.setItem('gv_user', JSON.stringify(newUser));
        }}>
          <input name="name" className="w-full bg-black border-2 border-[#1dfa9e] p-3 mb-4 outline-none text-[#1dfa9e]" required placeholder="KRYPTONIM" />
          <button className="w-full bg-[#1dfa9e] text-black font-black p-4 uppercase">Inicjalizuj</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#050505] text-[#1dfa9e] font-mono overflow-hidden text-xs">
      <Toaster richColors position="top-center" />
      
      <header className="p-3 border-b-2 border-[#1dfa9e]/20 flex justify-between items-center bg-black z-20">
        <div className="flex items-center gap-2">
          <Shield size={20} className="animate-pulse" />
          <p className="font-black text-sm tracking-widest uppercase">{user.name}</p>
        </div>
        <p className="font-black text-[#ffff00]">{user.balance} $G</p>
      </header>

      <main className="flex-1 relative">
        {view === 'MAP' && userPos && (
          <MapContainer center={[userPos.lat, userPos.lng]} zoom={17} zoomControl={false} className="h-full w-full grayscale">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
            <Marker position={[userPos.lat, userPos.lng]} icon={isoIcon('#1dfa9e', 'TY')} />
            {Object.entries(agents).map(([id, data]) => (
              id !== user.id && <Marker key={id} position={[data.pos.lat, data.pos.lng]} icon={isoIcon('#b535f6', data.name)} />
            ))}
          </MapContainer>
        )}

        {view === 'CHAT' && (
          <div className="h-full flex flex-col bg-[#0d1117] p-2">
            <div className="flex-1 overflow-y-auto space-y-2 mb-2">
              {messages.map((m, i) => (
                <div key={i} className="p-2 border border-[#1dfa9e]/20 bg-white/5">
                  <p className="text-[9px] font-bold opacity-50">{m.sender}</p>
                  <p>{m.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2 border-t border-[#1dfa9e]/30 pt-2">
              <input value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder="TREŚĆ..." className="flex-1 bg-black p-2 outline-none border border-[#1dfa9e]/30" />
              <button className="bg-[#1dfa9e] text-black px-4"><Send size={16} /></button>
            </form>
          </div>
        )}

        {view === 'MARKET' && (
          <div className="p-4 space-y-3 h-full overflow-y-auto">
            {marketItems.map(item => (
              <div key={item.id} className="border-2 border-[#1dfa9e]/20 p-3 flex justify-between items-center bg-black">
                <span className="text-2xl">{item.img}</span>
                <div className="flex-1 px-4">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-[#ffff00]">{item.price} $G</p>
                </div>
                <button onClick={() => buyItem(item)} className="bg-[#1dfa9e] text-black font-bold px-4 py-2 uppercase text-[10px]">Kup</button>
              </div>
            ))}
          </div>
        )}

        {view === 'INVENTORY' && (
          <div className="p-4 h-full grid grid-cols-3 gap-2 content-start">
            {inventory.map((item, i) => (
              <div key={i} className="aspect-square border-2 border-[#1dfa9e]/20 flex flex-col items-center justify-center bg-black">
                <span className="text-2xl">{item.img}</span>
                <span className="text-[8px] text-center">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="p-4 bg-black border-t-2 border-[#1dfa9e]/20 flex justify-around items-center z-20">
        <button onClick={() => setView('MAP')} className={view === 'MAP' ? 'text-[#1dfa9e]' : 'text-gray-600'}><MapPin size={24} /></button>
        <button onClick={() => setView('CHAT')} className={view === 'CHAT' ? 'text-[#1dfa9e]' : 'text-gray-600'}><MessageSquare size={24} /></button>
        <button onClick={() => setView('MARKET')} className={view === 'MARKET' ? 'text-[#1dfa9e]' : 'text-gray-600'}><ShoppingCart size={24} /></button>
        <button onClick={() => setView('INVENTORY')} className={view === 'INVENTORY' ? 'text-[#1dfa9e]' : 'text-gray-600'}><Package size={24} /></button>
      </footer>
    </div>
  );
};

export default App;
            
