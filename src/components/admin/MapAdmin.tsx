'use client';

import { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, Navigation, MapPin, User, Wrench, Phone, Clock } from 'lucide-react';

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

const ActiveIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Carbonne Coordinates
const SHOP_COORDS: [number, number] = [43.3090742, 1.2198470];

interface MapAdminProps {
  date: string;
}

export default function MapAdmin({ date }: MapAdminProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetAppId, setTargetAppId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<'current' | 'next' | null>(null);
  
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});

  useEffect(() => {
    const fetchMapData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/map/appointments?date=${date}`);
        const data = await res.json();
        if (res.ok) {
          // Sort appointments by time
          const sorted = data.sort((a: any, b: any) => a.time.localeCompare(b.time));
          setAppointments(sorted);

          // Logic to find current or next appointment
          const now = new Date();
          // Adjust timezone if needed, here we assume local time matches
          const isToday = date === now.toISOString().split('T')[0];
          
          if (isToday && sorted.length > 0) {
            const currentMins = now.getHours() * 60 + now.getMinutes();
            let foundCurrent = false;

            // 1. Check for "current" appointment (started less than 60 mins ago)
            for (const app of sorted) {
              const [h, m] = app.time.split(':').map(Number);
              const appMins = h * 60 + m;
              if (currentMins >= appMins && currentMins < appMins + 60) {
                setTargetAppId(app.id);
                setTargetStatus('current');
                foundCurrent = true;
                break;
              }
            }

            // 2. If no current, check for "next" appointment
            if (!foundCurrent) {
              for (const app of sorted) {
                const [h, m] = app.time.split(':').map(Number);
                const appMins = h * 60 + m;
                if (appMins >= currentMins) {
                  setTargetAppId(app.id);
                  setTargetStatus('next');
                  break;
                }
              }
            }
          } else {
            setTargetAppId(null);
            setTargetStatus(null);
          }
        }
      } catch (err) {
        console.error('Error loading map data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [date]);

  // Auto-open popup for the target appointment
  useEffect(() => {
    if (targetAppId && markerRefs.current[targetAppId]) {
      // Slight delay to ensure Leaflet has finished rendering the marker
      setTimeout(() => {
        markerRefs.current[targetAppId]?.openPopup();
      }, 300);
    }
  }, [targetAppId, appointments]);

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
        {appointments.map((app) => {
          const isActive = app.id === targetAppId;

          return (
            <Marker 
              key={app.id} 
              position={[app.latitude, app.longitude]}
              icon={isActive ? ActiveIcon : DefaultIcon}
              ref={(m) => {
                if (m) {
                  markerRefs.current[app.id] = m;
                }
              }}
            >
              <Popup className="min-w-[200px]">
                <div className="space-y-2 py-1">
                  
                  {isActive && targetStatus && (
                    <div className={`text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-md inline-block ${targetStatus === 'current' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                      <Clock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                      {targetStatus === 'current' ? 'Intervention en cours' : 'Prochaine intervention'}
                    </div>
                  )}

                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    <User className="w-4 h-4" /> 
                    {app.profiles.first_name} {app.profiles.last_name}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-primary font-bold">
                    <Wrench className="w-4 h-4 min-w-[16px]" />
                    <span>
                      {app.equipment_types?.equipment_categories?.name ? `${app.equipment_types.equipment_categories.name} - ` : ''}
                      {app.equipment_types?.name || app.services?.name}
                    </span>
                  </div>
                  {app.material_issue && (
                    <div className="text-xs text-slate-600 italic line-clamp-2 pl-6 border-l-2 border-slate-200 py-0.5">
                      "{app.material_issue}"
                    </div>
                  )}
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
          );
        })}
      </MapContainer>
    </div>
  );
}
