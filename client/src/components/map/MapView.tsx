import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ViewStateChangeEvent, MapRef } from 'react-map-gl';
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
  // Event type and request info
  event_type?: 'solo_performance' | 'open_mic' | 'venue_booking';
  accepting_requests?: boolean;
  max_performers?: number;
  accepted_requests_count?: number;
}

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
  markers?: EventMarker[];
  selectedMarkerId?: string | null;
  userLocation?: { latitude: number; longitude: number } | null;
  searchCenter?: { latitude: number; longitude: number; name?: string } | null; // Center for search radius (activeLocation or userLocation)
  searchRadius?: number; // in kilometers
  flyToKey?: number; // Change this to trigger a flyTo animation to center
  onMarkerClick?: (markerId: string) => void;
  onMapClick?: () => void;
  onBoundsChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
}

// Generate a circle polygon for the search radius
// Using geodesic calculation: 1 degree latitude ≈ 110.574 km
// 1 degree longitude ≈ 111.32 * cos(latitude) km
function createCirclePolygon(center: [number, number], radiusKm: number, points: number = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const lat = center[1];
  const lng = center[0];
  
  // Convert radius from km to degrees
  const latOffset = radiusKm / 110.574;
  const lngOffset = radiusKm / (111.32 * Math.cos(lat * Math.PI / 180));

  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dy = latOffset * Math.sin(angle);
    const dx = lngOffset * Math.cos(angle);
    coords.push([lng + dx, lat + dy]);
  }
  coords.push(coords[0]); // Close the polygon

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    }
  };
}

