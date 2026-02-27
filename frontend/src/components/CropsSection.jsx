import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Coffee, Leaf, MapPin } from 'lucide-react';

const crops = [
  {
    icon: '🍫',
    title: 'Cacao',
    locations: 'Bouaflé, Daloa, Soubré',
    color: 'from-amber-600 to-amber-800'
  },
  {
    icon: '☕',
    title: 'Café',
    locations: 'Man, Danané',
    color: 'from-amber-700 to-amber-900'
  },
  {
    icon: '🥜',
    title: 'Anacarde',
    locations: 'Korhogo, Boundiali',
    color: 'from-orange-600 to-orange-800'
  },
  {
    icon: '🌳',
    title: 'Hévéa',
    locations: 'Grand-Lahou, Dabou',
    color: 'from-green-600 to-green-800'
  },
  {
    icon: '🌾',
    title: 'Riz',
    locations: 'Nord et Centre',
    color: 'from-yellow-600 to-yellow-800'
  },
  {
    icon: '🥬',
    title: 'Maraîchage',
    locations: 'Toute la Côte d\'Ivoire',
    color: 'from-emerald-600 to-emerald-800'
  }
];

const CropsSection = () => {
  return (
    <section className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-green-100 text-green-700 hover:bg-green-200 transition-colors duration-300">
            Filières
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Toutes les cultures supportées
          </h2>
          <p className="text-xl text-gray-600">
            Du cacao premium au maraîchage local
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {crops.map((crop, index) => (
            <Card 
              key={index} 
              className="p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-gray-100 group overflow-hidden relative"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${crop.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
              
              <div className="relative z-10">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {crop.icon}
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {crop.title}
                </h3>
                <div className="flex items-center text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span className="text-sm">{crop.locations}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CropsSection;