import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { getIconComponent } from '../utils/iconMapper';

// Fallback mock data
const mockFeatures = [
  {
    icon: 'TreePine',
    title: 'Durabilite & Credits Carbone',
    description: 'Alignement avec les pratiques durables reconnues (Programme Tai, BMC, FCPF). Score environnemental sur 10 avec 21 pratiques evaluees et export MRV.',
    badge: 'Durable',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Leaf',
    title: 'Audits Carbone Certifies',
    description: "Auditeurs independants evaluent vos parcelles pour la certification carbone et l'eligibilite aux primes environnementales",
    badge: 'GreenLink',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Wallet',
    title: 'Primes Carbone',
    description: "Recevez des paiements Orange Money bases sur votre score carbone : jusqu'a 60 000 XOF/ha pour les meilleures pratiques",
    badge: 'Nouveau',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    icon: 'Smartphone',
    title: 'Application Mobile',
    description: 'Application mobile dediee pour les agents terrain et cooperatives. Collecte de donnees hors-ligne, synchronisation automatique',
    badge: 'Mobile',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  {
    icon: 'Shield',
    title: 'Conformite SSRTE/ICI',
    description: "Outils pour les cooperatives et agents de terrain pour le monitoring du travail des enfants selon les standards ICI",
    badge: 'ICI',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  {
    icon: 'BarChart3',
    title: 'MRV & Rapports PDF',
    description: 'Monitoring, Rapportage et Verification en temps reel. Export PDF professionnel pour le programme juridictionnel Tai et le BMC.',
    badge: 'MRV',
    badgeColor: 'bg-teal-100 text-teal-700'
  },
  {
    icon: 'Award',
    title: 'Certification Cacao Durable',
    description: "Norme Africaine pour le Cacao Durable : evaluez votre niveau Bronze, Argent ou Or via USSD et recevez des recommandations personnalisees",
    badge: 'Qualite',
    badgeColor: 'bg-yellow-100 text-yellow-700'
  },
  {
    icon: 'Building2',
    title: 'Gestion Cooperative',
    description: "Dashboard complet pour gerer membres, parcelles, primes et conformite EUDR avec export CSV et rapports PDF",
    badge: 'Pro',
    badgeColor: 'bg-slate-100 text-slate-700'
  },
  {
    icon: 'FileText',
    title: 'Rapports & Analytics',
    description: 'Tableaux de bord en temps reel, export de donnees, rapports de conformite et analyses de performance par region',
    badge: null
  }
];

const FeaturesSection = () => {
  const [features, setFeatures] = useState(mockFeatures);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      const data = await api.getFeatures();
      if (data && data.length > 0) {
        setFeatures(data);
      }
      setLoading(false);
    };
    fetchFeatures();
  }, []);
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors duration-300">
            Fonctionnalités
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Une plateforme tout-en-un
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            IA, analytics, marketplace B2B, vérification carbone et outils professionnels pour transformer l'agriculture ivoirienne
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const IconComponent = getIconComponent(feature.icon);
            return (
              <Card 
                key={index} 
                className="p-4 sm:p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200 group"
              >
                <div className="flex items-start justify-between mb-3 sm:mb-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  {feature.badge && (
                    <Badge className={`${feature.badgeColor} text-xs`}>
                      {feature.badge}
                    </Badge>
                  )}
                </div>
                <h3 className="text-base sm:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
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