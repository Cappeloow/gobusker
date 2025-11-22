import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ViewStateChangeEvent } from 'react-map-gl';
import { Map, Marker, NavigationControl, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface EventMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  date: string;
  location?: string;
  profile?: {
    id: string;
    name: string;
    avatar_url?: string;
    profile_type?: 'individual' | 'band';
  };
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: EventMarker[];
  selectedMarkerId?: string | null;
  userLocation?: { latitude: number; longitude: number } | null;
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: () => void;
}

export function MapView({ center = [18.0649, 59.3293], zoom = 11, markers = [], selectedMarkerId, userLocation, onMarkerClick, onMapClick }: MapViewProps) {
  const navigate = useNavigate();
  const [routeData, setRouteData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [countdownColor, setCountdownColor] = useState<string>('#666');
  const [travelTimes, setTravelTimes] = useState<{ walk: string; bike: string; car: string } | null>(null);
  const [viewport, setViewport] = useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoom
  });

  // Calculate travel time based on distance and mode of transport
  const calculateTravelTime = (distance: number, mode: 'walk' | 'bike' | 'car') => {
    const speeds = {
      walk: 5,
      bike: 15,
      car: 40
    };
    const hours = distance / speeds[mode];
    const minutes = Math.round(hours * 60);
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const fullHours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${fullHours}h ${remainingMins}m` : `${fullHours}h`;
  };

  // Haversine formula to calculate distance between two coordinates
  const getDistanceFromCoords = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get the selected event marker (if any)
  const selectedEventMarker = selectedMarkerId
    ? markers.find(m => m.id === selectedMarkerId && m.id !== 'user-location')
    : null;

  // Calculate travel times when user location or selected marker changes
  useEffect(() => {
    if (!selectedEventMarker || !userLocation) {
      setTravelTimes(null);
      return;
    }

    const distance = getDistanceFromCoords(
      userLocation.latitude,
      userLocation.longitude,
      selectedEventMarker.latitude,
      selectedEventMarker.longitude
    );

    setTravelTimes({
      walk: calculateTravelTime(distance, 'walk'),
      bike: calculateTravelTime(distance, 'bike'),
      car: calculateTravelTime(distance, 'car')
    });
  }, [selectedEventMarker, userLocation]);

  // Calculate countdown timer
  useEffect(() => {
    if (!selectedEventMarker) return;

    const interval = setInterval(() => {
      const now = new Date();
      // Parse the date string more carefully
      const eventTime = new Date(selectedEventMarker.date);
      
      if (isNaN(eventTime.getTime())) {
        setCountdown('Invalid date');
        setCountdownColor('#999');
        return;
      }

      const diff = eventTime.getTime() - now.getTime();

      if (diff < 0) {
        setCountdown('Event has started');
        setCountdownColor('#999');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Determine color and text
      if (days === 0 && hours === 0 && minutes <= 30) {
        setCountdownColor('#FF6B6B'); // Red - less than 30 minutes
        setCountdown(`${minutes} min left`);
      } else if (days === 0 && hours <= 1) {
        setCountdownColor('#FFA500'); // Orange - less than 1 hour
        setCountdown(`${hours}h ${minutes}m left`);
      } else if (days === 0) {
        setCountdownColor('#FFD700'); // Yellow - today
        setCountdown(`${hours}h ${minutes}m left`);
      } else {
        setCountdownColor('#4CAF50'); // Green - more than a day
        setCountdown(`${days}d ${hours}h left`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedEventMarker]);

  // Fetch route data from Mapbox Directions API
  useEffect(() => {
    const fetchRoute = async () => {
      // Clear route if no selection, no user location, or selected marker doesn't exist in current markers
      if (!selectedMarkerId || !selectedEventMarker || !userLocation) {
        setRouteData(null);
        return;
      }

      // Check if the selected marker still exists in the markers list
      const markerExists = markers.some(m => m.id === selectedMarkerId && m.id !== 'user-location');
      if (!markerExists) {
        setRouteData(null);
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.longitude},${userLocation.latitude};${selectedEventMarker.longitude},${selectedEventMarker.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`
        );
        const data = await response.json();
        
        if (data.routes && data.routes[0]) {
          setRouteData({
            type: 'FeatureCollection' as const,
            features: [{
              type: 'Feature' as const,
              geometry: data.routes[0].geometry,
              properties: {}
            }]
          });

          // Calculate bounds with proper padding
          const minLat = Math.min(userLocation.latitude, selectedEventMarker.latitude);
          const maxLat = Math.max(userLocation.latitude, selectedEventMarker.latitude);
          const minLng = Math.min(userLocation.longitude, selectedEventMarker.longitude);
          const maxLng = Math.max(userLocation.longitude, selectedEventMarker.longitude);

          // Add 15% padding
          const latPadding = (maxLat - minLat) * 0.15;
          const lngPadding = (maxLng - minLng) * 0.15;

          const paddedMinLat = minLat - latPadding;
          const paddedMaxLat = maxLat + latPadding;
          const paddedMinLng = minLng - lngPadding;
          const paddedMaxLng = maxLng + lngPadding;

          // Center point
          const centerLat = (paddedMinLat + paddedMaxLat) / 2;
          const centerLng = (paddedMinLng + paddedMaxLng) / 2;

          // Calculate zoom using Mapbox formula
          // EARTH_CIRCUMFERENCE = 40075016.686 meters
          const maxDistance = Math.max(
            paddedMaxLat - paddedMinLat,
            paddedMaxLng - paddedMinLng
          );

          // More accurate zoom calculation
          const zoom = Math.max(
            0,
            Math.floor(
              Math.log2(360 / maxDistance / 2)
            )
          );

          setViewport({
            latitude: centerLat,
            longitude: centerLng,
            zoom: Math.min(zoom, 18) // Cap zoom at 18
          });
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        setRouteData(null);
      }
    };

    fetchRoute();
  }, [selectedMarkerId, selectedEventMarker, userLocation, markers]);

  return (
    <Map
      {...viewport}
      onMove={(evt: ViewStateChangeEvent) => setViewport(evt.viewState)}
      onClick={() => onMapClick?.()}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
    >
      <NavigationControl position="top-right" />
      
      {/* Route to event following roads */}
      {routeData && (
        <Source id="route-line" type="geojson" data={routeData}>
          <Layer
            id="route-line-layer"
            type="line"
            layout={{
              'line-join': 'round',
              'line-cap': 'round'
            }}
            paint={{
              'line-color': '#FF6B6B',
              'line-width': 3,
              'line-opacity': 0.8
            }}
          />
        </Source>
      )}
      
      {markers.map((marker) => {
        const isUserLocation = marker.id === 'user-location';
        const markerColor = isUserLocation ? '#2563EB' : '#4CAF50'; // Blue for user, green for events
        
        return (
          <Marker
            key={marker.id}
            latitude={marker.latitude}
            longitude={marker.longitude}
          >
            <div 
              style={{
                width: isUserLocation ? '28px' : '24px',
                height: isUserLocation ? '28px' : '24px',
                backgroundColor: markerColor,
                border: '3px solid white',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: `0 2px 8px ${isUserLocation ? 'rgba(37, 99, 235, 0.4)' : 'rgba(0,0,0,0.3)'}`,
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isUserLocation && onMarkerClick) {
                  onMarkerClick(marker.id);
                }
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isUserLocation && (
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                }}/>
              )}
            </div>
          </Marker>
        );
      })}

      {/* Event Details Card at Top-Left Corner */}
      {selectedEventMarker && (
        <div className={`absolute top-0 left-0 z-10 bg-github-card backdrop-blur-lg border border-github-border shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'w-[450px] max-h-[90vh]' : 'w-[380px]'}`}>
          {/* Header */}
          <div className={`p-5 flex justify-between items-start ${isExpanded ? 'border-b border-github-border' : ''}`}>
            <div className="flex-1">
              {/* Event Creator - Clickable */}
              {selectedEventMarker.profile && (
                <div
                  onClick={() => {
                    if (selectedEventMarker.profile) {
                      navigate(`/profile/${selectedEventMarker.profile.id}`);
                    }
                  }}
                  className="mb-3 p-2 bg-github-bg border border-github-border rounded-lg hover:border-github-blue cursor-pointer transition-all duration-200 flex items-center gap-2 group"
                >
                  {selectedEventMarker.profile.avatar_url && (
                    <img
                      src={selectedEventMarker.profile.avatar_url}
                      alt={selectedEventMarker.profile.name}
                      className="w-8 h-8 rounded-full object-cover border border-github-border group-hover:border-github-blue transition-colors flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-github-text-muted">By</p>
                    <p className="text-xs font-semibold text-github-text group-hover:text-github-blue transition-colors truncate">
                      {selectedEventMarker.profile.name}
                    </p>
                  </div>
                  <span className="text-github-blue text-sm group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                </div>
              )}
              
              <h2 className="m-0 mb-3 text-github-text text-xl font-bold">
                {selectedEventMarker.title}
              </h2>
              
              {countdown && (
                <div className={`mb-3 p-3 rounded text-sm font-semibold`}
                  style={{
                    backgroundColor: `${countdownColor}20`,
                    borderLeft: `3px solid ${countdownColor}`,
                    color: countdownColor
                  }}>
                  ⏱️ {countdown}
                </div>
              )}
              
              <div className="flex flex-col gap-2.5 text-github-text-secondary text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span>{new Date(selectedEventMarker.date).toLocaleString()}</span>
                </div>
                
                {selectedEventMarker.location && (
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-github-blue"
                    onClick={() => {
                      if (selectedEventMarker.location) {
                        const address = encodeURIComponent(selectedEventMarker.location);
                        window.open(`https://www.google.com/maps/search/${address}`, '_blank');
                      }
                    }}
                    title="Open in Google Maps"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF6B6B" className="min-w-4">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span className="underline">{selectedEventMarker.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onMapClick?.()}
              className="bg-transparent border-none text-2xl cursor-pointer p-1 ml-3 text-github-text-muted hover:text-github-text flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="p-5 overflow-y-auto flex-1 text-github-text-secondary text-sm leading-relaxed">
              <p className="m-0 mb-4">
                Additional event details and description would go here. You can add more information about the event such as the organizer, ticket prices, capacity, and other relevant details.
              </p>

              {/* Travel Time Information */}
              {travelTimes && userLocation && (
                <div className="bg-github-bg p-4 rounded border border-github-border mb-4">
                  <h4 className="m-0 mb-3 text-xs font-semibold text-github-blue">
                    ⏱️ Travel Time from Your Location
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2.5 bg-github-card rounded border border-github-border">
                      <div className="text-xl mb-1.5">🚶</div>
                      <div className="text-xs text-github-text-muted mb-1.5">Walk</div>
                      <div className="font-semibold text-github-blue">{travelTimes.walk}</div>
                    </div>
                    <div className="text-center p-2.5 bg-github-card rounded border border-github-border">
                      <div className="text-xl mb-1.5">🚴</div>
                      <div className="text-xs text-github-text-muted mb-1.5">Bike</div>
                      <div className="font-semibold text-github-blue">{travelTimes.bike}</div>
                    </div>
                    <div className="text-center p-2.5 bg-github-card rounded border border-github-border">
                      <div className="text-xl mb-1.5">🚗</div>
                      <div className="text-xs text-github-text-muted mb-1.5">Drive</div>
                      <div className="font-semibold text-github-blue">{travelTimes.car}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-github-bg p-3 rounded border border-github-border mb-3">
                <strong className="text-github-blue">Note:</strong> <span className="text-github-text-secondary">Click on different events to see their routes on the map.</span>
              </div>
            </div>
          )}

          {/* Read More Button */}
          <div className="p-4 border-t border-github-border flex gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex-1 px-4 py-2.5 rounded text-sm font-semibold transition-all duration-200 ${
                isExpanded 
                  ? 'bg-github-bg text-github-text hover:bg-github-card border border-github-border' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isExpanded ? '← Collapse' : 'Read More →'}
            </button>
          </div>
        </div>
      )}
    </Map>
  );
}