import React from 'react';
import { Button } from './ui/button';
import { Users, ShoppingCart, Building2, Package } from 'lucide-react';

const CTASection = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] relative overflow-hidden">
      <div className="absolute top-20 right-20 w-72 h-72 bg-[#d4a574]/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-[#d4a574]/5 rounded-full blur-3xl"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Rejoignez la révolution agricole
          </h2>
          <p className="text-xl text-white/90 max-w-3xl mx-auto">
            Producteurs, coopératives ou entreprises RSE, créez votre compte gratuit et commencez à transformer votre activité.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold px-6 py-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <Users className="w-5 h-5 mr-2" />
            Je suis producteur
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-6 py-6 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Je suis acheteur
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-6 py-6 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <Building2 className="w-5 h-5 mr-2" />
            Entreprise RSE
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-white/10 border-white/30 text-white hover:bg-white/20 font-semibold px-6 py-6 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <Package className="w-5 h-5 mr-2" />
            Fournisseur intrants
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTASection;