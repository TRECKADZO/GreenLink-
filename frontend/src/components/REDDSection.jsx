import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { TreePine, Leaf, Shield, Sprout, FileCheck, ChevronRight } from 'lucide-react';

const reddHighlights = [
  { icon: TreePine, title: 'Agroforesterie', desc: 'Systemes multi-strates, arbres d\'ombrage 30-50%', bonus: '+25 000 FCFA/ha', color: 'emerald' },
  { icon: Shield, title: 'Zero-Deforestation', desc: 'Intensification durable, protection forets classees', bonus: '+12 000 FCFA/ha', color: 'blue' },
  { icon: Sprout, title: 'Gestion Sols', desc: 'Compostage, biochar, couverture vegetale', bonus: '+10 000 FCFA/ha', color: 'amber' },
  { icon: FileCheck, title: 'MRV & Tracabilite', desc: 'GPS parcelles, conformite EUDR, rapports PDF', bonus: 'Eligibilite REDD+', color: 'violet' },
];

const colorMap = {
  emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-200 text-emerald-700',
  blue: 'from-blue-500/10 to-blue-500/5 border-blue-200 text-blue-700',
  amber: 'from-amber-500/10 to-amber-500/5 border-amber-200 text-amber-700',
  violet: 'from-violet-500/10 to-violet-500/5 border-violet-200 text-violet-700',
};

const iconBg = {
  emerald: 'bg-emerald-100 text-emerald-600',
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  violet: 'bg-violet-100 text-violet-600',
};

const REDDSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-emerald-50/50 to-white" data-testid="redd-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <Badge className="mb-3 bg-emerald-100 text-emerald-700">
            <Leaf className="w-3 h-3 mr-1 inline" />
            REDD+ Cote d'Ivoire
          </Badge>
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">
            Pratiques REDD+ Reconnues
          </h2>
          <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto">
            GreenLink recompense les producteurs pour l'adoption de pratiques REDD+ validees par le programme Tai, le FCPF et le Bureau du Marche Carbone.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10">
          {reddHighlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Card
                key={idx}
                className={`p-5 bg-gradient-to-br ${colorMap[item.color]} border hover:shadow-lg transition-all hover:-translate-y-1`}
                data-testid={`redd-highlight-${idx}`}
              >
                <div className={`w-10 h-10 rounded-lg ${iconBg[item.color]} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{item.desc}</p>
                <Badge className="bg-white/80 text-gray-700 text-xs border border-gray-200">
                  {item.bonus}
                </Badge>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            onClick={() => navigate('/guide-redd')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5"
            data-testid="redd-section-cta"
          >
            <Leaf className="w-4 h-4 mr-2" />
            Decouvrir les 21 pratiques REDD+
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default REDDSection;
