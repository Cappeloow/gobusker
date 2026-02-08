import { useState, useEffect } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl';
import { Map, Marker } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    // First try using Mapbox Geocoding API
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address`
    );
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      return feature.place_name; // This includes street address and city
    }

    // Fallback to OpenStreetMap if Mapbox doesn't return results
    const osmResponse = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
    );
    const osmData = await osmResponse.json();
    
    const address = osmData.address;
    const parts = [];

    // Build detailed address
    if (address?.road || address?.street) {
      parts.push(address.road || address.street);
      if (address.house_number) {
        parts[0] += ` ${address.house_number}`;
      }
    }
    
    if (address?.suburb) {
      parts.push(address.suburb);
    }
    
    if (address?.city || address?.town || address?.village) {
      parts.push(address.city || address.town || address.village);
    }
    
    if (address?.postcode) {
      parts.push(address.postcode);
    }

    return parts.join(', ') || 'Unknown location';
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    return 'Unknown location';
  }
}

interface LocationSelectMapProps {
  onLocationSelect: (location: { latitude: number; longitude: number; place_name?: string }) => void;
  initialLocation?: { latitude: number; longitude: number };
  onPlaceNameChange?: (placeName: string) => void;
  placeName?: string;
}

export function LocationSelectMap({ onLocationSelect, initialLocation, onPlaceNameChange, placeName = '' }: LocationSelectMapProps) {
  const [markerPosition, setMarkerPosition] = useState(initialLocation || {
    latitude: 59.3293,
    longitude: 18.0686
  });

  const [viewport, setViewport] = useState({
    latitude: initialLocation?.latitude || 59.3293,
    longitude: initialLocation?.longitude || 18.0686,
    zoom: 11
  });

  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const handleMapClick = async (event: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = event.lngLat;
    setMarkerPosition({ latitude: lat, longitude: lng });
    const place_name = await reverseGeocode(lat, lng);
    onLocationSelect({ latitude: lat, longitude: lng, place_name });
  };

  return (
    <div className="w-full h-[300px] relative rounded-lg overflow-hidden border border-light-border dark:border-github-border">
      <Map
        {...viewport}
        onClick={handleMapClick}
        onMove={(evt: ViewStateChangeEvent) => setViewport(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle={isDarkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <Marker
          latitude={markerPosition.latitude}
          longitude={markerPosition.longitude}
          draggable
          onDragEnd={(event) => {
            const { lat, lng } = event.lngLat;
            setMarkerPosition({ latitude: lat, longitude: lng });
            onLocationSelect({ latitude: lat, longitude: lng });
          }}
        >
          <div className="w-6 h-6 bg-green-500 border-2 border-white rounded-full cursor-pointer shadow-lg" />
        </Marker>
      </Map>
      <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-light-card/95 dark:bg-github-card/95 backdrop-blur-sm p-3 rounded-lg border border-light-border dark:border-github-border shadow-lg">
        <input
          type="text"
          value={placeName}
          onChange={(e) => onPlaceNameChange?.(e.target.value)}
          placeholder="Location name"
          className="w-full px-3 py-2 rounded-lg border border-light-border dark:border-github-border bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted text-sm mb-1.5"
        />
        <div className="text-xs text-light-text-secondary dark:text-github-text-secondary">
          💡 Click on the map to place a marker or drag the marker to select location
        </div>
      </div>
    </div>
  );
}