import React, { useState } from 'react';
import { MapPin, TreePine, Users, Leaf } from 'lucide-react';

// Coordonnées SVG simplifiées des régions cacaoyères de Côte d'Ivoire
const REGIONS_DATA = {
  'Daloa': { 
    path: 'M 280 200 L 320 180 L 350 200 L 340 240 L 300 250 L 270 230 Z',
    center: { x: 310, y: 215 },
    stats: { farmers: 450, trees: 25000, hectares: 1200, co2: 150 }
  },
  'Bouaflé': { 
    path: 'M 350 160 L 390 150 L 410 180 L 400 220 L 360 230 L 340 200 Z',
    center: { x: 375, y: 190 },
    stats: { farmers: 320, trees: 18000, hectares: 850, co2: 95 }
  },
  'Soubré': { 
    path: 'M 250 260 L 290 250 L 310 280 L 300 320 L 260 330 L 240 300 Z',
    center: { x: 275, y: 290 },
    stats: { farmers: 580, trees: 32000, hectares: 1500, co2: 180 }
  },
  'San-Pédro': { 
    path: 'M 220 330 L 260 320 L 280 350 L 270 390 L 230 400 L 210 370 Z',
    center: { x: 245, y: 360 },
    stats: { farmers: 420, trees: 22000, hectares: 980, co2: 120 }
  },
  'Gagnoa': { 
    path: 'M 320 230 L 360 220 L 380 250 L 370 290 L 330 300 L 310 270 Z',
    center: { x: 345, y: 260 },
    stats: { farmers: 380, trees: 20000, hectares: 920, co2: 110 }
  },
  'Divo': { 
    path: 'M 380 240 L 420 230 L 440 260 L 430 300 L 390 310 L 370 280 Z',
    center: { x: 405, y: 270 },
    stats: { farmers: 290, trees: 15000, hectares: 680, co2: 85 }
  },
  'Abengourou': { 
    path: 'M 480 180 L 520 170 L 540 200 L 530 240 L 490 250 L 470 220 Z',
    center: { x: 505, y: 210 },
    stats: { farmers: 340, trees: 19000, hectares: 870, co2: 100 }
  },
  'Marahoué': { 
    path: 'M 300 140 L 340 130 L 360 160 L 350 200 L 310 210 L 290 180 Z',
    center: { x: 325, y: 170 },
    stats: { farmers: 260, trees: 14000, hectares: 620, co2: 75 }
  }
};

