import { useState } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl';
import { Map, Marker, NavigationControl, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface EventMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  date: string;
  location?: string;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: EventMarker[];
}

export function MapView({ center = [18.0649, 59.3293], zoom = 11, markers = [] }: MapViewProps) {
  const [selectedMarker, setSelectedMarker] = useState<EventMarker | null>(null);
  const [viewport, setViewport] = useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoom
  });

  return (
    <Map
      {...viewport}
      onMove={(evt: ViewStateChangeEvent) => setViewport(evt.viewState)}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />
      
      {markers.map((marker) => (
        <Marker
          key={marker.id}
          latitude={marker.latitude}
          longitude={marker.longitude}
          onClick={(e: { originalEvent: MouseEvent }) => {
            e.originalEvent.stopPropagation();
            setSelectedMarker(marker);
          }}
        >
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#4CAF50',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
          />
        </Marker>
      ))}

      {selectedMarker && (
        <Popup
          latitude={selectedMarker.latitude}
          longitude={selectedMarker.longitude}
          anchor="bottom"
          onClose={() => setSelectedMarker(null)}
          closeButton={true}
          closeOnClick={false}
        >
          <div style={{ padding: '8px' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>{selectedMarker.title}</h3>
            <p style={{ margin: '0 0 4px 0', color: '#666' }}>{selectedMarker.date}</p>
            {selectedMarker.location && (
              <p style={{ 
                margin: '0',
                color: '#666',
                fontSize: '0.9em',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <svg 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  style={{ minWidth: '12px' }}
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
                {selectedMarker.location}
              </p>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}