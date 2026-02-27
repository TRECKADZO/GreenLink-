import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { getIconComponent } from '../utils/iconMapper';

// Fallback mock data
const mockSteps = [
  {
    number: '1',
    icon: 'UserPlus',
    title: 'Inscrivez-vous',
    description: 'Créez votre profil producteur ou acheteur en 2 minutes avec notre onboarding guidé'
  },
  {
    number: '2',
    icon: 'ImagePlus',
    title: 'Déclarez vos récoltes',
    description: 'Ajoutez photos, certifications et lancez des enchères pour maximiser vos ventes'
  },
  {
    number: '3',
    icon: 'TrendingUp',
    title: 'Gagnez plus',
    description: 'Recevez des primes carbone, accédez aux acheteurs premium et suivez tout en temps réel'
  }
];

const HowItWorksSection = () => {
  const [steps, setSteps] = useState(mockSteps);

  useEffect(() => {
    const fetchSteps = async () => {
      const data = await api.getSteps();
      if (data) {
        setSteps(data);
      }
    };
    fetchSteps();
  }, []);
  
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors duration-300">
            Comment ça marche
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Simple comme bonjour
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => {
            const IconComponent = getIconComponent(step.icon);
            return (
              <Card 
                key={index} 
                className="relative p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer border-2 border-gray-100 group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#2d5a4d] to-[#d4a574] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="text-6xl font-bold text-[#2d5a4d]/10 group-hover:text-[#2d5a4d]/20 transition-colors duration-300">
                    {step.number}
                  </div>
                  <div className="w-14 h-14 bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-7 h-7 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {step.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;