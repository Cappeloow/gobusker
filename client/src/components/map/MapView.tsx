import { useState, useEffect } from 'react';
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
  const [routeData, setRouteData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [countdownColor, setCountdownColor] = useState<string>('#666');
  const [isToday, setIsToday] = useState(false);
  const [viewport, setViewport] = useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoom
  });

  // Get the selected event marker (if any)
  const selectedEventMarker = selectedMarkerId
    ? markers.find(m => m.id === selectedMarkerId && m.id !== 'user-location')
    : null;

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
        setIsToday(false);
        return;
      }

      const diff = eventTime.getTime() - now.getTime();

      if (diff < 0) {
        setCountdown('Event has started');
        setCountdownColor('#999');
        setIsToday(false);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Check if event is today
      const isEventToday = eventTime.toDateString() === now.toDateString();
      setIsToday(isEventToday);

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
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          zIndex: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.4)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          padding: '0',
          width: isExpanded ? '450px' : '380px',
          maxHeight: isExpanded ? '90vh' : 'auto',
          transition: 'width 0.3s ease',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: isExpanded ? '1px solid rgba(0, 0, 0, 0.1)' : 'none',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'start'
          }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 12px 0', color: '#1a1a1a', fontSize: '20px', fontWeight: 'bold' }}>
                {selectedEventMarker.title}
              </h2>
              
              {countdown && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  backgroundColor: `${countdownColor}20`,
                  borderLeft: `3px solid ${countdownColor}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: countdownColor
                }}>
                  ⏱️ {countdown}
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#555', fontSize: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📅</span>
                  <span>{new Date(selectedEventMarker.date).toLocaleString()}</span>
                </div>
                
                {selectedEventMarker.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF6B6B" style={{ minWidth: '16px' }}>
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    </svg>
                    <span>{selectedEventMarker.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              onClick={() => onMapClick?.()}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                marginLeft: '12px',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#333'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#999'}
            >
              ✕
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              color: '#555',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              <p style={{ margin: '0 0 16px 0' }}>
                Additional event details and description would go here. You can add more information about the event such as the organizer, ticket prices, capacity, and other relevant details.
              </p>
              <div style={{
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                padding: '12px',
                borderRadius: '4px',
                marginBottom: '12px'
              }}>
                <strong style={{ color: '#FF6B6B' }}>Note:</strong> Click on different events to see their routes on the map.
              </div>
            </div>
          )}

          {/* Read More Button */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                flex: 1,
                padding: '10px 16px',
                backgroundColor: isExpanded ? '#f0f0f0' : '#FF6B6B',
                color: isExpanded ? '#333' : '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (isExpanded) {
                  e.currentTarget.style.backgroundColor = '#e0e0e0';
                } else {
                  e.currentTarget.style.backgroundColor = '#ff5252';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isExpanded ? '#f0f0f0' : '#FF6B6B';
              }}
            >
              {isExpanded ? '← Collapse' : 'Read More →'}
            </button>
          </div>
        </div>
      )}
    </Map>
  );
}