import React, { useState } from 'react';
import { MapPin, TreePine, Users, Leaf, X } from 'lucide-react';

// Positions des régions cacaoyères sur la carte de Côte d'Ivoire
const REGIONS_DATA = {
  'Daloa': { 
    x: 35, y: 45,
    stats: { farmers: 450, trees: 25000, hectares: 1200, co2: 150 }
  },
  'Bouaflé': { 
    x: 45, y: 35,
    stats: { farmers: 320, trees: 18000, hectares: 850, co2: 95 }
  },
  'Soubré': { 
    x: 28, y: 58,
    stats: { farmers: 580, trees: 32000, hectares: 1500, co2: 180 }
  },
  'San-Pédro': { 
    x: 22, y: 70,
    stats: { farmers: 420, trees: 22000, hectares: 980, co2: 120 }
  },
  'Gagnoa': { 
    x: 40, y: 52,
    stats: { farmers: 380, trees: 20000, hectares: 920, co2: 110 }
  },
  'Divo': { 
    x: 52, y: 55,
    stats: { farmers: 290, trees: 15000, hectares: 680, co2: 85 }
  },
  'Abengourou': { 
    x: 72, y: 42,
    stats: { farmers: 340, trees: 19000, hectares: 870, co2: 100 }
  },
  'Marahoué': { 
    x: 38, y: 38,
    stats: { farmers: 260, trees: 14000, hectares: 620, co2: 75 }
  }
};

const InteractiveMap = ({ activeRegions = [], onRegionClick }) => {
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
      {/* Map Container */}
      <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-6 overflow-hidden min-h-[450px]">
        
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2322c55e' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>

        {/* Côte d'Ivoire SVG Shape */}
        <svg 
          viewBox="0 0 100 100" 
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Country outline */}
          <path
            d="M 15 15 Q 30 8, 55 10 Q 80 12, 88 25 Q 92 45, 90 60 Q 85 78, 70 88 Q 50 95, 30 90 Q 15 85, 10 70 Q 8 50, 12 30 Q 14 20, 15 15"
            fill="#dcfce7"
            stroke="#22c55e"
            strokeWidth="1"
            opacity="0.6"
          />
          
          {/* Ocean */}
          <path
            d="M 8 75 Q 40 95, 75 85 L 75 100 L 8 100 Z"
            fill="#bfdbfe"
            opacity="0.4"
          />
        </svg>

        {/* Region Markers */}
        {Object.entries(REGIONS_DATA).map(([name, data]) => {
          const isActive = isRegionActive(name);
          const isSelected = selectedRegion === name;
          
          return (
            <div
              key={name}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300"
              style={{ 
                left: `${data.x}%`, 
                top: `${data.y}%`,
                zIndex: isSelected ? 20 : 10
              }}
              onClick={() => isActive && handleRegionClick(name)}
            >
              {/* Pulse animation for active regions */}
              {isActive && (
                <div className="absolute inset-0 -m-2">
                  <div className={`w-12 h-12 rounded-full ${isSelected ? 'bg-green-400' : 'bg-green-300'} animate-ping opacity-30`}></div>
                </div>
              )}
              
              {/* Region Circle */}
              <div 
                className={`
                  relative w-10 h-10 rounded-full flex items-center justify-center
                  transition-all duration-300 shadow-lg
                  ${isActive 
                    ? isSelected 
                      ? 'bg-green-600 scale-125 ring-4 ring-green-300' 
                      : 'bg-green-500 hover:bg-green-600 hover:scale-110'
                    : 'bg-gray-300 cursor-not-allowed'
                  }
                `}
              >
                {isActive && (
                  <MapPin className="w-5 h-5 text-white" />
                )}
              </div>
              
              {/* Region Label */}
              <div className={`
                absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap
                text-xs font-bold px-2 py-0.5 rounded
                ${isActive 
                  ? 'bg-green-800 text-white' 
                  : 'bg-gray-200 text-gray-500'
                }
              `}>
                {name}
              </div>
            </div>
          );
        })}

        {/* Major Cities */}
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: '65%', top: '60%' }}
        >
          <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-md"></div>
          <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-bold text-gray-700 whitespace-nowrap">
            Abidjan
          </span>
        </div>
        
        <div 
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{ left: '50%', top: '30%' }}
        >
          <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>
          <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 whitespace-nowrap">
            Yamoussoukro
          </span>
        </div>

        {/* Legend */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <h4 className="text-xs font-bold text-gray-700 mb-2">Légende</h4>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-xs text-gray-600">Région active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-300"></div>
            <span className="text-xs text-gray-600">Région inactive</span>
          </div>
        </div>
        
        {/* Ocean Label */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <span className="text-sm text-blue-400 font-medium opacity-70">
            🌊 Golfe de Guinée
          </span>
        </div>
      </div>

      {/* Region Details Panel */}
      {selectedRegion && REGIONS_DATA[selectedRegion] && (
        <div className="absolute top-4 right-4 bg-white rounded-xl shadow-2xl p-5 w-72 border-l-4 border-green-500 z-30 animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-green-600" />
              {selectedRegion}
            </h3>
            <button 
              onClick={() => setSelectedRegion(null)}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
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
          
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              📍 Zone cacaoyère majeure
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
