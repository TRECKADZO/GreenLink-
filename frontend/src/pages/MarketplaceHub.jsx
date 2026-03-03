import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, Leaf, Recycle, ArrowRight, 
  TrendingUp, Users, Globe, Award,
  ShoppingBag, Sprout, Factory, ArrowLeft
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

const MarketplaceHub = () => {
  const navigate = useNavigate();

  const marketplaces = [
    {
      id: 'harvest',
      title: 'Bourse des Récoltes',
      subtitle: 'Cacao • Café • Anacarde',
      description: 'Plateforme B2B pour producteurs et coopératives. Exposez vos récoltes aux acheteurs internationaux avec fiches produits aux normes ICCO, ICO, AFI.',
      icon: Leaf,
      gradient: 'from-amber-500 via-orange-500 to-amber-600',
      bgGradient: 'from-amber-900/20 to-orange-900/20',
      borderColor: 'border-amber-500/30',
      stats: [
        { label: 'Vendeurs', value: 'Producteurs & Coopératives' },
        { label: 'Acheteurs', value: 'Négociants & Exportateurs' },
      ],
      features: ['Normes internationales', 'Demandes de devis', 'Traçabilité EUDR', 'Certifications'],
      cta: 'Accéder à la Bourse',
      path: '/marketplace/harvest',
      badge: 'NOUVEAU',
      badgeColor: 'bg-amber-500'
    },
    {
      id: 'inputs',
      title: 'Marketplace Intrants',
      subtitle: 'Engrais • Semences • Équipements',
      description: 'Approvisionnez-vous en intrants agricoles de qualité. Comparez les prix, consultez les avis et passez commande directement auprès des fournisseurs agréés.',
      icon: Package,
      gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
      bgGradient: 'from-emerald-900/20 to-teal-900/20',
      borderColor: 'border-emerald-500/30',
      stats: [
        { label: 'Vendeurs', value: 'Fournisseurs Agréés' },
        { label: 'Acheteurs', value: 'Producteurs & Coopératives' },
      ],
      features: ['Catalogue produits', 'Avis vérifiés', 'Livraison suivie', 'Paiement sécurisé'],
      cta: 'Parcourir les Intrants',
      path: '/marketplace',
      badge: null,
      badgeColor: null
    },
    {
      id: 'carbon',
      title: 'Marché Carbone',
      subtitle: 'Crédits Carbone Certifiés',
      description: 'Compensez votre empreinte carbone avec des crédits vérifiés issus de l\'agroforesterie ivoirienne. Projets certifiés VCS, Gold Standard.',
      icon: Recycle,
      gradient: 'from-blue-500 via-indigo-500 to-blue-600',
      bgGradient: 'from-blue-900/20 to-indigo-900/20',
      borderColor: 'border-blue-500/30',
      stats: [
        { label: 'Vendeurs', value: 'Coopératives Certifiées' },
        { label: 'Acheteurs', value: 'Entreprises RSE' },
      ],
      features: ['Crédits vérifiés', 'Impact traçable', 'Certificats officiels', 'Projets locaux'],
      cta: 'Explorer les Crédits',
      path: '/carbon-marketplace',
      badge: 'RSE',
      badgeColor: 'bg-blue-500'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900" data-testid="marketplace-hub">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/30 via-slate-900 to-amber-900/30"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Bouton Retour */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-4 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'accueil
          </Button>
          
          <div className="text-center">
            <Badge className="mb-4 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <Globe className="h-3 w-3 mr-1" />
              Plateforme Commerciale GreenLink
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Nos <span className="bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">Marketplaces</span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              3 places de marché spécialisées pour connecter tous les acteurs de la filière agricole ivoirienne
            </p>
          </div>
        </div>
      </div>

      {/* Marketplaces Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {marketplaces.map((mp) => (
            <Card 
              key={mp.id}
              className={`bg-gradient-to-br ${mp.bgGradient} border ${mp.borderColor} hover:border-opacity-60 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl cursor-pointer overflow-hidden group`}
              onClick={() => navigate(mp.path)}
            >
              {/* Header */}
              <div className={`p-6 bg-gradient-to-r ${mp.gradient} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute -right-8 -top-8 opacity-20">
                  <mp.icon className="h-32 w-32 text-white" />
                </div>
                <div className="relative">
                  {mp.badge && (
                    <Badge className={`${mp.badgeColor} text-white mb-3`}>
                      {mp.badge}
                    </Badge>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                      <mp.icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{mp.title}</h2>
                      <p className="text-white/80 text-sm">{mp.subtitle}</p>
                    </div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 bg-slate-800/50">
                {/* Description */}
                <p className="text-slate-300 text-sm mb-6 line-clamp-3">
                  {mp.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {mp.stats.map((stat, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-700/50">
                      <p className="text-xs text-slate-400">{stat.label}</p>
                      <p className="text-sm text-white font-medium">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Features */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {mp.features.map((feature, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs border-slate-600 text-slate-300">
                      {feature}
                    </Badge>
                  ))}
                </div>

                {/* CTA */}
                <Button 
                  className={`w-full bg-gradient-to-r ${mp.gradient} hover:opacity-90 transition-opacity group-hover:shadow-lg`}
                >
                  {mp.cta}
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center">
            <Sprout className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white">500+</p>
            <p className="text-sm text-slate-400">Producteurs Actifs</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center">
            <Factory className="h-8 w-8 text-amber-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white">50+</p>
            <p className="text-sm text-slate-400">Coopératives</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center">
            <ShoppingBag className="h-8 w-8 text-blue-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white">100+</p>
            <p className="text-sm text-slate-400">Acheteurs Vérifiés</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 text-center">
            <Award className="h-8 w-8 text-purple-400 mx-auto mb-3" />
            <p className="text-3xl font-bold text-white">10k+</p>
            <p className="text-sm text-slate-400">Tonnes Échangées</p>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-900/50 to-amber-900/50 border border-emerald-700/30 text-center">
          <h3 className="text-2xl font-bold text-white mb-3">
            Vous êtes acheteur international ?
          </h3>
          <p className="text-slate-300 mb-6">
            Accédez à votre espace dédié pour gérer vos demandes de devis, favoris et alertes
          </p>
          <Button 
            onClick={() => navigate('/buyer/marketplace')}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            Accéder à l'Espace Acheteur
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceHub;
