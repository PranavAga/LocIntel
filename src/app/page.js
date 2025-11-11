'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BotMessageSquare, XIcon, SendIcon, MapPin } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function MapApp() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const geojsonSourceRef = useRef(null);

  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2088);
  const [zoom, setZoom] = useState(12);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const [currentQueryFeatures, setCurrentQueryFeatures] = useState([]);
  
  // Use Vercel AI SDK's useChat hook with tool handling
  const { messages, sendMessage, status, handleSubmit } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === 'searchLocation') {
        // The tool will be executed automatically by the AI SDK
        console.log('Searching for:', toolCall.input.query);
      }
    },
    onFinish: (options) => {
      if (options?.isError){
        console.error('Error in chat response:', options?.error);
        return;
      }
      const lastMessage = options.message;
      console.log('Last message:', lastMessage);

      lastMessage.parts.forEach(part => {
        if (part.type == 'tool-searchLocation' && part.output?.success && part.output?.count) {
          const geojson = {
            type: part.output.data.type,
            features: part.output.data.features,
          };
          console.log('Displaying GeoJSON on map:', geojson);

          // Combine all geojsons for one user query
          setCurrentQueryFeatures(prev => {
            const newFeatures = [...prev, ...geojson.features];
            displayGeoJSONOnMap({
              type: 'FeatureCollection',
              features: newFeatures
            });
            return newFeatures;
          });
        }
      })
    },
  });

  // Custom submit handler
  const onSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      clearSearchResults();          // reset for new query
      setCurrentQueryFeatures([]);   // clear accumulated results
      sendMessage({ text: input });
      setInput('');
    }
  };

  useEffect(() => {
    if (map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [lng, lat],
      zoom: zoom
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current.addControl(new maplibregl.FullscreenControl(), 'top-right');

  map.current.on('load', () => {
  setMapLoaded(true);
  
  // Add GeoJSON source for search results
  map.current.addSource('search-results', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  // Add layer for polygons
  map.current.addLayer({
    id: 'search-polygons',
    type: 'fill',
    source: 'search-results',
    paint: {
      'fill-color': '#3b82f6',
      'fill-opacity': 0.3,
      'fill-outline-color': '#1d4ed8'
    }
  });

  // Add layer for points (only for non-polygon features)
  map.current.addLayer({
    id: 'search-points',
    type: 'circle',
    source: 'search-results',
    filter: ['!=', ['geometry-type'], 'Polygon'],
    paint: {
      'circle-radius': 6,
      'circle-color': '#ef4444',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#ffffff'
    }
  });

  // Create a popup but don't add it to the DOM yet
  const popup = new maplibregl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  // Add hover effect for polygons
  map.current.on('mouseenter', 'search-polygons', (e) => {
    // Change the cursor style as a UI indicator
    map.current.getCanvas().style.cursor = 'pointer';

    const feature = e.features[0];
    const displayName = feature.properties?.display_name || 'Unknown';
    const type = feature.properties?.type || 'Unknown';
    
    // Show popup at the first coordinate of the polygon
    const coordinates = e.lngLat;
    
    popup
      .setLngLat(coordinates)
      .setHTML(`
        <div class="font-semibold">${displayName}</div>
        <div class="text-sm text-gray-600">Type: ${type}</div>
      `)
      .addTo(map.current);
  });

  // Add hover effect for points
  map.current.on('mouseenter', 'search-points', (e) => {
    // Change the cursor style as a UI indicator
    map.current.getCanvas().style.cursor = 'pointer';

    const feature = e.features[0];
    const displayName = feature.properties?.display_name || 'Unknown';
    const type = feature.properties?.type || 'Unknown';
    
    const coordinates = e.lngLat;
    
    popup
      .setLngLat(coordinates)
      .setHTML(`
        <div class="font-semibold">${displayName}</div>
        <div class="text-sm text-gray-600">Type: ${type}</div>
      `)
      .addTo(map.current);
  });

  // When mouse leaves polygons, remove popup and reset cursor
  map.current.on('mouseleave', 'search-polygons', () => {
    map.current.getCanvas().style.cursor = '';
    popup.remove();
  });

  // When mouse leaves points, remove popup and reset cursor
  map.current.on('mouseleave', 'search-points', () => {
    map.current.getCanvas().style.cursor = '';
    popup.remove();
  });

  geojsonSourceRef.current = map.current.getSource('search-results');
});


    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lng, lat, zoom]);

  // Function to display GeoJSON on the map
  const displayGeoJSONOnMap = (geojson) => {
    if (!map.current || !geojsonSourceRef.current) return;

    // Update the GeoJSON source
    geojsonSourceRef.current.setData(geojson);

    // Fit map to the bounds of the GeoJSON
    if (geojson.features && geojson.features.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      
      geojson.features.forEach(feature => {
        if (feature.geometry) {
          if (feature.geometry.type === 'Point') {
            bounds.extend(feature.geometry.coordinates);
          } else if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates[0].forEach(coord => {
              bounds.extend(coord);
            });
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              polygon[0].forEach(coord => {
                bounds.extend(coord);
              });
            });
          }
        }
      });

      if (!bounds.isEmpty()) {
        map.current.fitBounds(bounds, { padding: 100, duration: 1000 });
      }
    }
  };

  // Clear search results from map
  const clearSearchResults = () => {
    if (geojsonSourceRef.current) {
      geojsonSourceRef.current.setData({
        type: 'FeatureCollection',
        features: []
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Render tool calls in messages
  const renderMessageContent = (message) => {
    return message.parts.map((part, index) => {
      if (part.type === 'text') {
        return <div key={index}>{part.text}</div>;
      } else if (part.type === 'tool-searchLocation') {
        return (
          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2 my-2">
            <div className="flex items-center text-yellow-800">
              <MapPin size={16} className="mr-2" />
              <span className="text-sm font-medium">
                Searched for: "{part.input?.query}"
              </span>
            </div>
            {part.state == 'output-available' && (part.output?.success ? (
              <div className="mt-2 text-sm text-yellow-700">
                Found {part.output.count} result{part.output.count !== 1 ? 's' : ''}.
              </div>
            ) : (
              <div className="mt-2 text-sm text-red-600">
                Search failed. Error: {part.errorText}.
              </div>
            ))}
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 pointer-events-none">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4 text-center">
            <h1 className="text-2xl font-bold text-gray-800">Loc Intel</h1>
            <p className="text-gray-600 mt-1">Find a place to go</p>
          </div>
        </div>
      </div>

      {/* Clear Results Button */}
      {mapLoaded && (
        <div className="absolute top-12 left-12 pointer-events-auto">
          <button
            onClick={clearSearchResults}
            className="bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 transition-colors flex items-center"
          >
            <XIcon size={16} className="mr-2" />
            Clear Results
          </button>
        </div>
      )}

      {/* Chatbot UI */}
      <div className="absolute bottom-12 right-12 flex flex-col items-end space-y-3">
        {/* Chat Window */}
        {isChatOpen && (
          <div className="bg-white rounded-lg shadow-xl w-96 h-112 flex flex-col border border-gray-200">
            {/* Chat Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="font-semibold">AI Assistant</h3>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
                        message.role === 'assistant'
                          ? 'bg-white border border-gray-200 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {renderMessageContent(message)}
                    </div>
                  </div>
                ))}

                {status != "ready" && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 text-gray-800 rounded-lg px-3 py-2">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={onSubmit} className="p-3 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  name="message"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask me about locations..."
                  disabled={status != "ready"}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={status != "ready" || !input || !input.trim()}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  <SendIcon size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`rounded-full p-4 shadow-lg transition-all duration-300 ${
            isChatOpen 
              ? 'bg-gray-600 hover:bg-gray-700 rotate-90' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isChatOpen ? (
            <XIcon size={24} className="text-white" />
          ) : (
            <BotMessageSquare size={24} className="text-white" />
          )}
        </button>
      </div>

      {/* Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75 pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
}