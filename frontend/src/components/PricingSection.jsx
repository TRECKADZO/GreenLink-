import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Check } from 'lucide-react';
import { api } from '../services/api';

// Fallback mock data
const mockPricingPlans = [
  {
    name: 'Producteurs',
    price: 'GRATUIT',
    period: '',
    popular: false,
    badge: 'Gratuit à vie',
    badgeColor: 'green',
    features: [
      'Profil producteur vérifié',
      'Vente de récoltes illimitée',
      'Crédits carbone illimités',
      'Messagerie & contrats',
      'Formation gratuite',
      'Alertes prix',
      'Accès boutique intrants'
    ],
    cta: 'Inscription gratuite',
    ctaVariant: 'outline'
  },
  {
    name: 'Coopératives',
    price: 'GRATUIT',
    period: '',
    popular: false,
    badge: 'Gratuit à vie',
    badgeColor: 'green',
    features: [
      'Gestion complète des membres',
      'Distribution des primes carbone',
      'Rapports EUDR automatiques',
      'Génération de reçus PDF',
      'Notifications push aux membres',
      'Application mobile dédiée',
      'Support prioritaire'
    ],
    cta: 'Créer ma coopérative',
    ctaVariant: 'outline'
  },
  {
    name: 'Acheteurs',
    price: '49 000 XOF',
    period: '/mois',
    badge: '15 jours gratuits',
    badgeColor: 'blue',
    popular: true,
    features: [
      'Recommandations IA',
      'Comparateur avancé',
      'Filtres granulaires',
      'Analytics détaillés',
      'Export de données',
      'Support prioritaire',
      'Badge vérifié'
    ],
    cta: 'Essai gratuit 15 jours',
    ctaVariant: 'default'
  },
  {
    name: 'Fournisseurs',
    price: '29 000 XOF',
    period: '/mois',
    badge: '15 jours gratuits + 5% commission',
    badgeColor: 'blue',
    popular: false,
    features: [
      'Boutique en ligne dédiée',
      'Gestion catalogue produits',
      'Système de commandes',
      'Paiement sécurisé',
      'Statistiques de ventes',
      'Notifications temps réel',
      'Support marchand'
    ],
    cta: 'Essai gratuit 15 jours',
    ctaVariant: 'outline'
  },
  {
    name: 'Entreprises RSE',
    price: 'Sur devis',
    period: '',
    badge: '15 jours gratuits',
    badgeColor: 'blue',
    popular: false,
    features: [
      'Publication demandes illimitées',
      'Vérification IA des crédits',
      'Certificats conformes',
      'Rapports ESG automatiques',
      'Traçabilité complète',
      'API & intégrations',
      'Support dédié',
      'Accompagnement RSE'
    ],
    cta: 'Demander un devis',
    ctaVariant: 'outline'
  }
];

const PricingSection = () => {
  const [pricingPlans, setPricingPlans] = useState(mockPricingPlans);

  useEffect(() => {
    const fetchPricingPlans = async () => {
      const data = await api.getPricingPlans();
      // Only use API data if it has plans, otherwise keep mock
      if (data && data.length > 0) {
        setPricingPlans(data);
      }
    };
    fetchPricingPlans();
  }, []);
  
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors duration-300">
            Tarifs
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Une offre adaptée à chaque profil
          </h2>
          <p className="text-xl text-gray-600">
            Plans flexibles pour producteurs, acheteurs, entreprises RSE et fournisseurs
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-12">
          {pricingPlans.map((plan, index) => (
            <Card 
              key={index} 
              className={`p-6 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 cursor-pointer relative overflow-hidden ${
                plan.popular ? 'border-2 border-[#2d5a4d] shadow-lg' : 'border-2 border-gray-100'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0">
                  <Badge className="w-full rounded-t-lg rounded-b-none bg-[#2d5a4d] text-white hover:bg-[#2d5a4d]">
                    Populaire
                  </Badge>
                </div>
              )}
              
              <div className={plan.popular ? 'mt-6' : ''}>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {plan.name}
                </h3>
                
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-600 text-sm">{plan.period}</span>}
                  {plan.badge && (
                    <Badge className={`ml-2 text-xs ${
                      plan.badgeColor === 'green' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {plan.badge}
                    </Badge>
                  )}
                </div>
                
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-sm text-gray-600">
                      <Check className="w-4 h-4 text-[#2d5a4d] mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${
                    plan.ctaVariant === 'default' 
                      ? 'bg-[#2d5a4d] hover:bg-[#1a4038] text-white' 
                      : 'border-[#2d5a4d] text-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white'
                  } transition-all duration-300`}
                  variant={plan.ctaVariant}
                >
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-sm text-gray-600">
          Tous les plans incluent l'accès à la plateforme mobile et le support technique de base
        </p>
      </div>
    </section>
  );
};

export default PricingSection;