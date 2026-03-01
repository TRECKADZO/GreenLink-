import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { getIconComponent } from '../utils/iconMapper';

// Fallback mock data
const mockFeatures = [
  {
    icon: 'Leaf',
    title: 'Audits Carbone Certifiés',
    description: 'Auditeurs indépendants évaluent vos parcelles pour la certification carbone et l\'éligibilité aux primes environnementales',
    badge: 'GreenLink',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Wallet',
    title: 'Primes Carbone',
    description: 'Recevez des paiements Orange Money basés sur votre score carbone : jusqu\'à 60 000 FCFA/ha pour les meilleures pratiques',
    badge: 'Nouveau',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    icon: 'Smartphone',
    title: 'Accès USSD/SMS',
    description: 'Consultez vos parcelles, primes et paiements sans internet via *123*45# ou SMS au 1234. Disponible en français, baoulé et dioula',
    badge: 'Offline',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  {
    icon: 'Shield',
    title: 'Conformité SSRTE/ICI',
    description: 'Outils pour les coopératives et agents de terrain pour le monitoring du travail des enfants selon les standards ICI',
    badge: 'ICI',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  {
    icon: 'Award',
    title: 'Badges Auditeurs',
    description: 'Système de gamification pour récompenser les auditeurs les plus performants : Débutant, Bronze, Argent, Or, Platine',
    badge: 'Gamification',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  {
    icon: 'Building2',
    title: 'Gestion Coopérative',
    description: 'Dashboard complet pour gérer membres, parcelles, primes et conformité EUDR avec export CSV et rapports PDF',
    badge: 'Pro',
    badgeColor: 'bg-slate-100 text-slate-700'
  },
  {
    icon: 'FileText',
    title: 'Rapports & Analytics',
    description: 'Tableaux de bord en temps réel, export de données, rapports de conformité et analyses de performance par région',
    badge: null
  }
];

const FeaturesSection = () => {
  const [features, setFeatures] = useState(mockFeatures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      const data = await api.getFeatures();
      if (data) {
        setFeatures(data);
      }
      setLoading(false);
    };
    fetchFeatures();
  }, []);
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors duration-300">
            Fonctionnalités
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Une plateforme tout-en-un
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            IA, analytics, marketplace B2B, vérification carbone et outils professionnels pour transformer l'agriculture ivoirienne
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const IconComponent = getIconComponent(feature.icon);
            return (
              <Card 
                key={index} 
                className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200 group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  {feature.badge && (
                    <Badge className={`${feature.badgeColor} text-xs`}>
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;