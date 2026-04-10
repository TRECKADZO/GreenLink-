import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { api } from '../services/api';
import { getIconComponent } from '../utils/iconMapper';

// Fallback mock data
const mockFeatures = [
  {
    icon: 'Wallet',
    title: 'Primes Carbone',
    description: 'Recevez des paiements Orange Money bases sur votre score carbone pour vos meilleures pratiques durables.',
    badge: 'Prime',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    icon: 'BarChart3',
    title: 'Score Carbone & MRV',
    description: 'Score environnemental sur 10 avec 21 pratiques evaluees, MRV en temps reel, export MRV et alignement EUDR.',
    badge: 'Carbone',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Award',
    title: 'Audits & Verification',
    description: 'Auditeurs independants, visites terrain en 10 etapes (7 fiches + Photos + Signatures), GPS et verification des parcelles.',
    badge: 'Audit',
    badgeColor: 'bg-purple-100 text-purple-700'
  },
  {
    icon: 'Shield',
    title: 'Certification ARS 1000',
    description: 'Norme Africaine pour le Cacao Durable : PDC 7 fiches, certification Bronze/Argent/Or, audits de conformite et suivi cooperatif complet.',
    badge: 'ARS 1000',
    badgeColor: 'bg-yellow-100 text-yellow-700'
  },
  {
    icon: 'TreePine',
    title: 'Diagnostic Agroforestier',
    description: '54 especes referencees, diagnostic visuel cooperatif, alertes non-conformes par planteur, score d\'ombrage et recommandations intelligentes.',
    badge: 'Agroforesterie',
    badgeColor: 'bg-emerald-100 text-emerald-700'
  },
  {
    icon: 'Leaf',
    title: 'Protection Environnementale',
    description: 'Score de conformite environnementale, checklist ARS 1000 (distance eau, anti-erosion, reboisement, zone tampon).',
    badge: 'Environnement',
    badgeColor: 'bg-green-100 text-green-700'
  },
  {
    icon: 'Package',
    title: 'Tracabilite des Lots',
    description: 'Controles qualite ARS 1000-2 : humidite, tamisage, epreuve de coupe, grading A/B/C/D et rapports d\'essai certifies.',
    badge: 'Qualite',
    badgeColor: 'bg-teal-100 text-teal-700'
  },
  {
    icon: 'Wheat',
    title: 'Gestion des Recoltes',
    description: 'Declarations de recolte, validation cooperative, revenu estime par grade (1250 FCFA/kg Grade A), alertes qualite et analytics.',
    badge: 'Recoltes',
    badgeColor: 'bg-amber-100 text-amber-700'
  },
  {
    icon: 'FileText',
    title: 'Export PDF & Excel',
    description: 'Generation automatique de PDC 10 pages PDF, fichiers Excel 7 onglets par planteur, rapports d\'essai et fiches de tracabilite.',
    badge: 'Documents',
    badgeColor: 'bg-blue-100 text-blue-700'
  },
  {
    icon: 'AlertTriangle',
    title: 'Matrice de Risques',
    description: 'Matrice visuelle 5x5 (probabilite x gravite), registre de reclamations, suivi d\'impartialite et gestion des non-conformites.',
    badge: 'Risques',
    badgeColor: 'bg-red-100 text-red-700'
  },
  {
    icon: 'Smartphone',
    title: 'USSD & Mobile',
    description: 'Acces USSD (*144*99#) pour les planteurs sans smartphone, application mobile agents terrain, collecte hors-ligne.',
    badge: 'Mobile',
    badgeColor: 'bg-orange-100 text-orange-700'
  },
  {
    icon: 'Building2',
    title: 'Tableau de Bord Cooperative',
    description: 'Dashboard complet multi-roles, gestion des membres, parcelles, primes carbone, conformite SSRTE/ICI et analytics avances.',
    badge: 'Pro',
    badgeColor: 'bg-slate-100 text-slate-700'
  }
];

const FeaturesSection = () => {
  const [features, setFeatures] = useState(mockFeatures);
  const [loading, setLoading] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const fetchFeatures = async () => {
      const data = await api.getFeatures();
      if (data && data.length > 0) {
        setFeatures(data);
      }
      setLoading(false);
    };
    fetchFeatures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-16">
          <Badge className="mb-3 sm:mb-4 bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors duration-300">
            Prime Carbone & Outils
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4">
            Gagnez plus avec vos pratiques durables
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto px-2">
            Primes carbone Orange Money, certification ARS 1000, tracabilite des lots, diagnostic agroforestier et analytics avances
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {features.map((feature, index) => {
            const IconComponent = getIconComponent(feature.icon);
            return (
              <Card 
                key={`el-${index}`} 
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