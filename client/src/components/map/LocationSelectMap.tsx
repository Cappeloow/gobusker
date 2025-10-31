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
}

export function LocationSelectMap({ onLocationSelect, initialLocation }: LocationSelectMapProps) {
  const [markerPosition, setMarkerPosition] = useState(initialLocation || {
    latitude: 59.3293,
    longitude: 18.0686
  });

  const [viewport, setViewport] = useState({
    latitude: initialLocation?.latitude || 59.3293,
    longitude: initialLocation?.longitude || 18.0686,
    zoom: 11
  });

  const handleMapClick = async (event: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = event.lngLat;
    setMarkerPosition({ latitude: lat, longitude: lng });
    const place_name = await reverseGeocode(lat, lng);
    onLocationSelect({ latitude: lat, longitude: lng, place_name });
  };

  return (
    <div style={{ width: '100%', height: '300px', position: 'relative' }}>
      <Map
        {...viewport}
        onClick={handleMapClick}
        onMove={(evt: ViewStateChangeEvent) => setViewport(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
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
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#4CAF50',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }} />
        </Marker>
      </Map>
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '12px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        Click to place marker or drag marker to select location
      </div>
    </div>
  );
}