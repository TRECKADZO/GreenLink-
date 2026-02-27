import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import InteractiveMap from '../../components/InteractiveMap';
import { greenlinkApi } from '../../services/greenlinkApi';
import { 
  Leaf, 
  Users, 
  TreePine, 
  MapPin,
  Award,
  TrendingUp,
  Download,
  Heart,
  Building2,
  Map
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const RSEDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [impact, setImpact] = useState(null);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'entreprise_rse') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, authLoading]);

  const fetchData = async () => {
    try {
      const [impactData, creditsData] = await Promise.all([
        greenlinkApi.getRSEImpactDashboard(),
        greenlinkApi.getCarbonCredits()
      ]);
      setImpact(impactData);
      setCredits(creditsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportImpactReport = () => {
    if (!impact) return;
    
    // Generate PDF-like report
    const reportData = {
      company: user.company_name_rse || user.full_name,
      date: new Date().toLocaleDateString('fr-FR'),
      ...impact
    };
    
    const reportText = `
RAPPORT D'IMPACT RSE - ${reportData.company}
Généré le ${reportData.date}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RÉSUMÉ EXÉCUTIF
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Offset Carbone Total: ${reportData.total_co2_offset_tonnes} tonnes CO₂
Agriculteurs Impactés: ${reportData.total_farmers_impacted} producteurs
Femmes Bénéficiaires: ${reportData.women_farmers_percentage}%
Arbres Plantés: ${reportData.total_trees_planted.toLocaleString()}
Régions Couvertes: ${reportData.regions_covered.join(', ')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IMPACT DÉTAILLÉ PAR MOIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${reportData.monthly_breakdown.map(m => 
  `${m.month}: ${m.co2_offset}t CO₂ | ${m.investment.toLocaleString()} FCFA`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFORMITÉ & CERTIFICATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Verra Verified Carbon Standard
✓ Gold Standard
✓ Plan Vivo
✓ EUDR Compliant
✓ CSRD Ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Rapport certifié GreenLink CI
www.greenlink-agritech.com
    `;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Impact_RSE_${Date.now()}.txt`;
    a.click();
    
    toast({
      title: 'Export réussi',
      description: 'Rapport d\'impact téléchargé'
    });
  };

  if (loading || !impact) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
          <div className="text-center py-12">
            <Leaf className="w-12 h-12 text-green-600 animate-pulse mx-auto mb-4" />
            <p className="text-gray-600">Chargement de votre impact...</p>
          </div>
        </div>
      </div>
    );
  }

  const impactCards = [
    {
      title: 'CO₂ Compensé',
      value: `${impact.total_co2_offset_tonnes}`,
      unit: 'tonnes',
      icon: Leaf,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      gradient: 'from-green-500 to-emerald-600'
    },
    {
      title: 'Agriculteurs Impactés',
      value: impact.total_farmers_impacted,
      unit: 'producteurs',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      gradient: 'from-blue-500 to-cyan-600'
    },
    {
      title: 'Femmes Bénéficiaires',
      value: `${impact.women_farmers_percentage}%`,
      unit: 'parité',
      icon: Heart,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      gradient: 'from-pink-500 to-rose-600'
    },
    {
      title: 'Arbres Plantés',
      value: impact.total_trees_planted.toLocaleString(),
      unit: 'arbres',
      icon: TreePine,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      gradient: 'from-emerald-500 to-teal-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-6 py-12 pt-24">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-10 h-10 text-purple-600" />
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Impact RSE Dashboard</h1>
                  <p className="text-gray-600">{user?.company_name_rse || user?.full_name}</p>
                </div>
              </div>
            </div>
            <Button 
              onClick={exportImpactReport}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Rapport CSRD
            </Button>
          </div>
        </div>

        {/* Impact Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {impactCards.map((card, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              <div className="p-6 relative z-10">
                <div className={`p-3 rounded-lg ${card.bgColor} w-fit mb-4`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <h3 className="text-sm text-gray-600 mb-1">{card.title}</h3>
                <p className="text-4xl font-bold text-gray-900 mb-1">{card.value}</p>
                <p className="text-sm text-gray-500">{card.unit}</p>
              </div>
            </Card>
          ))}
        </div>

        {/* Interactive Map Section */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Impact Territorial</h2>
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg p-8 mb-4">
            <div className="grid md:grid-cols-3 gap-6">
              {impact.regions_covered.map((region, index) => (
                <div key={index} className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm">
                  <MapPin className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">{region}</p>
                    <p className="text-xs text-gray-500">Région active</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-sm text-gray-600">
            📍 Votre impact couvre <strong>{impact.regions_covered.length} régions</strong> cacaoyères et anacarde en Côte d'Ivoire
          </p>
        </Card>

        {/* Monthly Trend */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Évolution Mensuelle</h2>
          <div className="space-y-4">
            {impact.monthly_breakdown.map((month, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-32 text-sm text-gray-600 font-medium">
                  {month.month}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-end pr-3"
                        style={{ 
                          width: `${Math.min((month.co2_offset / Math.max(...impact.monthly_breakdown.map(m => m.co2_offset))) * 100, 100)}%` 
                        }}
                      >
                        <span className="text-white text-xs font-bold">{month.co2_offset}t CO₂</span>
                      </div>
                    </div>
                    <div className="w-32 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {month.investment.toLocaleString()} F
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Impact Stories */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Histoires d'Impact</h2>
          <div className="space-y-4">
            {impact.impact_stories.map((story, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-l-4 border-green-500">
                <div className="flex items-start gap-3">
                  <Award className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">
                      {story.farmer} - {story.location}
                    </p>
                    <p className="text-gray-700 italic">"{story.story}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Marketplace Crédits Carbone */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Marketplace Crédits Carbone</h2>
            <Button 
              variant="outline"
              onClick={() => navigate('/rse/carbon-marketplace')}
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              Voir Tous les Crédits
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {credits.slice(0, 3).map((credit) => (
              <Card key={credit._id} className="p-5 hover:shadow-lg transition-shadow border-2 border-gray-100">
                <Badge className="mb-3 bg-purple-100 text-purple-700">
                  {credit.verification_standard}
                </Badge>
                <h3 className="font-bold text-gray-900 mb-2">{credit.credit_type}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {credit.project_description}
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Quantité:</span>
                    <span className="font-semibold">{credit.quantity_tonnes_co2}t CO₂</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Prix/tonne:</span>
                    <span className="font-semibold text-green-600">
                      {credit.price_per_tonne.toLocaleString()} F
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Vintage:</span>
                    <span className="font-semibold">{credit.vintage_year}</span>
                  </div>
                </div>
                <Button 
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  onClick={() => navigate(`/rse/purchase/${credit._id}`)}
                >
                  Acheter
                </Button>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RSEDashboard;
