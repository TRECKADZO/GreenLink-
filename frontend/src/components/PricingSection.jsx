import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Check, X, TreePine, Shield, FileCheck, Zap, Crown,
  Leaf, BarChart3, Users, Globe, Award, ChevronRight,
} from 'lucide-react';

const plans = [
  {
    id: 'coop_starter',
    name: 'Starter',
    price: '50 000',
    period: '/mois',
    maxMembers: '400',
    color: 'emerald',
    icon: Leaf,
    tagline: 'Essentiel pour demarrer',
    features: [
      { text: 'Dashboard basique', included: true },
      { text: 'Rapports ARS 1000 automatises', included: true },
      { text: 'Alertes SSRTE', included: true },
      { text: 'REDD+ simplifie (arbres, estimation carbone)', included: true },
      { text: 'Analyse ARS niveaux Bronze/Argent/Or', included: false },
      { text: 'Rapports SSRTE detailles (ICI)', included: false },
      { text: 'REDD+ avance (emissions, MRV, geolocalisation)', included: false },
      { text: 'Export PDF/Excel pour audits', included: false },
      { text: 'Alertes avancees (deforestation, brulage)', included: false },
      { text: 'Support prioritaire', included: false },
    ],
  },
  {
    id: 'coop_pro',
    name: 'Pro',
    price: '120 000',
    period: '/mois',
    maxMembers: '800',
    color: 'blue',
    icon: Shield,
    recommended: true,
    tagline: 'Complet pour les audits et REDD+',
    features: [
      { text: 'Dashboard complet avec analyse ARS 1000', included: true },
      { text: 'Rapports ARS 1000 (Bronze/Argent/Or)', included: true },
      { text: 'Rapports detailles SSRTE (ICI)', included: true },
      { text: 'REDD+ avance : emissions, agroforesterie, MRV', included: true },
      { text: 'Zero-deforestation + donnees geolocalisees', included: true },
      { text: 'Export PDF/Excel pret pour audits BMC', included: true },
      { text: 'Alertes avancees (deforestation, brulage, SSRTE)', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'API personnalisee', included: false },
      { text: 'Formation agents + co-branding', included: false },
    ],
  },
  {
    id: 'coop_enterprise',
    name: 'Enterprise',
    price: '250 000',
    period: '/mois',
    maxMembers: 'Illimites',
    color: 'amber',
    icon: Crown,
    tagline: 'Pour les grandes cooperatives et programmes REDD+',
    features: [
      { text: 'Tout le niveau Pro inclus', included: true },
      { text: 'API personnalisee', included: true },
      { text: 'Formation agents terrain sur REDD+', included: true },
      { text: 'Co-branding rapports cooperatives', included: true },
      { text: 'Analyse carbone agregee (Results-Based Payments)', included: true },
      { text: 'Membres illimites', included: true },
      { text: 'Acces aux donnees programmes juridictionnels', included: true },
      { text: 'Support dedie + accompagnement audit', included: true },
    ],
  },
];

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-700',
    btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  },
  blue: {
    bg: 'bg-blue-50', border: 'border-blue-300', accent: 'bg-blue-600',
    badge: 'bg-blue-100 text-blue-700', iconBg: 'bg-blue-100',
    iconText: 'text-blue-600', hover: 'hover:bg-blue-700', text: 'text-blue-700',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  amber: {
    bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-600',
    badge: 'bg-amber-100 text-amber-700', iconBg: 'bg-amber-100',
    iconText: 'text-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-700',
    btn: 'bg-amber-600 hover:bg-amber-700 text-white',
  },
};

