'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, MapPin, User, Wrench, Phone } from 'lucide-react';

// Fix for default marker icons in Leaflet with Next.js
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const ShopIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Carbonne Coordinates
const SHOP_COORDS: [number, number] = [43.2974, 1.2268];

interface MapAdminProps {
  date: string;
}

export default function MapAdmin({ date }: MapAdminProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/map/appointments?date=${date}`);
        const data = await res.json();
        if (res.ok) {
          setAppointments(data);
        }
      } catch (err) {
        console.error('Error loading map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [date]);

  if (loading) {
    return (
      <div className="h-[500px] w-full bg-slate-100 rounded-3xl flex items-center justify-center border border-slate-200">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[500px] w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <MapContainer 
        center={SHOP_COORDS} 
        zoom={11} 
        scrollWheelZoom={false} 
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Magasin */}
        <Marker position={SHOP_COORDS} icon={ShopIcon}>
          <Popup>
            <div className="font-bold">ELECTRO&apos;FIX Magasin</div>
            <p className="text-xs">3 Av. Jean Monnet, Carbonne</p>
          </Popup>
        </Marker>

        {/* Rendez-vous */}
        {appointments.map((app) => (
          <Marker 
            key={app.id} 
            position={[app.latitude, app.longitude]}
          >
            <Popup className="min-w-[200px]">
              <div className="space-y-2 py-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <User className="w-4 h-4" /> 
                  {app.profiles.first_name} {app.profiles.last_name}
                </div>
                <div className="flex items-center gap-2 text-sm text-primary font-bold">
                  <Wrench className="w-4 h-4" />
                  {app.services?.name}
                </div>
                <div className="text-xs text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200">
                   {app.time.slice(0, 5)} - {app.client_address}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Phone className="w-3 h-3" /> {app.client_phone}
                </div>
                <div className="pt-2">
                  <button className="w-full bg-slate-900 text-white text-xs font-bold py-2 rounded-md hover:bg-slate-800 transition-all">
                    Assigner à un technicien
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
