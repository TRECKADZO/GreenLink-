import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { getIconComponent } from '../utils/iconMapper';

// Fallback mock data
const mockFeatures = [
  {
    icon: 'ShoppingBag',
    title: 'Marché digital',
    description: 'Achetez et vendez des récoltes avec photos, descriptions détaillées et enchères en temps réel',
    badge: 'Nouveau',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Building2',
    title: 'Marketplace RSE',
    description: 'Entreprises RSE : publiez vos besoins en crédits carbone. Producteurs : répondez aux demandes et vendez vos crédits',
    badge: 'B2B',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  {
    icon: 'Sparkles',
    title: 'Recommandations IA',
    description: 'Suggestions personnalisées de produits et producteurs basées sur votre historique d\'achats',
    badge: 'IA',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  {
    icon: 'Award',
    title: 'Vérification carbone',
    description: 'Évaluation IA des pratiques durables avec génération de certificats vérifiables conformes aux standards internationaux',
    badge: 'Gold Standard',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    icon: 'GitCompare',
    title: 'Comparateur avancé',
    description: 'Comparez jusqu\'à 4 produits côte à côte : prix, qualité, score carbone, certifications et bien plus',
    badge: 'Nouveau',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'MessageSquare',
    title: 'Messagerie & Contrats',
    description: 'Communication intégrée et contrats numériques sécurisés avec signatures électroniques',
    badge: null
  },
  {
    icon: 'BarChart3',
    title: 'Analytics & Rapports',
    description: 'Tableaux de bord détaillés, export de données, rapports automatiques et insights personnalisés',
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
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer border-gray-200 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6 text-white" />
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
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;