const PricingSection = () => {
  const [billingCycle, setBillingCycle] = useState('monthly');

  return (
    <section id="pricing" className="py-20 bg-gradient-to-b from-gray-50 to-white" data-testid="pricing-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6">
          <Badge className="bg-green-100 text-green-700 border-green-200 mb-4 px-4 py-1.5 text-sm">
            <TreePine className="w-4 h-4 mr-1.5 inline" />
            Abonnements Cooperatives
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tarification transparente pour votre cooperative
          </h2>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            GreenLink aide votre cooperative a generer des credits carbone via la Strategie Nationale REDD+
            tout en simplifiant les audits ARS 1000 et SSRTE.
          </p>
        </div>

        {/* Trial Banner */}
        <div className="max-w-3xl mx-auto mb-12" data-testid="trial-banner">
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white text-center shadow-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Award className="w-6 h-6" />
              <span className="text-xl font-bold">6 mois d'essai gratuit offerts</span>
            </div>
            <p className="text-green-100 text-sm sm:text-base max-w-xl mx-auto">
              Acces complet au niveau Pro pendant 6 mois. Ensuite abonnement mensuel.
              Aucun engagement, annulation possible a tout moment.
            </p>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-100 rounded-full p-1 flex gap-1" data-testid="billing-toggle">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annuel
              <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0">-17%</Badge>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {plans.map((plan) => {
            const s = colorStyles[plan.color];
            const Icon = plan.icon;
            const monthlyPrice = parseInt(plan.price.replace(/\s/g, ''));
            const displayPrice = billingCycle === 'yearly'
              ? Math.round(monthlyPrice * 10 / 12).toLocaleString('fr-FR')
              : plan.price;

            return (
              <Card
                key={plan.id}
                data-testid={`plan-card-${plan.id}`}
                className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  plan.recommended ? `${s.border} shadow-lg ring-2 ring-blue-200` : 'border-gray-200'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-1.5 text-xs font-bold tracking-wider uppercase">
                    Recommande
                  </div>
                )}

                <div className={`p-6 ${plan.recommended ? 'pt-10' : ''}`}>
                  {/* Plan Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${s.badge} text-xs font-semibold mb-2`}>
                        <Icon className="w-3.5 h-3.5" />
                        {plan.name}
                      </div>
                      <p className="text-xs text-gray-500">{plan.tagline}</p>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-gray-900">{displayPrice}</span>
                      <span className="text-sm text-gray-500">FCFA{plan.period}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Jusqu'a {plan.maxMembers} membres
                    </p>
                    {billingCycle === 'yearly' && (
                      <p className="text-xs text-green-600 font-medium mt-1">
                        Economisez {(monthlyPrice * 2).toLocaleString('fr-FR')} FCFA/an
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <Button
                    className={`w-full mb-5 ${s.btn} font-semibold`}
                    data-testid={`plan-cta-${plan.id}`}
                  >
                    Commencer l'essai gratuit
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>

                  {/* Features */}
                  <div className="space-y-2.5 border-t pt-4">
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {f.included ? (
                          <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={`text-xs leading-snug ${f.included ? 'text-gray-700' : 'text-gray-400'}`}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* REDD+ Value Proposition */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-blue-50 rounded-2xl border border-emerald-100 p-8 lg:p-10" data-testid="redd-value-section">
          <div className="text-center mb-8">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 mb-3">
              <Globe className="w-3.5 h-3.5 mr-1 inline" />
              Strategie Nationale REDD+ Cote d'Ivoire
            </Badge>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Pourquoi le REDD+ est essentiel pour votre cooperative ?
            </h3>
            <p className="text-sm text-gray-600 max-w-2xl mx-auto">
              La Cote d'Ivoire s'est engagee dans un programme national REDD+ qui ouvre des opportunites
              de revenus carbone pour les cooperatives agricoles.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: TreePine, title: 'Credits Carbone',
                desc: 'Generez des revenus supplementaires via la vente de credits carbone issus de l\'agroforesterie.',
                color: 'emerald',
              },
              {
                icon: Shield, title: 'Conformite EUDR',
                desc: 'Tracabilite complete pour repondre aux exigences de la reglementation europeenne zero-deforestation.',
                color: 'blue',
              },
              {
                icon: BarChart3, title: 'MRV National',
                desc: 'Donnees geolocalisees et rapports automatises pour le systeme MRV national REDD+.',
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
                <Card key={idx} className="bg-white/80 p-4 border-gray-100 hover:shadow-md transition-shadow">
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
          <p>Tous les prix sont en FCFA (Franc CFA). Facturation mensuelle ou annuelle. Annulation possible a tout moment.</p>
          <p className="mt-1 flex items-center justify-center gap-1">
            <FileCheck className="w-3.5 h-3.5" />
            Conforme aux standards ARS 1000, SSRTE/ICI et Strategie Nationale REDD+ de Cote d'Ivoire.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
