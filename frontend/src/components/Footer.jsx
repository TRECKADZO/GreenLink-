import React from 'react';
import { Card } from './ui/card';
import { Sprout, Phone, MessageSquare, Zap } from 'lucide-react';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-white to-gray-50">
      {/* SMS & Data Mode Section */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <MessageSquare className="w-6 h-6 text-blue-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Commandes SMS</h3>
                  <p className="text-sm text-gray-600">Utilisez GreenLink sans internet</p>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 border-2 border-gray-200 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-4">
                <Zap className="w-6 h-6 text-amber-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Mode économie de données</h3>
                  <p className="text-sm text-gray-600">Expérience complète activée</p>
                  <p className="text-xs text-gray-500 mt-1">Connexion détectée: 4G</p>
                </div>
              </div>
              <Switch defaultChecked />
            </div>
          </Card>
        </div>
      </div>
      
      <Separator className="max-w-7xl mx-auto" />
      
      {/* Main Footer */}
      <div className="bg-[#2d5a4d] text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Contact */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-[#d4a574] rounded-lg flex items-center justify-center">
                  <Sprout className="w-6 h-6 text-[#2d5a4d]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">GreenLink</h3>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-300">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+225 07 87 76 10 23</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-300">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+225 01 53 05 27 05</span>
                </div>
                <div className="flex items-center gap-2 text-white/80 hover:text-white transition-colors duration-300">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">+1 514 476-7340</span>
                </div>
              </div>
            </div>
            
            {/* Links */}
            <div>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-white/80 hover:text-white text-sm transition-colors duration-300">
                    Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/80 hover:text-white text-sm transition-colors duration-300">
                    Confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/80 hover:text-white text-sm transition-colors duration-300">
                    Sécurité
                  </a>
                </li>
              </ul>
            </div>
            
            {/* Copyright */}
            <div className="text-right">
              <p className="text-white/60 text-sm">
                © 2025 GreenLink. Agriculture durable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;