import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Sprout, ArrowRight, Leaf, Shield, Award, Wallet, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import CarbonCalculator from './CarbonCalculator';

const HeroSection = () => {
  const [showCalculator, setShowCalculator] = useState(false);
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] overflow-hidden">
      <Navbar />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-24 flex flex-col items-center justify-center min-h-screen">
        <Badge 
          variant="secondary" 
          className="mb-5 sm:mb-8 bg-[#d4a574]/20 backdrop-blur-sm text-white border-[#d4a574]/30 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm hover:bg-[#d4a574]/30 transition-all duration-300"
        >
          <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 text-[#d4a574]" />
          Primes Carbone & Agriculture Durable
        </Badge>
        
        <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold text-center text-white mb-4 sm:mb-6 leading-tight animate-fade-in">
          Primes Carbone pour<br />
          <span className="text-[#d4a574]">l'Agriculture Durable</span>
        </h1>
        
        <p className="text-sm sm:text-lg lg:text-xl text-white/90 text-center max-w-4xl mb-6 sm:mb-8 leading-relaxed px-2">
          Recevez des primes sur Orange Money grace a vos pratiques durables.
          Score carbone, certification ARS 1000 et tracabilite complete de votre cacao.
        </p>

        {/* Carbon premium highlight */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mb-8 sm:mb-10">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-[#d4a574]/20 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-[#d4a574]/30">
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4a574]" />
            <span className="text-white font-medium text-xs sm:text-base">Prime Orange Money</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            <span className="text-white font-medium text-xs sm:text-base">Score Carbone /10</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 sm:px-4 py-1.5 sm:py-2">
            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="text-white font-medium text-xs sm:text-base">Certifie ARS 1000</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto px-2 sm:px-0">
          <Button 
            size="lg" 
            onClick={() => setShowCalculator(true)}
            className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 w-full sm:w-auto"
            data-testid="calculate-carbon-premium-btn"
          >
            Calculer ma prime carbone
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate('/register')}
            className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 sm:px-8 py-5 sm:py-6 text-base sm:text-lg rounded-lg transition-all duration-300 w-full sm:w-auto"
            data-testid="register-btn"
          >
            S'inscrire gratuitement
          </Button>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-20 right-10 sm:right-20 w-48 sm:w-72 h-48 sm:h-72 bg-[#d4a574]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 sm:left-20 w-64 sm:w-96 h-64 sm:h-96 bg-[#d4a574]/5 rounded-full blur-3xl"></div>

      <CarbonCalculator 
        isOpen={showCalculator} 
        onClose={() => setShowCalculator(false)} 
      />
    </section>
  );
};

export default HeroSection;
