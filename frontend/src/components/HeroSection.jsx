import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sprout, ArrowRight, Leaf, Shield, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import CarbonCalculator from './CarbonCalculator';

const HeroSection = () => {
  const [showCalculator, setShowCalculator] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] overflow-hidden">
      <Navbar />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center min-h-screen">
        <Badge 
          variant="secondary" 
          className="mb-8 bg-white/10 backdrop-blur-sm text-white border-white/20 px-4 py-2 text-sm hover:bg-white/20 transition-all duration-300"
        >
          <Sprout className="w-4 h-4 mr-2" />
          Plateforme Carbone & Traçabilité pour la Côte d'Ivoire
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold text-center text-white mb-6 animate-fade-in">
          Primes Carbone pour<br />
          <span className="text-[#d4a574]">l'Agriculture Durable</span>
        </h1>
        
        <p className="text-xl text-white/90 text-center max-w-4xl mb-8 leading-relaxed">
          Coopératives, producteurs et auditeurs : gérez vos parcelles, recevez des primes carbone 
          sur Orange Money et assurez la conformité EUDR & SSRTE/ICI. Accès USSD disponible.
        </p>

        {/* Quick stats */}
        <div className="flex flex-wrap justify-center gap-6 mb-10">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">Conforme EUDR</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <span className="text-white font-medium">Traçabilité Carbone</span>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={() => setShowCalculator(true)}
            className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-8 py-6 text-lg rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            data-testid="calculate-carbon-premium-btn"
          >
            Calculer ma prime carbone
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate('/register')}
            className="border-white/30 text-white hover:bg-white/10 font-semibold px-8 py-6 text-lg rounded-lg transition-all duration-300"
            data-testid="register-btn"
          >
            S'inscrire gratuitement
          </Button>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#d4a574]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#d4a574]/5 rounded-full blur-3xl"></div>

      {/* Carbon Calculator Modal */}
      <CarbonCalculator 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />
    </section>
  );
};

export default HeroSection;