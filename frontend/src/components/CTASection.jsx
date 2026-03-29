import React from 'react';
import { Button } from './ui/button';
import { Users, ShoppingCart, Building2, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] relative overflow-hidden">
      <div className="absolute top-20 right-10 sm:right-20 w-48 sm:w-72 h-48 sm:h-72 bg-[#d4a574]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-10 sm:left-20 w-64 sm:w-96 h-64 sm:h-96 bg-[#d4a574]/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            Rejoignez la revolution agricole durable
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-white/90 max-w-3xl mx-auto px-2">
            6 mois d'essai gratuit pour les cooperatives. GreenLink aide votre cooperative a generer des credits carbone via la Strategie Nationale REDD+ tout en simplifiant les audits ARS 1000 et SSRTE.
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4">
          <Button 
            size="lg" 
            className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
            onClick={() => navigate('/register')}
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
            <span>Producteur</span>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base backdrop-blur-sm transition-all duration-300 hover:scale-105"
            onClick={() => navigate('/register')}
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
            <span>Acheteur</span>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base backdrop-blur-sm transition-all duration-300 hover:scale-105"
            onClick={() => navigate('/register')}
          >
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
            <span>RSE</span>
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-4 sm:px-6 py-4 sm:py-6 text-sm sm:text-base backdrop-blur-sm transition-all duration-300 hover:scale-105"
            onClick={() => navigate('/register')}
          >
            <Package className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2 shrink-0" />
            <span>Fournisseur</span>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
