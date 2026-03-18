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
    badge: 'Gratuit a vie',
    badgeColor: 'green',
    features: [
      'Profil producteur verifie',
      'Vente de recoltes sur le marketplace',
      'Soumission de credits carbone',
      'Messagerie avec acheteurs',
      'Alertes prix en temps reel',
      'Acces boutique intrants',
      'Application mobile gratuite'
    ],
    cta: 'Inscription gratuite',
    ctaVariant: 'outline',
    userType: 'producteur',
  },
  {
    name: 'Cooperatives',
    price: 'GRATUIT',
    period: '',
    popular: false,
    badge: 'Gratuit a vie',
    badgeColor: 'green',
    features: [
      'Gestion complete des membres',
      'Attribution fermiers aux agents terrain',
      'Fiches ICI & SSRTE integrees',
      'Suivi completion des formulaires',
      'Distribution primes carbone',
      'Rapports EUDR automatiques',
      'Application mobile agents dediee'
    ],
    cta: 'Creer ma cooperative',
    ctaVariant: 'outline',
    userType: 'cooperative',
  },
  {
    name: 'Acheteurs',
    price: 'Sur devis',
    period: '',
    badge: '15 jours gratuits',
    badgeColor: 'green',
    popular: true,
    features: [
      '15 jours d\'essai gratuit',
      'Acces Bourse des Recoltes',
      'Propositions d\'achat illimitees',
      'Messagerie securisee vendeurs',
      'Alertes nouvelles recoltes',
      'Tableau de bord commandes',
      'Notifications temps reel'
    ],
    cta: 'Essai gratuit 15 jours',
    ctaVariant: 'default',
    userType: 'acheteur',
  },
  {
    name: 'Fournisseurs',
    price: 'Sur devis',
    period: '',
    badge: '15 jours gratuits',
    badgeColor: 'blue',
    popular: false,
    features: [
      '15 jours d\'essai gratuit',
      'Boutique en ligne dediee',
      'Gestion catalogue produits',
      'Systeme de commandes integre',
      'Statistiques de ventes',
      'Notifications temps reel',
      'Support marchand dedie'
    ],
    cta: 'Essai gratuit 15 jours',
    ctaVariant: 'outline',
    userType: 'fournisseur',
  },
  {
    name: 'Entreprises RSE',
    price: 'Sur devis',
    period: '',
    badge: '15 jours gratuits',
    badgeColor: 'blue',
    popular: false,
    features: [
      '15 jours d\'essai gratuit',
      'Achat credits carbone certifies',
      'Certificats de conformite',
      'Rapports ESG automatiques',
      'Tracabilite complete parcelle',
      'Tableau de bord impact',
      'Accompagnement RSE dedie'
    ],
    cta: 'Demander un devis',
    ctaVariant: 'outline',
    userType: 'entreprise_rse',
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
            Une offre adaptee a chaque profil
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Producteurs et cooperatives : acces gratuit a vie. Acheteurs, fournisseurs et entreprises RSE : 15 jours d'essai gratuit puis abonnement sur devis.
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
        
        <div className="mt-10 bg-gray-50 rounded-2xl p-6 max-w-3xl mx-auto">
          <h3 className="font-semibold text-gray-900 mb-3 text-center">Comment fonctionne l'abonnement sur devis ?</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-700 font-bold text-sm">1</span>
              </div>
              <p className="text-sm text-gray-600">Inscrivez-vous et profitez de <strong>15 jours gratuits</strong></p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-700 font-bold text-sm">2</span>
              </div>
              <p className="text-sm text-gray-600">Remplissez le <strong>formulaire de devis</strong> adapte a vos besoins</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-700 font-bold text-sm">3</span>
              </div>
              <p className="text-sm text-gray-600">Votre devis est <strong>approuve sous 48h</strong> et votre compte est active</p>
            </div>
          </div>
        </div>
        
        <p className="text-center text-sm text-gray-600 mt-6">
          Tous les plans incluent l'acces a la plateforme mobile et le support technique de base
        </p>
      </div>
    </section>
  );
};

export default PricingSection;