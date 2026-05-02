import React, { useState, useEffect, useRef } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, push, set, update, serverTimestamp } from "firebase/database";
import { ShoppingBag, MessageSquare, MapPin, User, Package, Send, ShoppingCart } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// --- KONFIGURACJA FIREBASE ---
const firebaseConfig = {
  apiKey: "BM1VxAtBCrkFr7fL5xYlaQF26MioB6LQjsMyCw09GZxURi1pBNCFaXS48aHe_CNakn-snN5hb7R2VBQkIDHF8tA",
  authDomain: "geoverse-global.firebaseapp.com",
  databaseURL: "https://geoverse-global-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "geoverse-global",
  storageBucket: "geoverse-global.appspot.com",
  appId: "1:221084205561:web:5317789304620663" // Przykładowe ID, jeśli masz inne w konsoli, podmień je
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- IKONA AGENTA (IZOMETRYCZNA) ---
const isoIcon = (color, label) => L.divIcon({
  className: 'iso-marker',
  html: `
    <div style="position: relative; width: 40px; height: 50px;">
      ${label ? `<div style="position: absolute; top: -35px; left: -10px; background: #000; border: 1px solid ${color}; color: ${color}; padding: 2px 6px; font-size: 10px; white-space: nowrap; shadow: 3px 3px 0px #000; z-index: 1000;">${label}</div>` : ''}
      <div style="position: absolute; bottom: 0; left: 50%; transform: translateX(-50%) rotateX(60deg); width: 30px; height: 30px; border: 2px solid ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>
      <div style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); width: 18px; height: 35px; background: ${color}; border: 2px solid white;"></div>
    </div>
  `,
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

  // System Marketu (Cyber-Pixel)
  const [inventory, setInventory] = useState([]);
  const [marketItems] = useState([
    { id:
      
