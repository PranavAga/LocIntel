'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { BotMessageSquare, XIcon, SendIcon } from 'lucide-react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

export default function MapApp() {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2088);
  const [zoom, setZoom] = useState(12);
  const [mapLoaded, setMapLoaded] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  
  // Use Vercel AI SDK's useChat hook
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  // Custom submit handler that prevents default behavior
  const onSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    };
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
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [lng, lat, zoom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
                      {message.parts.map((part, index) => (
                        part.type === 'text' ? (
                          <>{part.text}</>
                        ) : null
                      ))}
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
                  placeholder="Ask me anything..."
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