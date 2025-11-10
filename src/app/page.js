'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './map.css';
import { BotMessageSquare , XIcon, SendIcon, MapPinIcon, MoveIcon } from 'lucide-react';

export default function MapApp() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2088);
  const [zoom, setZoom] = useState(12);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [mounted, setMounted] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your map assistant. How can I help you today?", isBot: true }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [pin, setPin] = useState(null);
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const messagesEndRef = useRef(null);
  const pinMarkerRef = useRef(null);
  
  // Use ref to track isPlacingPin so the click handler always has the current value
  const isPlacingPinRef = useRef(isPlacingPin);

  // Keep the ref in sync with state
  useEffect(() => {
    isPlacingPinRef.current = isPlacingPin;
  }, [isPlacingPin]);

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
    });

    // Update coordinates and zoom when map moves
    map.current.on('move', () => {
      const center = map.current.getCenter();
      setLng(center.lng);
      setLat(center.lat);
      setZoom(map.current.getZoom());
    });

    // Handle map clicks for placing pins - use ref to get current state
    map.current.on('click', (e) => {
      if (isPlacingPinRef.current) {
        const { lng, lat } = e.lngLat;
        placePin(lng, lat);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lng, lat, zoom]);

  const placePin = (lng, lat) => {
    // Remove existing pin marker
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
    }

    // Create new pin marker
    const marker = new maplibregl.Marker({ draggable: false })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup().setHTML(`
        <div class="p-2">
          <h3 class="font-bold">Placed Pin</h3>
          <p>Lat: ${lat.toFixed(6)}</p>
          <p>Lng: ${lng.toFixed(6)}</p>
          <p>Zoom: ${map.current.getZoom().toFixed(2)}</p>
        </div>
      `))
      .addTo(map.current);

    pinMarkerRef.current = marker;

    const newPin = {
      id: Date.now(),
      lng: lng,
      lat: lat,
      zoom: map.current.getZoom()
    };
    
    setPin(newPin);
    setIsPlacingPin(false);
    
    // Add message about the new pin
    const pinMessage = {
      id: messages.length + 1,
      text: `Pin placed! Coordinates: ${lat.toFixed(6)}°, ${lng.toFixed(6)}° at zoom level ${map.current.getZoom().toFixed(2)}`,
      isBot: true
    };
    setMessages(prev => [...prev, pinMessage]);
  };

  const clearPin = () => {
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }
    setPin(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      text: inputMessage,
      isBot: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: getBotResponse(inputMessage),
        isBot: true
      };
      setMessages(prev => [...prev, botResponse]);
    }, 500);
  };

  const getBotResponse = (userInput) => {
    const input = userInput.toLowerCase();
    
    if (input.includes('location') || input.includes('where')) {
      return `You're currently viewing coordinates: ${lat.toFixed(4)}°, ${lng.toFixed(4)}° at zoom level ${zoom.toFixed(2)}.`;
    } else if (input.includes('zoom')) {
      return `Current zoom level: ${zoom.toFixed(2)}. You can zoom in/out using the controls on the right side of the map or with your mouse wheel!`;
    } else if (input.includes('navigation') || input.includes('navigate')) {
      return 'Use the navigation controls on the top-right to pan and rotate the map. You can also click and drag to move around!';
    } else if (input.includes('pin') || input.includes('marker') || input.includes('place')) {
      if (input.includes('clear') || input.includes('remove') || input.includes('delete')) {
        clearPin();
        return "I've removed the pin from the map.";
      } else if (pin && (input.includes('list') || input.includes('show') || input.includes('where'))) {
        return getPinInformation();
      } else {
        setIsPlacingPin(true);
        return "Click anywhere on the map to place a pin! I'll tell you the exact coordinates and zoom level.";
      }
    } else if (input.includes('help')) {
      return 'I can help you with: placing pins, checking locations, zoom levels, navigation, and map information. Try "place a pin" or "what\'s my location?"';
    } else {
      return "I understand you're asking about the map. Try asking me to place a pin, check your location, or ask about zoom levels!";
    }
  };

  const getPinInformation = () => {
    if (!pin) {
      return "There is no pin placed on the map yet. Say 'place a pin' to add one!";
    }

    return `Pin is placed at:\nLatitude: ${pin.lat.toFixed(6)}°\nLongitude: ${pin.lng.toFixed(6)}°\nPlaced at zoom: ${pin.zoom.toFixed(2)}`;
  };

  const togglePinPlacement = () => {
    const newPlacingState = !isPlacingPin;
    setIsPlacingPin(newPlacingState);
    
    const userMessage = {
      id: messages.length + 1,
      text: newPlacingState ? "Place a pin on the map" : "Stop placing pins",
      isBot: false
    };
    setMessages(prev => [...prev, userMessage]);
    
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        text: newPlacingState 
          ? "Click anywhere on the map to place a pin! I'll tell you the exact coordinates and zoom level."
          : "Pin placement mode deactivated. Click the pin button again to place a new pin.",
        isBot: true
      };
      setMessages(prev => [...prev, botResponse]);
    }, 500);
  };

  return (
    <div className="relative w-full h-screen">
      {/* Map Container */}
      <div ref={mapContainer} id="map" className="w-full h-full" />
      
      {/* UI Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4 text-center">
            <h1 className="text-2xl font-bold text-gray-800">Loc Intel</h1>
            <p className="text-gray-600 mt-1">Find a place to go</p>
          </div>
        </div>
      </div>

      {/* Pin Placement Indicator */}
      {isPlacingPin && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2">
          <div className="bg-blue-600 text-white rounded-lg shadow-lg p-4 flex items-center space-x-2">
            <MapPinIcon size={20} />
            <span className="font-semibold">Click on the map to place a pin</span>
          </div>
        </div>
      )}

      {/* Pin Control Buttons */}
      <div className="absolute top-4 left-4 flex flex-col space-y-2">
        {/* Toggle Pin Placement Button */}
        <button
          onClick={togglePinPlacement}
          className={`bg-white rounded-lg shadow-lg p-3 transition-all duration-300 ${
            isPlacingPin 
              ? 'ring-2 ring-blue-600 text-blue-600' 
              : 'text-gray-700 hover:text-blue-600 hover:shadow-xl'
          }`}
          title={isPlacingPin ? "Stop placing pins" : "Place a pin on the map"}
        >
          <MapPinIcon size={24} />
        </button>

        {/* Clear Pin Button - Only show if there's a pin */}
        {pin && (
          <button
            onClick={clearPin}
            className="bg-white rounded-lg shadow-lg p-3 text-red-600 hover:text-red-700 hover:shadow-xl transition-all duration-300"
            title="Remove pin from map"
          >
            <XIcon size={24} />
          </button>
        )}
      </div>

      {/* Chatbot UI */}
      <div className="absolute bottom-12 right-12 flex flex-col items-end space-y-3">
        {/* Chat Window */}
        {isChatOpen && (
          <div className="bg-white rounded-lg shadow-xl w-80 h-96 flex flex-col border border-gray-200">
            {/* Chat Header */}
            <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <h3 className="font-semibold">Map Assistant</h3>
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
                    className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 whitespace-pre-wrap ${
                        message.isBot
                          ? 'bg-white border border-gray-200 text-gray-800'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about pins, location, zoom..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 transition-colors flex items-center justify-center"
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
            <BotMessageSquare  size={24} className="text-white" />
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