const InteractiveMap = ({ activeRegions = [], onRegionClick }) => {
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState(null);

  const handleRegionClick = (regionName) => {
    setSelectedRegion(selectedRegion === regionName ? null : regionName);
    if (onRegionClick) onRegionClick(regionName);
  };

  const isRegionActive = (regionName) => {
    return activeRegions.includes(regionName);
  };

  return (
    <div className="relative">
      {/* SVG Map */}
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl p-4 overflow-hidden">
        <svg 
          viewBox="180 100 450 350" 
          className="w-full h-auto max-h-[500px]"
          style={{ minHeight: '400px' }}
        >
          {/* Background - Côte d'Ivoire outline */}
          <path
            d="M 200 120 L 300 100 L 450 110 L 550 150 L 580 250 L 560 350 L 500 420 L 400 450 L 250 430 L 200 350 L 190 250 Z"
            fill="#e8f5e9"
            stroke="#81c784"
            strokeWidth="2"
          />
          
          {/* Ocean/Gulf of Guinea */}
          <path
            d="M 180 380 Q 300 450, 500 420 L 500 480 L 180 480 Z"
            fill="#bbdefb"
            opacity="0.5"
          />
          <text x="300" y="460" fill="#1976d2" fontSize="12" fontWeight="bold">
            Golfe de Guinée
          </text>

          {/* Regions */}
          {Object.entries(REGIONS_DATA).map(([name, data]) => {
            const isActive = isRegionActive(name);
            const isHovered = hoveredRegion === name;
            const isSelected = selectedRegion === name;
            
            return (
              <g key={name}>
                <path
                  d={data.path}
                  fill={isActive ? (isSelected ? '#2e7d32' : isHovered ? '#4caf50' : '#66bb6a') : '#e0e0e0'}
                  stroke={isActive ? '#1b5e20' : '#9e9e9e'}
                  strokeWidth={isSelected ? 3 : 2}
                  className={`transition-all duration-300 ${isActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  onMouseEnter={() => setHoveredRegion(name)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onClick={() => isActive && handleRegionClick(name)}
                  style={{
                    filter: isHovered && isActive ? 'brightness(1.1)' : 'none',
                    transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                    transformOrigin: `${data.center.x}px ${data.center.y}px`
                  }}
                />
                {/* Region Label */}
                <text
                  x={data.center.x}
                  y={data.center.y}
                  textAnchor="middle"
                  fill={isActive ? '#fff' : '#666'}
                  fontSize="11"
                  fontWeight="bold"
                  className="pointer-events-none"
                  style={{ textShadow: isActive ? '1px 1px 2px rgba(0,0,0,0.5)' : 'none' }}
                >
                  {name}
                </text>
                {/* Active indicator */}
                {isActive && (
                  <circle
                    cx={data.center.x + 25}
                    cy={data.center.y - 15}
                    r="6"
                    fill="#ffeb3b"
                    stroke="#f57f17"
                    strokeWidth="2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          })}

          {/* Major cities markers */}
          <g>
            <circle cx="470" cy="320" r="8" fill="#d32f2f" />
            <text x="470" y="340" textAnchor="middle" fill="#333" fontSize="14" fontWeight="bold">
              Abidjan
            </text>
          </g>
          <g>
            <circle cx="380" cy="140" r="6" fill="#1976d2" />
            <text x="380" y="130" textAnchor="middle" fill="#333" fontSize="11" fontWeight="bold">
              Yamoussoukro
            </text>
          </g>

          {/* Legend */}
          <g transform="translate(190, 130)">
            <rect x="0" y="0" width="100" height="70" fill="white" rx="5" opacity="0.9" />
            <text x="10" y="18" fontSize="10" fontWeight="bold" fill="#333">Légende</text>
            <rect x="10" y="25" width="15" height="15" fill="#66bb6a" />
            <text x="30" y="37" fontSize="9" fill="#333">Région active</text>
            <rect x="10" y="45" width="15" height="15" fill="#e0e0e0" />
            <text x="30" y="57" fontSize="9" fill="#333">Région inactive</text>
          </g>
        </svg>
      </div>

      {/* Region Details Panel */}
      {selectedRegion && REGIONS_DATA[selectedRegion] && (
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl p-5 w-72 border-l-4 border-green-500 animate-in slide-in-from-right">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              {selectedRegion}
            </h3>
            <button 
              onClick={() => setSelectedRegion(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <Users className="w-5 h-5 text-green-600 mb-1" />
              <p className="text-xl font-bold text-green-800">
                {REGIONS_DATA[selectedRegion].stats.farmers}
              </p>
              <p className="text-xs text-green-600">Agriculteurs</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-lg">
              <TreePine className="w-5 h-5 text-emerald-600 mb-1" />
              <p className="text-xl font-bold text-emerald-800">
                {REGIONS_DATA[selectedRegion].stats.trees.toLocaleString()}
              </p>
              <p className="text-xs text-emerald-600">Arbres</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-600 mb-1" />
              <p className="text-xl font-bold text-blue-800">
                {REGIONS_DATA[selectedRegion].stats.hectares}
              </p>
              <p className="text-xs text-blue-600">Hectares</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <Leaf className="w-5 h-5 text-purple-600 mb-1" />
              <p className="text-xl font-bold text-purple-800">
                {REGIONS_DATA[selectedRegion].stats.co2}t
              </p>
              <p className="text-xs text-purple-600">CO₂ compensé</p>
            </div>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoveredRegion && !selectedRegion && isRegionActive(hoveredRegion) && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-4 py-2 pointer-events-none">
          <p className="text-sm font-semibold text-gray-900">{hoveredRegion}</p>
          <p className="text-xs text-gray-500">Cliquez pour voir les détails</p>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
