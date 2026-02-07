import React, { useState } from 'react';

const NexusLogos = () => {
  const [selectedLogo, setSelectedLogo] = useState(0);
  const [darkMode, setDarkMode] = useState(true);

  const logos = [
    {
      name: "Geometric Nexus",
      description: "Connected hexagons forming a network hub",
      component: (color, size = 200) => (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          {/* Center hexagon */}
          <path
            d="M100 40 L130 55 L130 85 L100 100 L70 85 L70 55 Z"
            fill={color}
            opacity="1"
          />
          {/* Top hexagon */}
          <path
            d="M100 10 L130 25 L130 45 L100 60 L70 45 L70 25 Z"
            fill={color}
            opacity="0.6"
          />
          {/* Bottom hexagon */}
          <path
            d="M100 140 L130 155 L130 185 L100 200 L70 185 L70 155 Z"
            fill={color}
            opacity="0.6"
          />
          {/* Left hexagon */}
          <path
            d="M50 70 L80 85 L80 115 L50 130 L20 115 L20 85 Z"
            fill={color}
            opacity="0.6"
          />
          {/* Right hexagon */}
          <path
            d="M150 70 L180 85 L180 115 L150 130 L120 115 L120 85 Z"
            fill={color}
            opacity="0.6"
          />
          {/* Connection lines */}
          <line x1="100" y1="60" x2="100" y2="40" stroke={color} strokeWidth="2" opacity="0.4" />
          <line x1="100" y1="100" x2="100" y2="140" stroke={color} strokeWidth="2" opacity="0.4" />
          <line x1="70" y1="70" x2="50" y2="85" stroke={color} strokeWidth="2" opacity="0.4" />
          <line x1="130" y1="70" x2="150" y2="85" stroke={color} strokeWidth="2" opacity="0.4" />
        </svg>
      )
    },
    {
      name: "Neural Network",
      description: "Brain-inspired connection nodes",
      component: (color, size = 200) => (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          {/* Connection lines */}
          <path d="M100 100 L60 60" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L140 60" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L60 140" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L140 140" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L100 40" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L100 160" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L40 100" stroke={color} strokeWidth="2" opacity="0.3" />
          <path d="M100 100 L160 100" stroke={color} strokeWidth="2" opacity="0.3" />
          
          {/* Nodes */}
          <circle cx="100" cy="100" r="20" fill={color} opacity="1" />
          <circle cx="60" cy="60" r="12" fill={color} opacity="0.7" />
          <circle cx="140" cy="60" r="12" fill={color} opacity="0.7" />
          <circle cx="60" cy="140" r="12" fill={color} opacity="0.7" />
          <circle cx="140" cy="140" r="12" fill={color} opacity="0.7" />
          <circle cx="100" cy="40" r="10" fill={color} opacity="0.5" />
          <circle cx="100" cy="160" r="10" fill={color} opacity="0.5" />
          <circle cx="40" cy="100" r="10" fill={color} opacity="0.5" />
          <circle cx="160" cy="100" r="10" fill={color} opacity="0.5" />
        </svg>
      )
    },
    {
      name: "Abstract N",
      description: "Stylized 'N' with connection theme",
      component: (color, size = 200) => (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          <defs>
            <linearGradient id="nGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Stylized N */}
          <path
            d="M50 50 L50 150 L70 150 L70 90 L130 150 L130 50 L110 50 L110 110 L50 50 Z"
            fill="url(#nGradient)"
          />
          {/* Connection nodes */}
          <circle cx="50" cy="50" r="8" fill={color} />
          <circle cx="130" cy="150" r="8" fill={color} />
          <circle cx="130" cy="50" r="8" fill={color} />
        </svg>
      )
    },
    {
      name: "Orbital Ring",
      description: "Connected rings representing unified system",
      component: (color, size = 200) => (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          {/* Outer ring */}
          <circle cx="100" cy="100" r="70" stroke={color} strokeWidth="3" opacity="0.4" fill="none" />
          {/* Middle ring */}
          <circle cx="100" cy="100" r="50" stroke={color} strokeWidth="4" opacity="0.7" fill="none" />
          {/* Inner ring */}
          <circle cx="100" cy="100" r="30" stroke={color} strokeWidth="5" opacity="1" fill="none" />
          {/* Center dot */}
          <circle cx="100" cy="100" r="8" fill={color} />
          {/* Connection points */}
          <circle cx="100" cy="30" r="6" fill={color} opacity="0.8" />
          <circle cx="100" cy="170" r="6" fill={color} opacity="0.8" />
          <circle cx="30" cy="100" r="6" fill={color} opacity="0.8" />
          <circle cx="170" cy="100" r="6" fill={color} opacity="0.8" />
        </svg>
      )
    },
    {
      name: "Code Brackets",
      description: "Development-focused with brackets",
      component: (color, size = 200) => (
        <svg width={size} height={size} viewBox="0 0 200 200" fill="none">
          {/* Left bracket */}
          <path
            d="M80 40 L50 40 L50 160 L80 160"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right bracket */}
          <path
            d="M120 40 L150 40 L150 160 L120 160"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Center element (stylized X for eXecution) */}
          <path
            d="M80 80 L120 120 M120 80 L80 120"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Connection nodes */}
          <circle cx="100" cy="100" r="8" fill={color} />
        </svg>
      )
    },
    {
      name: "Minimal Gradient",
      description: "Simple, modern wordmark with gradient",
      component: (color, size = 200) => (
        <svg width={size * 2} height={size / 2} viewBox="0 0 400 100" fill="none">
          <defs>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00D9FF" />
              <stop offset="50%" stopColor={color} />
              <stop offset="100%" stopColor="#00FF87" />
            </linearGradient>
          </defs>
          <text
            x="200"
            y="70"
            fontSize="72"
            fontWeight="700"
            fill="url(#textGradient)"
            textAnchor="middle"
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            NEXUS
          </text>
          {/* Underline accent */}
          <line x1="50" y1="85" x2="350" y2="85" stroke="url(#textGradient)" strokeWidth="3" />
        </svg>
      )
    }
  ];

  const colorSchemes = {
    cyan: "#00D9FF",
    green: "#00FF87",
    blue: "#5352ED",
    purple: "#A55EEA",
    gradient: "#00D9FF"
  };

  const [selectedColor, setSelectedColor] = useState("cyan");

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} p-8 transition-colors`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={`text-5xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            NEXUS Logo Concepts
          </h1>
          <p className={`text-xl ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Next-gen Engineering eXecution Unified System
          </p>
          
          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="mt-4 px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition-colors"
          >
            {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>

        {/* Main logo display */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-12 mb-8 shadow-2xl`}>
          <div className="flex flex-col items-center justify-center min-h-[300px]">
            {logos[selectedLogo].component(colorSchemes[selectedColor], 240)}
            <h2 className={`text-3xl font-bold mt-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {logos[selectedLogo].name}
            </h2>
            <p className={`text-lg mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {logos[selectedLogo].description}
            </p>
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-8">
          <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Select Color Scheme
          </h3>
          <div className="flex gap-3">
            {Object.entries(colorSchemes).map(([name, color]) => (
              <button
                key={name}
                onClick={() => setSelectedColor(name)}
                className={`w-12 h-12 rounded-full transition-transform ${
                  selectedColor === name ? 'ring-4 ring-offset-2 ring-offset-gray-900 scale-110' : 'hover:scale-105'
                }`}
                style={{ 
                  backgroundColor: color,
                  ringColor: color
                }}
                title={name}
              />
            ))}
          </div>
        </div>

        {/* Logo grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {logos.map((logo, index) => (
            <button
              key={index}
              onClick={() => setSelectedLogo(index)}
              className={`${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
              } rounded-xl p-6 transition-all ${
                selectedLogo === index 
                  ? 'ring-4 ring-cyan-400 scale-105' 
                  : 'hover:scale-102'
              }`}
            >
              <div className="flex items-center justify-center mb-4">
                {logo.component(colorSchemes[selectedColor], 120)}
              </div>
              <h3 className={`font-semibold text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {logo.name}
              </h3>
            </button>
          ))}
        </div>

        {/* Logo variations */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-xl`}>
          <h3 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Size Variations
          </h3>
          <div className="flex items-center justify-around gap-8 flex-wrap">
            {[64, 128, 200].map(size => (
              <div key={size} className="flex flex-col items-center gap-2">
                {logos[selectedLogo].component(colorSchemes[selectedColor], size)}
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {size}px
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Download instructions */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-xl mt-8`}>
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Export Instructions
          </h3>
          <div className={`${darkMode ? 'text-gray-300' : 'text-gray-700'} space-y-2`}>
            <p>✅ All logos are SVG-based (infinitely scalable)</p>
            <p>✅ Ready for dark and light backgrounds</p>
            <p>✅ Can be exported at any size without quality loss</p>
            <p className="mt-4 font-semibold">To use in your project:</p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Right-click on the logo display above</li>
              <li>Select "Inspect Element"</li>
              <li>Copy the SVG code</li>
              <li>Save as .svg file or use directly in your code</li>
            </ol>
          </div>
        </div>

        {/* Brand guidelines */}
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 shadow-xl mt-8`}>
          <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Brand Colors
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#00D9FF' }}></div>
              <p className={`text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>#00D9FF</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Primary Cyan</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#00FF87' }}></div>
              <p className={`text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>#00FF87</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Success Green</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#5352ED' }}></div>
              <p className={`text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>#5352ED</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Info Blue</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#A55EEA' }}></div>
              <p className={`text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>#A55EEA</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Purple Accent</p>
            </div>
            <div className="text-center">
              <div className="w-full h-24 rounded-lg mb-2" style={{ backgroundColor: '#FF4757' }}></div>
              <p className={`text-sm font-mono ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>#FF4757</p>
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Error Red</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NexusLogos;
