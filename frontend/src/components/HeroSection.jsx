import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sprout, ArrowRight } from 'lucide-react';
import Navbar from './Navbar';
import CarbonCalculator from './CarbonCalculator';

const HeroSection = () => {
  const [showCalculator, setShowCalculator] = useState(false);

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] overflow-hidden">
      <Navbar />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-24 flex flex-col items-center justify-center min-h-screen">
        <Badge 
          variant="secondary" 
          className="mb-8 bg-white/10 backdrop-blur-sm text-white border-white/20 px-4 py-2 text-sm hover:bg-white/20 transition-all duration-300"
        >
          <Sprout className="w-4 h-4 mr-2" />
          La plateforme agricole #1 en Côte d'Ivoire
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold text-center text-white mb-6 animate-fade-in">
          Du planteur au chocolatier,<br />
          <span className="text-[#d4a574]">100% traçable & durable</span>
        </h1>
        
        <p className="text-xl text-white/90 text-center max-w-4xl mb-12 leading-relaxed">
          Marketplace B2B, crédits carbone vérifiés IA, recommandations personnalisées et 
          analytics avancés. Tout ce dont les producteurs et acheteurs ont besoin sur une seule plateforme.
        </p>
        
        <Button 
          size="lg" 
          onClick={() => setShowCalculator(true)}
          className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-8 py-6 text-lg rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          data-testid="calculate-carbon-premium-btn"
        >
          Calculer ma prime carbone
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
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