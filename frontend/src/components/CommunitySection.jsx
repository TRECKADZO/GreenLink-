import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { ArrowRight } from 'lucide-react';

const producers = [
  { name: 'Kouadio Yao', initial: 'KY', crop: 'Cacao', location: 'Soubré', color: 'bg-amber-600' },
  { name: 'Aminata Koné', initial: 'AK', crop: 'Anacarde', location: 'Korhogo', color: 'bg-orange-600' },
  { name: 'Jean Bakayoko', initial: 'JB', crop: 'Café', location: 'Man', color: 'bg-amber-700' },
  { name: 'Fatou Sangaré', initial: 'FS', crop: 'Maraîchage', location: 'Abidjan', color: 'bg-emerald-600' }
];

const CommunitySection = () => {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors duration-300">
            Communauté Active
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Nos membres actifs
          </h2>
          <p className="text-xl text-gray-600">
            Producteurs et acheteurs qui transforment l'agriculture ivoirienne
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {producers.map((producer, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-gray-100 group"
            >
              <Avatar className="w-16 h-16 mb-4 group-hover:scale-110 transition-transform duration-300">
                <AvatarFallback className={`${producer.color} text-white text-lg font-semibold`}>
                  {producer.initial}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {producer.name}
              </h3>
              <p className="text-sm text-gray-600 mb-1">{producer.crop}</p>
              <p className="text-xs text-gray-500">{producer.location}</p>
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg"
            className="border-[#2d5a4d] text-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white transition-all duration-300"
          >
            Voir tous les producteurs
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CommunitySection;