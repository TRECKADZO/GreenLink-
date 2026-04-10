import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Handshake } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PartnersSection = () => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/partners`);
        if (response.data && response.data.length > 0) {
          setPartners(response.data);
        }
      } catch (error) {
        // no partners found;
      } finally {
        setLoading(false);
      }
    };
    fetchPartners();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ne pas afficher la section s'il n'y a pas de partenaires
  if (loading) return null;
  if (partners.length === 0) return null;
  
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors duration-300">
            Écosystème
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Ils nous font confiance
          </h2>
          <p className="text-xl text-gray-600">
            Nos partenaires pour une agriculture durable en Côte d'Ivoire
          </p>
        </div>
        
        <div className={`grid gap-6 mb-12 ${
          partners.length === 1 ? 'max-w-xs mx-auto' :
          partners.length === 2 ? 'md:grid-cols-2 max-w-2xl mx-auto' :
          partners.length === 3 ? 'md:grid-cols-3 max-w-4xl mx-auto' :
          'md:grid-cols-2 lg:grid-cols-4'
        }`}>
          {partners.map((partner, index) => (
            <Card 
              key={partner._id || index} 
              className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-2 border-gray-100 group text-center"
            >
              {partner.logo ? (
                <img 
                  src={partner.logo} 
                  alt={partner.name}
                  className="h-16 mx-auto mb-4 object-contain group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className={`w-16 h-16 ${partner.color || 'bg-[#2d5a4d]'} rounded-full mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <span className="text-white text-xl font-bold">
                    {partner.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                  </span>
                </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {partner.name}
              </h3>
              <p className="text-sm text-gray-600">{partner.description}</p>
              {partner.type && (
                <Badge className="mt-3 bg-gray-100 text-gray-600">
                  {partner.type === 'payment' ? 'Paiement' : 
                   partner.type === 'certification' ? 'Certification' :
                   partner.type === 'logistics' ? 'Logistique' : 
                   partner.type === 'technology' ? 'Technologie' :
                   partner.type === 'finance' ? 'Finance' :
                   partner.type === 'government' ? 'Gouvernement' :
                   partner.type}
                </Badge>
              )}
              {partner.website && (
                <a 
                  href={partner.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-[#2d5a4d] hover:underline mt-2 block"
                >
                  Visiter le site →
                </a>
              )}
            </Card>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Vous souhaitez devenir partenaire de GreenLink?
          </p>
          <Button 
            variant="outline" 
            size="lg"
            className="border-[#2d5a4d] text-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white transition-all duration-300"
            onClick={() => window.location.href = 'mailto:partenariats@greenlink-agritech.com'}
          >
            <Handshake className="mr-2 w-4 h-4" />
            Devenir Partenaire
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
