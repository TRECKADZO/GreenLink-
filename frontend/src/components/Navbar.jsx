import React from 'react';
import { Sprout, LogOut } from 'lucide-react';
import { Button } from './ui/button';

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">GreenLink</h1>
            <p className="text-white/70 text-xs">Agriculture durable</p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Déconnexion
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;