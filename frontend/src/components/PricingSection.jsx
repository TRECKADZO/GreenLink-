import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Check, TreePine, Shield, FileCheck, Zap,
  Leaf, BarChart3, Globe, ChevronRight, Sparkles,
} from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const allFeatures = [
  'Dashboard complet avec KPIs durabilite, SSRTE & ICI',
  'Rapports de certification automatises (Bronze/Argent/Or)',
  'Suivi avance : emissions, agroforesterie, MRV',
  'Rapports detailles SSRTE / ICI (Remediation)',
  'Zero-deforestation + donnees geolocalisees',
  'Export PDF pret pour audits BMC',
  'Alertes avancees (deforestation, brulage, SSRTE)',
  'Graphiques interactifs et suivi temps reel',
  'Application mobile agents terrain',
  'Nombre de membres illimite',
  'Support complet inclus',
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-4 px-4 py-1.5 text-sm">
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            100% Gratuit pour les cooperatives
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Acces complet, sans abonnement
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            GreenLink est entierement gratuit pour les cooperatives agricoles.
            Toutes les fonctionnalites durabilite, SSRTE, ICI, et certification qualite sont incluses.
          </p>
        </div>

        {/* Free Plan Card */}
        <div className="max-w-2xl mx-auto mb-14">
          <Card
            className="border-2 border-emerald-300 shadow-xl overflow-hidden"
            data-testid="free-plan-card"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white text-center py-4 px-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TreePine className="w-6 h-6" />
                <span className="text-2xl font-bold">Gratuit</span>
              </div>
              <p className="text-emerald-100 text-sm">Toutes les fonctionnalites, sans limite de temps</p>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {allFeatures.map((f, i) => (
                  <div key={`el-${i}`} className="flex items-start gap-2.5">
                    <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-700 leading-snug">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5 text-base"
                onClick={() => navigate('/register')}
                data-testid="free-plan-cta"
              >
                Creer mon compte cooperative
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
              <p className="text-center text-xs text-gray-500 mt-3">
                Aucune carte bancaire requise. Acces immediat.
              </p>
            </div>
          </Card>
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-2xl border border-emerald-100 p-8 lg:p-10" data-testid="redd-value-section">
          <div className="text-center mb-8">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-3">
              <Globe className="w-3.5 h-3.5 mr-1 inline" />
              Strategie Nationale Durabilite Cote d'Ivoire
            </Badge>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Pourquoi la durabilite est essentielle pour votre cooperative ?
            </h3>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              La Cote d'Ivoire s'est engagee dans un programme national de durabilite qui ouvre des opportunites
              de revenus carbone pour les cooperatives agricoles.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: TreePine, title: 'Credits Carbone',
                desc: "Generez des revenus supplementaires via la vente de credits carbone issus de l'agroforesterie.",
                color: 'emerald',
              },
              {
                icon: Shield, title: 'Conformite EUDR',
                desc: 'Tracabilite complete pour repondre aux exigences de la reglementation europeenne zero-deforestation.',
                color: 'blue',
              },
              {
                icon: BarChart3, title: 'MRV National',
                desc: 'Donnees geolocalisees et rapports automatises pour le systeme MRV national.',
                color: 'violet',
              },
              {
                icon: Zap, title: 'Paiements Resultats',
                desc: 'Acces aux Results-Based Payments des programmes juridictionnels (ex. Parc Tai).',
                color: 'amber',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={`el-${idx}`} className="bg-white/80 p-4 border-gray-100 hover:shadow-md transition-shadow">
                  <div className={`w-9 h-9 rounded-lg bg-${item.color}-100 flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 text-${item.color}-600`} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-1">{item.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Trust Footer */}
        <div className="text-center mt-10 text-xs text-gray-500">
          <p className="flex items-center justify-center gap-1">
            <FileCheck className="w-3.5 h-3.5" />
            Conforme aux standards de certification qualite, SSRTE/ICI et Strategie Nationale de Durabilite de Cote d'Ivoire.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
