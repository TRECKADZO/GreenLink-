import React from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import {
  Check, TreePine, Shield, FileCheck, Zap, Users,
  Leaf, BarChart3, Globe, ChevronRight, Sparkles,
  Wallet, Award, Smartphone, Lock, Clock, Star,
  ArrowRight, TrendingUp, FileText, Package,
} from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const coopFeatures = [
  { icon: Wallet, text: 'Primes carbone sur Orange Money', highlight: true },
  { icon: BarChart3, text: 'Score carbone par parcelle et par membre' },
  { icon: Shield, text: 'Certification ARS 1000 (Bronze/Argent/Or)' },
  { icon: TreePine, text: 'Diagnostic agroforestier (54 especes)' },
  { icon: Users, text: 'Nombre de membres illimite' },
  { icon: FileText, text: 'Export PDF et Excel automatise' },
  { icon: Package, text: 'Tracabilite des lots et controle qualite' },
  { icon: Award, text: 'Audits terrain avec GPS et photos' },
  { icon: Leaf, text: 'Suivi environnemental et agroforesterie' },
  { icon: Smartphone, text: 'Acces USSD pour planteurs sans smartphone' },
  { icon: TrendingUp, text: 'Dashboard KPI temps reel et analytics' },
  { icon: Globe, text: 'Conformite EUDR, SSRTE/ICI incluse' },
];

const trustNumbers = [
  { value: '100%', label: 'Gratuit', sublabel: 'pour toujours' },
  { value: '0', label: 'Engagement', sublabel: 'aucun contrat' },
  { value: '24h', label: 'Activation', sublabel: 'de votre compte' },
  { value: '12+', label: 'Modules', sublabel: 'tout inclus' },
];

const PricingSection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-[#d4a574]/15 text-[#8b6142] border-[#d4a574]/30 mb-4 px-4 py-1.5 text-sm font-medium">
            <Sparkles className="w-4 h-4 mr-1.5 inline" />
            Offre Cooperative
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Toutes les fonctionnalites.<br />
            <span className="text-emerald-600">Sans limite de temps.</span>
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            GreenLink offre un acces complet et gratuit a toutes les cooperatives agricoles.
            Pas d'abonnement, pas d'engagement, pas de frais caches.
          </p>
        </div>

        {/* Trust numbers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto">
          {trustNumbers.map((item, i) => (
            <div key={`trust-${i}`} className="text-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600">{item.value}</div>
              <div className="text-sm font-semibold text-gray-900 mt-1">{item.label}</div>
              <div className="text-xs text-gray-500">{item.sublabel}</div>
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="max-w-4xl mx-auto mb-14">
          <Card
            className="border-2 border-emerald-300 shadow-2xl overflow-hidden relative"
            data-testid="free-plan-card"
          >
            {/* Ribbon */}
            <div className="absolute top-4 -right-8 rotate-45 bg-[#d4a574] text-white text-xs font-bold px-10 py-1 shadow-md z-10">
              GRATUIT
            </div>

            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-600 text-white text-center py-6 px-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <TreePine className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="text-3xl font-bold">0 FCFA</div>
                  <div className="text-emerald-100 text-sm font-medium">Toutes les fonctionnalites incluses</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-emerald-100 text-xs">
                <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Pas de frais caches</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Sans limite de temps</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" /> Support inclus</span>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {/* Features grid */}
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ce qui est inclus pour votre cooperative</h3>
              <div className="grid sm:grid-cols-2 gap-3 mb-8">
                {coopFeatures.map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <div key={`feat-${i}`} className={`flex items-start gap-3 p-2.5 rounded-lg ${f.highlight ? 'bg-amber-50 border border-amber-200' : 'hover:bg-gray-50'} transition-colors`}>
                      <div className={`w-8 h-8 rounded-lg ${f.highlight ? 'bg-amber-100' : 'bg-emerald-50'} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${f.highlight ? 'text-amber-600' : 'text-emerald-600'}`} />
                      </div>
                      <span className={`text-sm leading-snug ${f.highlight ? 'text-amber-900 font-semibold' : 'text-gray-700'}`}>{f.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 text-center border border-emerald-100">
                <p className="text-gray-700 font-medium mb-4">
                  Rejoignez les cooperatives qui ameliorent leurs revenus grace aux primes carbone
                </p>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5 px-8 text-base shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
                  onClick={() => navigate('/register')}
                  data-testid="free-plan-cta"
                >
                  Creer mon compte cooperative gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-xs text-gray-500 mt-3 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" />
                  Aucune carte bancaire requise. Acces immediat.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Value Proposition - Why sustainability */}
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
                icon: Wallet, title: 'Primes Carbone',
                desc: "Vos planteurs recoivent des primes Orange Money basees sur leur score carbone et leurs pratiques durables.",
                color: 'amber',
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
                <Card key={`val-${idx}`} className="bg-white/80 p-4 border-gray-100 hover:shadow-md transition-shadow">
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
