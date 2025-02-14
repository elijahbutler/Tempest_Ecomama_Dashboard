'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from './Card';
import type { Map as LeafletMap } from 'leaflet';
import L from 'leaflet';

type WeatherLayer = 'radar';  // Simplified to just radar for now

type BaseMapType = 'dark' | 'light' | 'satellite' | 'terrain';

// Available base maps
const baseMaps: Record<BaseMapType, string> = {
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  terrain: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'
};

// Weather layer configuration
const weatherLayerConfig: Record<WeatherLayer, { name: string; opacity: number }> = {
  radar: { name: 'Weather Radar', opacity: 0.7 }
};

interface WeatherRadarProps {
  lat?: number;
  lon?: number;
  zoom?: number;
}

interface WeatherLayerState {
  id: WeatherLayer;
  active: boolean;
  opacity: number;
}

export default function WeatherRadar({ 
  lat = process.env.NEXT_PUBLIC_STATION_LAT ? parseFloat(process.env.NEXT_PUBLIC_STATION_LAT) : 34.62946,
  lon = process.env.NEXT_PUBLIC_STATION_LON ? parseFloat(process.env.NEXT_PUBLIC_STATION_LON) : -120.07014,
  zoom = 8  // Default zoom level for local area view
}: WeatherRadarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [baseMap, setBaseMap] = useState<BaseMapType>('light');
  const [activeLayers] = useState<WeatherLayerState[]>([
    { id: 'radar', active: true, opacity: weatherLayerConfig.radar.opacity }
  ]);
  const [weatherLayers, setWeatherLayers] = useState<Map<WeatherLayer, L.TileLayer>>(new Map());
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const baseLayerRef = useRef<L.TileLayer | null>(null);
  const stationName = process.env.NEXT_PUBLIC_STATION_NAME || 'Weather Station';

  // Initialize map only once
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return;

    try {
      mapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([lat, lon], zoom);
      
      // Base layer with improved styling
      baseLayerRef.current = L.tileLayer(baseMaps[baseMap], {
        attribution: baseMap === 'terrain' ? '©OpenTopoMap' : baseMap === 'satellite' ? '©ESRI' : '©CartoDB',
        maxZoom: 19,
        className: 'map-tiles'
      }).addTo(mapInstanceRef.current);

      // Add station marker
      L.marker([lat, lon])
        .addTo(mapInstanceRef.current)
        .bindPopup(stationName)
        .openPopup();

      // Add layer controls
      const layerControl = L.control.layers(
        {
          'Light': L.tileLayer(baseMaps.light),
          'Dark': L.tileLayer(baseMaps.dark),
          'Satellite': L.tileLayer(baseMaps.satellite),
          'Terrain': L.tileLayer(baseMaps.terrain),
        },
        {},
        { position: 'topright' }
      ).addTo(mapInstanceRef.current);

      setMap(mapInstanceRef.current);
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [lat, lon, zoom, baseMap, stationName]);

  // Update weather layers management
  useEffect(() => {
    if (!map) return;

    try {
      // Update existing layers and create new ones as needed
      activeLayers.forEach(layerState => {
        const existingLayer = weatherLayers.get(layerState.id);
        
        if (layerState.active) {
          if (!existingLayer) {
            // Using MRMS radar data from Iowa State University
            const mrmsUrl = 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi';
            const newLayer = L.tileLayer.wms(mrmsUrl, {
              layers: 'nexrad-n0q-900913',
              format: 'image/png',
              transparent: true,
              opacity: layerState.opacity,
              attribution: '©NOAA, Iowa State University'
            });

            newLayer.on('tileerror', (e: L.TileErrorEvent) => {
              console.error('Tile error:', e);
              setError('Weather radar data temporarily unavailable');
            });

            newLayer.addTo(map);
            setWeatherLayers(prev => new Map(prev).set(layerState.id as WeatherLayer, newLayer));
          } else {
            // Update existing layer
            existingLayer.setOpacity(layerState.opacity);
            if (!map.hasLayer(existingLayer)) {
              existingLayer.addTo(map);
            }
          }
        } else if (existingLayer) {
          // Remove inactive layers
          existingLayer.remove();
        }
      });

      setIsLoading(false);
    } catch (err) {
      console.error('Weather layer error:', err);
      setError('Failed to load weather radar');
    }
  }, [map, activeLayers, weatherLayers]);

  // Add this useEffect to style the Leaflet container
  useEffect(() => {
    if (map) {
      // Add custom styles to Leaflet container
      const container = map.getContainer();
      container.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      container.style.borderRadius = '0.75rem';
    }
  }, [map]);

  return (
    <Card variant="glass" className="h-full p-2 md:p-4">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-2 px-1">
          <h2 className="text-sm md:text-base font-medium text-gray-200">
            {stationName}
          </h2>
          <span className="text-xs text-gray-400">
            {lat.toFixed(4)}°N, {lon.toFixed(4)}°W
          </span>
        </div>
        <div className="flex-1">
          <div 
            ref={mapRef}
            className="w-full h-full min-h-[300px] rounded-xl overflow-hidden relative 
                       bg-gray-900/60 transition-all duration-300
                       glass-panel"
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-400 border-t-transparent" />
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="text-center">
                  <p className="text-xl mb-2 text-red-500">⚠️</p>
                  <p className="text-red-400">{error}</p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-blue-400/20 hover:bg-blue-400/30 rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}