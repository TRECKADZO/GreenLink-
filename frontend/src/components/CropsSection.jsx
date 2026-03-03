import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { MapPin } from 'lucide-react';

// Cultures supportées : Cacao, Café, Anacarde avec images
const mockCrops = [
  {
    icon: '🍫',
    title: 'Cacao',
    locations: 'Bouaflé, Daloa, Soubré, Gagnoa',
    color: 'from-amber-600 to-amber-800',
    image: 'https://images.unsplash.com/photo-1634303316622-33b4d64f1f65?w=400&h=300&fit=crop'
  },
  {
    icon: '☕',
    title: 'Café',
    locations: 'Man, Danané, Biankouma',
    color: 'from-amber-700 to-amber-900',
    image: 'https://images.unsplash.com/photo-1654815439629-5e93cb7f74a1?w=400&h=300&fit=crop'
  },
  {
    icon: '🥜',
    title: 'Anacarde',
    locations: 'Korhogo, Boundiali, Ferkessédougou',
    color: 'from-orange-600 to-orange-800',
    image: 'https://images.unsplash.com/photo-1671558694488-a31f9b6f4700?w=400&h=300&fit=crop'
  }
];

const CropsSection = () => {
  const [crops, setCrops] = useState(mockCrops);

  useEffect(() => {
    const fetchCrops = async () => {
      const data = await api.getCrops();
      // Ne mettre à jour que si l'API retourne des données non-vides
      if (data && data.length > 0) {
        setCrops(data);
      }
    };
    fetchCrops();
  }, []);
  
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
            Cacao, Café et Anacarde de Côte d'Ivoire
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {crops.map((crop, index) => (
            <Card 
              key={index} 
              className="overflow-hidden hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-0 group"
            >
              {/* Image de la culture */}
              <div className="relative h-48 overflow-hidden">
                {crop.image ? (
                  <img 
                    src={crop.image} 
                    alt={crop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${crop.color} flex items-center justify-center`}>
                    <span className="text-6xl">{crop.icon}</span>
                  </div>
                )}
                {/* Badge superposé */}
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/90 text-gray-800 font-semibold shadow-lg">
                    {crop.icon} {crop.title}
                  </Badge>
                </div>
              </div>
              
              {/* Contenu */}
              <div className="p-5 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {crop.title}
                </h3>
                <div className="flex items-center text-gray-600 mb-3">
                  <MapPin className="w-4 h-4 mr-2 text-[#2d5a4d]" />
                  <span className="text-sm">{crop.locations}</span>
                </div>
                <div className={`h-1 w-16 bg-gradient-to-r ${crop.color} rounded-full`}></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CropsSection;