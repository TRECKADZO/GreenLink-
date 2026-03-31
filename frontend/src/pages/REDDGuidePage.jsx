import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import {
  TreePine, Leaf, Shield, MapPin, Award,
  ChevronDown, ChevronRight, Sprout, Droplets,
  Sun, Mountain, FileCheck, ArrowLeft, Zap
} from 'lucide-react';

const REDD_CATEGORIES = [
  {
    id: 'agroforesterie',
    title: 'Agroforesterie',
    subtitle: 'Pratique prioritaire',
    icon: TreePine,
    color: 'emerald',
    impact: 'Augmente les stocks de carbone, biodiversite, resilience climatique',
    practices: [
      { name: 'Arbres d\'ombrage (30-50% couverture)', description: 'Planter et maintenir des arbres d\'ombrage dans les parcelles cacao/cafe', bonus: '+1.0 score', prime: '+15 000 FCFA/ha' },
      { name: 'Systeme agroforestier multi-strates', description: 'Association cacaoyers avec arbres forestiers (Acajou, Terminalia), fruitiers (avocat, safou) et legumineuses (Gliricidia)', bonus: '+1.5 score', prime: '+20 000 FCFA/ha' },
      { name: 'Enrichissement parcelles existantes', description: 'Plantation d\'arbres supplementaires et maintien des arbres spontanes', bonus: '+0.5 score', prime: '+8 000 FCFA/ha' },
      { name: 'Transition plein soleil vers ombrage', description: 'Conversion progressive des parcelles plein soleil vers systemes multi-strates (2-3 strates)', bonus: '+2.0 score', prime: '+25 000 FCFA/ha' },
    ],
  },
  {
    id: 'zero-deforestation',
    title: 'Zero-Deforestation',
    subtitle: 'Reduction pression sur les forets',
    icon: Shield,
    color: 'blue',
    impact: 'Decouplage agriculture-deforestation, protection forets classees',
    practices: [
      { name: 'Intensification durable', description: 'Ameliorer rendements sur parcelles existantes sans extension forestiere', bonus: '+0.5 score', prime: '+5 000 FCFA/ha' },
      { name: 'Pas de nouvelle plantation sur foret', description: 'Engagement zero-deforestation, interdiction d\'extension sur terres forestieres', bonus: 'Obligatoire', prime: 'Eligibilite prime carbone' },
      { name: 'Restauration parcelles degradees', description: 'Reconversion des parcelles degradees via agroforesterie ou systemes productifs avec arbres', bonus: '+1.0 score', prime: '+12 000 FCFA/ha' },
      { name: 'Protection forets classees', description: 'Participation a l\'agroforesterie communautaire et systeme Taungya', bonus: '+0.5 score', prime: '+7 000 FCFA/ha' },
    ],
  },
  {
    id: 'gestion-sols',
    title: 'Gestion Sols Bas-Carbone',
    subtitle: 'Reduction des intrants chimiques',
    icon: Sprout,
    color: 'amber',
    impact: 'Amelioration fertilite sols, reduction emissions GES',
    practices: [
      { name: 'Paillage et compostage', description: 'Production d\'intrants organiques, reduction des engrais chimiques', bonus: '+1.0 score', prime: '+10 000 FCFA/ha' },
      { name: 'Biochar', description: 'Utilisation de biochar pour ameliorer la fertilite et stocker le carbone', bonus: '+0.5 score', prime: '+6 000 FCFA/ha' },
      { name: 'Couverture vegetale', description: 'Plantes rampantes legumineuses pour lutter contre l\'erosion et maintenir l\'humidite', bonus: '+0.5 score', prime: '+5 000 FCFA/ha' },
      { name: 'Gestion integree ravageurs', description: 'Reduction des pesticides, methodes biologiques de lutte', bonus: '+0.3 score', prime: '+4 000 FCFA/ha' },
      { name: 'Taille et elagage sanitaire', description: 'Entretien regulier des cacaoyers/cafeiers pour productivite et sante', bonus: '+0.2 score', prime: '+3 000 FCFA/ha' },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration et Conservation',
    subtitle: 'Reboisement et protection',
    icon: Mountain,
    color: 'teal',
    impact: 'Regeneration ecosystemes, reduction pression bois-energie',
    practices: [
      { name: 'Reboisement et regeneration assistee', description: 'Regeneration naturelle assistee sur terres degradees', bonus: '+1.5 score', prime: '+18 000 FCFA/ha' },
      { name: 'Plantations bois-energie', description: 'Reduire la coupe dans les forets naturelles en plantant du bois-energie', bonus: '+0.5 score', prime: '+7 000 FCFA/ha' },
      { name: 'Protection zones ripariennes', description: 'Protection des pentes, berges et zones ecologiquement fragiles', bonus: '+0.5 score', prime: '+6 000 FCFA/ha' },
      { name: 'Valorisation residus agricoles', description: 'Gestion durable des residus (pas de brulage), compostage, mulching', bonus: '+0.5 score', prime: '+5 000 FCFA/ha' },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite et Conformite',
    subtitle: 'MRV, EUDR, Certification',
    icon: FileCheck,
    color: 'violet',
    impact: 'Integrite environnementale, conformite marche carbone, acces primes',
    practices: [
      { name: 'Enregistrement GPS parcelles', description: 'Geolocalisation des parcelles pour tracabilite EUDR et standards carbone', bonus: 'Obligatoire', prime: 'Eligibilite' },
      { name: 'Safeguards sociaux', description: 'Equite genre, prevention travail des enfants (SSRTE/ICI), clarification foncier', bonus: 'Obligatoire', prime: 'Eligibilite' },
      { name: 'Monitoring MRV', description: 'Collecte de donnees: couverture arboree, pratiques adoptees, reductions emissions', bonus: '+0.5 score', prime: 'Acces programme Tai' },
      { name: 'Certification Cacao Durable', description: 'Niveaux Bon/Tres Bon/Excellent pour le cacao durable', bonus: 'Jusqu\'a Excellent', prime: '+30 000 FCFA/ha' },
    ],
  },
];

const colorMap = {
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: 'text-emerald-400', badge: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-400', badge: 'bg-blue-500' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'text-amber-400', badge: 'bg-amber-500' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', icon: 'text-teal-400', badge: 'bg-teal-500' },
  violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-400', icon: 'text-violet-400', badge: 'bg-violet-500' },
};

const REDDGuidePage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [expandedCategory, setExpandedCategory] = useState('agroforesterie');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Navbar />
        <div className="pt-24 flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <div className="pt-24 pb-12 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white hover:bg-white/5 mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Retour
            </Button>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <Leaf className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Pratiques Durables Reconnues</h1>
                <p className="text-slate-400 mt-1 text-sm sm:text-base max-w-2xl">
                  Guide des pratiques eligibles aux credits carbone en Cote d'Ivoire.
                  Adoptez ces pratiques pour augmenter votre score carbone et vos primes.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-400">5</p>
                <p className="text-xs text-slate-400">Categories</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-400">21</p>
                <p className="text-xs text-slate-400">Pratiques</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">60k</p>
                <p className="text-xs text-slate-400">FCFA/ha max</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-violet-400">10/10</p>
                <p className="text-xs text-slate-400">Score max</p>
              </CardContent>
            </Card>
          </div>

          {/* Sources */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">
                <span className="text-slate-400 font-medium">Sources :</span> Strategie Nationale (2017), Programme FCPF Parc National de Tai, PROMIRE, Guides agroforestiers IDH/CIRAD/reNature, Bureau du Marche Carbone (BMC)
              </p>
            </CardContent>
          </Card>

          {/* Categories */}
          <div className="space-y-4">
            {REDD_CATEGORIES.map((cat) => {
              const colors = colorMap[cat.color];
              const Icon = cat.icon;
              const isExpanded = expandedCategory === cat.id;

              return (
                <Card key={cat.id} className={`bg-slate-900 border-slate-800 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-slate-600' : ''}`}>
                  <div
                    className="p-4 sm:p-5 cursor-pointer hover:bg-slate-800/50 transition-colors"
                    onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                    data-testid={`redd-category-${cat.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${colors.bg}`}>
                          <Icon className={`w-5 h-5 ${colors.icon}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white">{cat.title}</h3>
                            <Badge className={`${colors.badge} text-white text-[10px] px-1.5 py-0`}>
                              {cat.practices.length} pratiques
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{cat.subtitle}</p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
                    </div>
                    <p className={`text-xs mt-2 ${colors.text}`}>
                      <Zap className="w-3 h-3 inline mr-1" />
                      {cat.impact}
                    </p>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-800 p-4 sm:p-5 space-y-3">
                      {cat.practices.map((practice, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${colors.bg} border ${colors.border}`} data-testid={`redd-practice-${cat.id}-${idx}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-white">{practice.name}</p>
                              <p className="text-xs text-slate-400 mt-1">{practice.description}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant="outline" className={`${colors.border} ${colors.text} text-[10px]`}>
                                {practice.bonus}
                              </Badge>
                              <p className="text-[10px] text-slate-500 mt-1">{practice.prime}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* CTA */}
          <Card className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 border-emerald-500/30">
            <CardContent className="p-6 text-center">
              <h3 className="text-lg font-bold text-white mb-2">Estimez votre prime carbone</h3>
              <p className="text-sm text-slate-300 mb-4">
                Composez *144*99# ou utilisez le simulateur en ligne pour calculer votre score carbone et vos primes.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate('/farmer/prime-carbone')} className="bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="redd-cta-calculator">
                  <Sun className="w-4 h-4 mr-2" /> Calculer ma prime
                </Button>
                {(user.user_type === 'cooperative' || user.user_type === 'admin') && (
                  <Button onClick={() => navigate('/cooperative/mrv')} variant="outline" className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10" data-testid="redd-cta-mrv">
                    <FileCheck className="w-4 h-4 mr-2" /> Dashboard MRV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default REDDGuidePage;
