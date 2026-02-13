import { useState, useEffect } from 'react';
import type { ViewStateChangeEvent } from 'react-map-gl';
import { Map, Marker } from 'react-map-gl';
import { Search, MapPin, X } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface LocationSearchMapProps {
  onLocationSelect: (location: { latitude: number; longitude: number; place_name?: string }) => void;
  initialLocation?: { latitude: number; longitude: number };
  onPlaceNameChange?: (placeName: string) => void;
  placeName?: string;
}

export function LocationSearchMap({ onLocationSelect, initialLocation, onPlaceNameChange, placeName = '' }: LocationSearchMapProps) {
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
  const [searchQuery, setSearchQuery] = useState(placeName || '');
  const [isSearching, setIsSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [skipSuggestions, setSkipSuggestions] = useState(false);

  const commonCities = ['Stockholm', 'Göteborg', 'Malmö', 'Uppsala', 'Västerås', 'Örebro', 'Linköping', 'Helsingborg'];

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Sync search query with placeName prop
  useEffect(() => {
    if (placeName !== undefined) {
      setSearchQuery(placeName);
    }
  }, [placeName]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-container')) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  // Fetch search suggestions as user types (debounced)
  useEffect(() => {
    const fetchSuggestions = async () => {
      // Don't fetch if query is too short or if we should skip suggestions
      if (searchQuery.length < 2 || skipSuggestions) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?` +
          `country=SE,NO,DK,FI&` +
          `proximity=18.0649,59.3293&` +
          `types=place,locality,neighborhood,address,poi&` +
          `language=sv,en&` +
          `limit=5&` +
          `access_token=${MAPBOX_TOKEN}`
        );
        const data = await response.json();
        if (data.features && data.features.length > 0) {
          setSearchSuggestions(data.features);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Get appropriate zoom level for different place types
  const getZoomForPlace = (feature: any): number => {
    const placeType = feature.place_type?.[0];
    
    if (placeType === 'country') return 5;
    if (placeType === 'region') return 7;
    if (placeType === 'place' || placeType === 'locality') {
      // For cities, use bounding box if available
      if (feature.bbox) {
        const [minLng, minLat, maxLng, maxLat] = feature.bbox;
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const maxDiff = Math.max(lngDiff, latDiff);
        
        if (maxDiff > 1) return 9;
        if (maxDiff > 0.5) return 10;
        if (maxDiff > 0.2) return 11;
        if (maxDiff > 0.1) return 12;
        return 13;
      }
      return 11; // Default for cities
    }
    if (placeType === 'neighborhood') return 14;
    if (placeType === 'address' || placeType === 'poi') return 15;
    return 13; // Default
  };

  // Handle location search using Mapbox Geocoding API
  const handleSearch = async (placeQuery?: string) => {
    const query = placeQuery || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setShowSuggestions(false);
    setSkipSuggestions(true);
    if (placeQuery) setSearchQuery(placeQuery);
    
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `country=SE,NO,DK,FI&` +
        `proximity=18.0649,59.3293&` +
        `types=place,locality,neighborhood,address,poi&` +
        `language=sv,en&` +
        `access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const [longitude, latitude] = feature.center;
        const zoom = getZoomForPlace(feature);
        
        setMarkerPosition({ latitude, longitude });
        setViewport({ latitude, longitude, zoom });
        
        // Update form with the selected location
        onLocationSelect({ 
          latitude, 
          longitude, 
          place_name: feature.place_name 
        });
        
        // Update the place name field
        if (onPlaceNameChange) {
          onPlaceNameChange(feature.place_name);
        }
      } else {
        alert(`No location found for "${query}". Try being more specific or use a different spelling.`);
      }
    } catch (error) {
      console.error('Error searching location:', error);
      alert('Failed to search location. Please try again.');
    } finally {
      setIsSearching(false);
      setTimeout(() => setSkipSuggestions(false), 500);
    }
  };

  const handleMapClick = async (event: { lngLat: { lat: number; lng: number } }) => {
    const { lat, lng } = event.lngLat;
    setMarkerPosition({ latitude: lat, longitude: lng });
    
    // Try to reverse geocode to get place name
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address`
      );
      const data = await response.json();
      
      let place_name = 'Selected location';
      if (data.features && data.features.length > 0) {
        place_name = data.features[0].place_name;
      }
      
      // Update the search query to show the selected location
      setSearchQuery(place_name);
      setShowSuggestions(false);
      setSkipSuggestions(true);
      
      onLocationSelect({ latitude: lat, longitude: lng, place_name });
      if (onPlaceNameChange) {
        onPlaceNameChange(place_name);
      }
      
      // Reset skip flag after delay
      setTimeout(() => setSkipSuggestions(false), 500);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      const fallback_name = 'Selected location';
      setSearchQuery(fallback_name);
      onLocationSelect({ latitude: lat, longitude: lng, place_name: fallback_name });
    }
  };

  const selectSuggestion = (feature: any) => {
    const [longitude, latitude] = feature.center;
    const zoom = getZoomForPlace(feature);
    
    setSearchQuery(feature.place_name);
    setMarkerPosition({ latitude, longitude });
    setViewport({ latitude, longitude, zoom });
    setShowSuggestions(false);
    setSkipSuggestions(true);
    
    onLocationSelect({ 
      latitude, 
      longitude, 
      place_name: feature.place_name 
    });
    
    if (onPlaceNameChange) {
      onPlaceNameChange(feature.place_name);
    }
    
    setTimeout(() => setSkipSuggestions(false), 500);
  };

  return (
    <div className="w-full space-y-3">
      {/* Search Input Section */}
      <div className="relative search-container">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search for a location..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSkipSuggestions(false);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              onFocus={() => !skipSuggestions && searchSuggestions.length > 0 && setShowSuggestions(true)}
              className="w-full px-3 py-2 pl-9 rounded-lg border border-light-border dark:border-github-border bg-light-bg dark:bg-github-bg text-light-text dark:text-github-text placeholder-light-text-muted dark:placeholder-github-text-muted text-sm focus:outline-none focus:border-light-blue dark:focus:border-github-blue"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-light-text-muted dark:text-github-text-muted" />
          </div>
        </div>
        
        {/* Search Suggestions */}
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-light-card dark:bg-github-card border border-light-border dark:border-github-border rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
            {searchSuggestions.map((feature, index) => (
              <button
                key={index}
                onClick={() => selectSuggestion(feature)}
                className="w-full px-3 py-2 text-left hover:bg-light-bg dark:hover:bg-github-bg transition-colors border-b border-light-border dark:border-github-border last:border-b-0 flex items-center gap-2"
              >
                <MapPin className="w-4 h-4 text-light-text-muted dark:text-github-text-muted flex-shrink-0" />
                <span className="text-sm text-light-text dark:text-github-text truncate">
                  {feature.place_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Cities */}
      <div className="flex flex-wrap gap-2">
        {commonCities.slice(0, 6).map((city) => (
          <button
            key={city}
            onClick={() => handleSearch(`${city}, Sweden`)}
            className="px-3 py-1 text-xs bg-light-bg dark:bg-github-bg border border-light-border dark:border-github-border rounded-full text-light-text-secondary dark:text-github-text-secondary hover:border-light-blue dark:hover:border-github-blue transition-colors"
          >
            {city}
          </button>
        ))}
      </div>

      {/* Map */}
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
            onDragEnd={async (event) => {
              const { lat, lng } = event.lngLat;
              setMarkerPosition({ latitude: lat, longitude: lng });
              
              // Try to reverse geocode the dragged position
              try {
                const response = await fetch(
                  `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address`
                );
                const data = await response.json();
                
                let place_name = 'Selected location';
                if (data.features && data.features.length > 0) {
                  place_name = data.features[0].place_name;
                }
                
                // Update the search query to show the dragged location
                setSearchQuery(place_name);
                setShowSuggestions(false);
                setSkipSuggestions(true);
                
                onLocationSelect({ latitude: lat, longitude: lng, place_name });
                if (onPlaceNameChange) {
                  onPlaceNameChange(place_name);
                }
                
                // Reset skip flag after delay
                setTimeout(() => setSkipSuggestions(false), 500);
              } catch (error) {
                console.error('Error reverse geocoding:', error);
                const fallback_name = 'Selected location';
                setSearchQuery(fallback_name);
                onLocationSelect({ latitude: lat, longitude: lng, place_name: fallback_name });
              }
            }}
          >
            <div className="w-6 h-6 bg-[#D2B48C] border-2 border-white rounded-full cursor-pointer shadow-lg" />
          </Marker>
        </Map>
      </div>
    </div>
  );
}