export function MapView({ center = [18.0649, 59.3293], zoom = 11, markers = [], selectedMarkerId, userLocation, searchCenter, searchRadius, flyToKey, onMarkerClick, onMapClick, onBoundsChange }: MapViewProps) {
  const navigate = useNavigate();
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastFittedMarkerId = useRef<string | null>(null); // Track which marker we've already zoomed to
  const [routeData, setRouteData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const [countdownColor, setCountdownColor] = useState<string>('#666');
  const [travelTimes, setTravelTimes] = useState<{ walk: string; bike: string; car: string } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [viewport, setViewport] = useState({
    latitude: center[1],
    longitude: center[0],
    zoom: zoom
  });

  // Update viewport when center or zoom props change (for search functionality)
  useEffect(() => {
    setViewport({
      latitude: center[1],
      longitude: center[0],
      zoom: zoom
    });
  }, [center[0], center[1], zoom]);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Resize map when container size changes (e.g., sidebar/filter panel collapse)
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      // Small delay to ensure container has finished resizing
      setTimeout(() => {
        mapRef.current?.resize();
      }, 50);
    });
    
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Fly to center when flyToKey changes (for "My Location" button)
  useEffect(() => {
    if (flyToKey && mapRef.current) {
      mapRef.current.flyTo({
        center: [center[0], center[1]],
        zoom: zoom,
        duration: 1000
      });
    }
  }, [flyToKey]);

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
      // Use searchCenter (activeLocation or userLocation) as the route origin
      const routeOrigin = searchCenter;
      
      // Clear route if no selection, no origin, or selected marker doesn't exist in current markers
      if (!selectedMarkerId || !selectedEventMarker || !routeOrigin) {
        setRouteData(null);
        lastFittedMarkerId.current = null;
        return;
      }

      // Check if the selected marker still exists in the markers list
      const markerExists = markers.some(m => m.id === selectedMarkerId && m.id !== 'user-location');
      if (!markerExists) {
        setRouteData(null);
        lastFittedMarkerId.current = null;
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${routeOrigin.longitude},${routeOrigin.latitude};${selectedEventMarker.longitude},${selectedEventMarker.latitude}?access_token=${MAPBOX_TOKEN}&geometries=geojson`
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

          // Only zoom to fit route once per marker selection (allow user to pan/zoom freely after)
          if (lastFittedMarkerId.current !== selectedMarkerId) {
            lastFittedMarkerId.current = selectedMarkerId;
            
            // Calculate bounds with proper padding
            const minLat = Math.min(routeOrigin.latitude, selectedEventMarker.latitude);
            const maxLat = Math.max(routeOrigin.latitude, selectedEventMarker.latitude);
            const minLng = Math.min(routeOrigin.longitude, selectedEventMarker.longitude);
            const maxLng = Math.max(routeOrigin.longitude, selectedEventMarker.longitude);

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
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        setRouteData(null);
      }
    };

    fetchRoute();
  }, [selectedMarkerId, selectedEventMarker, searchCenter, markers]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
    <Map
      ref={mapRef}
      {...viewport}
      onLoad={() => {
        // Report initial bounds when map loads
        if (onBoundsChange && mapRef.current) {
          const bounds = mapRef.current.getBounds();
          if (bounds) {
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest()
            });
          }
        }
      }}
      onMove={(evt: ViewStateChangeEvent) => {
        setViewport(evt.viewState);
        // Report bounds to parent if callback provided
        if (onBoundsChange && evt.target) {
          const bounds = evt.target.getBounds();
          if (bounds) {
            onBoundsChange({
              north: bounds.getNorth(),
              south: bounds.getSouth(),
              east: bounds.getEast(),
              west: bounds.getWest()
            });
          }
        }
      }}
      onClick={() => onMapClick?.()}
      style={{ width: '100%', height: '100%' }}
      mapStyle={isDarkMode ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
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

      {/* Search Radius Circle */}
      {searchRadius && searchCenter && (
        <Source 
          key={`search-radius-${searchCenter.latitude}-${searchCenter.longitude}-${searchRadius}`}
          id="search-radius" 
          type="geojson" 
          data={createCirclePolygon([searchCenter.longitude, searchCenter.latitude], searchRadius)}
        >
          <Layer
            id="search-radius-fill"
            type="fill"
            paint={{
              'fill-color': '#c18654',
              'fill-opacity': 0.15
            }}
          />
          <Layer
            id="search-radius-line"
            type="line"
            paint={{
              'line-color': '#c18654',
              'line-width': 2,
              'line-opacity': 0.6,
              'line-dasharray': [2, 2]
            }}
          />
        </Source>
      )}

      {/* Search Location Pin Marker - shown when searching a location different from user location */}
      {searchCenter && (
        !userLocation || 
        searchCenter.latitude !== userLocation.latitude || 
        searchCenter.longitude !== userLocation.longitude
      ) && (
        <Marker
          latitude={searchCenter.latitude}
          longitude={searchCenter.longitude}
          anchor="bottom"
        >
          <div 
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            title={searchCenter.name || 'Search location'}
          >
            {/* Location pin */}
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
              {/* Pin body */}
              <path 
                d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26c0-8.84-7.16-16-16-16z" 
                fill="#c18654"
              />
              {/* Inner circle */}
              <circle cx="16" cy="16" r="6" fill="white" />
            </svg>
          </div>
        </Marker>
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
                width: isUserLocation ? '28px' : '40px',
                height: isUserLocation ? '28px' : '40px',
                backgroundColor: isUserLocation ? markerColor : 'white',
                border: '3px solid white',
                borderRadius: '50%',
                cursor: 'pointer',
                boxShadow: `0 2px 8px ${isUserLocation ? 'rgba(37, 99, 235, 0.4)' : 'rgba(0,0,0,0.3)'}`,
                transition: 'transform 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
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
              {isUserLocation ? (
                <div style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                }}/>
              ) : marker.profile?.avatar_url ? (
                <img 
                  src={marker.profile.avatar_url} 
                  alt={marker.profile.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: '50%',
                  }}
                />
              ) : (
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#4CAF50',
                  borderRadius: '50%',
                }}/>
              )}
            </div>
          </Marker>
        );
      })}

      {/* Event Details Card at Top-Left Corner */}
      {selectedEventMarker && (
        <div className={`absolute top-0 left-0 z-10 bg-light-card/40 dark:bg-github-card/40 backdrop-blur-sm border border-light-border/20 dark:border-github-border/20 shadow-2xl flex flex-col transition-all duration-300 ${isExpanded ? 'w-[450px] max-h-[90vh]' : 'w-[380px]'}`}>
          {/* Header */}
          <div className={`p-5 flex justify-between items-start ${isExpanded ? 'border-b border-light-border dark:border-github-border' : ''}`}>
            <div className="flex-1">
              {/* Event Creator - Clickable */}
              {selectedEventMarker.profile && (
                <div
                  onClick={() => {
                    if (selectedEventMarker.profile) {
                      navigate(`/profile/${selectedEventMarker.profile.id}`);
                    }
                  }}
                  className="mb-3 p-2 bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-lg hover:border-light-blue dark:hover:border-github-blue cursor-pointer transition-all duration-200 flex items-center gap-2 group"
                >
                  {selectedEventMarker.profile.avatar_url && (
                    <img
                      src={selectedEventMarker.profile.avatar_url}
                      alt={selectedEventMarker.profile.name}
                      className="w-8 h-8 rounded-full object-cover border border-light-border dark:border-github-border group-hover:border-light-blue dark:group-hover:border-github-blue transition-colors flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-light-text-muted dark:text-github-text-muted">By</p>
                    <p className="text-xs font-semibold text-light-text dark:text-github-text group-hover:text-light-blue dark:group-hover:text-github-blue transition-colors truncate">
                      {selectedEventMarker.profile.name}
                    </p>
                  </div>
                  <span className="text-light-blue dark:text-github-blue text-sm group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                </div>
              )}
              
              <h2 className="m-0 mb-3 text-light-text dark:text-github-text text-xl font-bold">
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
              
              <div className="flex flex-col gap-2.5 text-light-text-secondary dark:text-github-text-secondary text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">📅</span>
                  <span>{new Date(selectedEventMarker.date).toLocaleString()}</span>
                </div>
                
                {selectedEventMarker.location && (
                  <div 
                    className="flex items-center gap-2 cursor-pointer hover:text-light-blue dark:hover:text-github-blue"
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
              className="bg-transparent border-none text-2xl cursor-pointer p-1 ml-3 text-light-text-muted dark:text-github-text-muted hover:text-light-text dark:hover:text-github-text flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>

          {/* Expanded Content */}
          {isExpanded && (
            <div className="p-4 overflow-y-auto flex-1 text-light-text-secondary dark:text-github-text-secondary text-sm leading-relaxed">
              <p className="m-0 mb-3 text-xs">
                Additional event details and description would go here. You can add more information about the event such as the organizer, ticket prices, capacity, and other relevant details.
              </p>

              {/* Travel Time Information */}
              {travelTimes && userLocation && (
                <div className="bg-light-bg dark:bg-github-bg p-3 rounded border border-light-border dark:border-github-border mb-3">
                  <h4 className="m-0 mb-2 text-xs font-semibold text-light-blue dark:text-github-blue">
                    ⏱️ Travel Time from Your Location
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-1.5 bg-light-card dark:bg-github-card rounded border border-light-border dark:border-github-border">
                      <div className="text-sm mb-0.5">🚶</div>
                      <div className="text-[10px] text-light-text-muted dark:text-github-text-muted">Walk</div>
                      <div className="font-semibold text-xs text-light-blue dark:text-github-blue">{travelTimes.walk}</div>
                    </div>
                    <div className="text-center p-1.5 bg-light-card dark:bg-github-card rounded border border-light-border dark:border-github-border">
                      <div className="text-sm mb-0.5">🚴</div>
                      <div className="text-[10px] text-light-text-muted dark:text-github-text-muted">Bike</div>
                      <div className="font-semibold text-xs text-light-blue dark:text-github-blue">{travelTimes.bike}</div>
                    </div>
                    <div className="text-center p-1.5 bg-light-card dark:bg-github-card rounded border border-light-border dark:border-github-border">
                      <div className="text-sm mb-0.5">🚗</div>
                      <div className="text-[10px] text-light-text-muted dark:text-github-text-muted">Drive</div>
                      <div className="font-semibold text-xs text-light-blue dark:text-github-blue">{travelTimes.car}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-light-bg dark:bg-github-bg p-2 rounded border border-light-border dark:border-github-border mb-2 text-xs">
                <strong className="text-light-blue dark:text-github-blue">Note:</strong> <span className="text-light-text-secondary dark:text-github-text-secondary">Click on different events to see their routes on the map.</span>
              </div>
            </div>
          )}

          {/* Slot Info & Actions */}
          {selectedEventMarker.event_type && selectedEventMarker.event_type !== 'solo_performance' && (
            <div className="px-3 py-2 border-t border-light-border dark:border-github-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${selectedEventMarker.event_type === 'open_mic' ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {selectedEventMarker.event_type === 'open_mic' ? '🎤 Open Mic' : '🏢 Venue'}
                  </span>
                  {selectedEventMarker.max_performers && (
                    <span className="text-xs text-light-text-muted dark:text-github-text-muted">
                      {selectedEventMarker.accepted_requests_count || 0}/{selectedEventMarker.max_performers} slots
                    </span>
                  )}
                </div>
                {selectedEventMarker.accepting_requests && selectedEventMarker.max_performers && (selectedEventMarker.accepted_requests_count || 0) < selectedEventMarker.max_performers && (
                  <span className="text-[10px] text-green-400 font-medium">Open for requests</span>
                )}
              </div>
            </div>
          )}

          {/* Read More Button */}
          <div className="p-3 border-t border-light-border dark:border-github-border flex gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className={`${selectedEventMarker.accepting_requests && selectedEventMarker.event_type !== 'solo_performance' ? 'flex-1' : 'flex-1'} px-3 py-2 rounded text-sm font-semibold transition-all duration-200 ${
                isExpanded 
                  ? 'bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text hover:bg-light-card dark:hover:bg-github-card border border-light-border dark:border-github-border' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isExpanded ? '← Collapse' : 'Read More →'}
            </button>
            {selectedEventMarker.accepting_requests && selectedEventMarker.event_type !== 'solo_performance' && (
              <button
                onClick={() => navigate(`/event/${selectedEventMarker.id}`)}
                className="flex-1 px-3 py-2 rounded text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-all duration-200"
              >
                Request to Join
              </button>
            )}
          </div>
        </div>
      )}
    </Map>
    </div>
  );
}