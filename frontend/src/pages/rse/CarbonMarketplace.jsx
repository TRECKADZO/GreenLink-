import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import Navbar from '../../components/Navbar';
import { greenlinkApi } from '../../services/greenlinkApi';
import { useToast } from '../../hooks/use-toast';
import { 
  Leaf, 
  Search, 
  Filter, 
  ShoppingCart, 
  Award,
  TreePine,
  MapPin,
  Calendar,
  TrendingUp,
  Shield,
  CheckCircle,
  ArrowLeft,
  Plus,
  Send
} from 'lucide-react';

// Données démo statiques pour le Marché Carbone
const DEMO_CREDITS = [
  {
    _id: 'demo-cc-1',
    credit_type: 'Agroforesterie',
    project_name: 'Agroforesterie Cacao Durable - Soubré',
    project_description: 'Programme d\'agroforesterie intégrant 15 essences forestières dans les plantations de cacao. Séquestration active de CO2 grâce à la couverture arborée dense et les pratiques régénératives.',
    verification_standard: 'Verra VCS',
    quantity_tonnes_co2: 850,
    price_per_tonne: 18500,
    vintage_year: 2025,
    region: 'Sud-Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-SOUBRE'
  },
  {
    _id: 'demo-cc-2',
    credit_type: 'Reforestation',
    project_name: 'Reforestation Zone Tampon - Man',
    project_description: 'Restauration de 200 hectares de forêt dégradée en zone tampon du Mont Tonkpi. 45 000 arbres plantés incluant des essences endémiques menacées.',
    verification_standard: 'Gold Standard',
    quantity_tonnes_co2: 1200,
    price_per_tonne: 22000,
    vintage_year: 2025,
    region: 'Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-MAN'
  },
  {
    _id: 'demo-cc-3',
    credit_type: 'Agriculture Régénérative',
    project_name: 'Sols Vivants - Daloa',
    project_description: 'Transition vers l\'agriculture régénérative pour 120 producteurs. Techniques de compostage, couverture permanente des sols et rotation culturale améliorée.',
    verification_standard: 'Plan Vivo',
    quantity_tonnes_co2: 450,
    price_per_tonne: 15000,
    vintage_year: 2026,
    region: 'Centre-Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-DALOA'
  },
  {
    _id: 'demo-cc-4',
    credit_type: 'Conservation',
    project_name: 'Protection Forêt Classée - Taï',
    project_description: 'Programme de protection de 500 hectares de forêt primaire adjacente au Parc National de Taï. Surveillance communautaire et alternatives économiques.',
    verification_standard: 'Verra VCS',
    quantity_tonnes_co2: 2000,
    price_per_tonne: 25000,
    vintage_year: 2025,
    region: 'Sud-Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-GUIGLO'
  },
  {
    _id: 'demo-cc-5',
    credit_type: 'Agroforesterie',
    project_name: 'Café Sous Ombrage - Danané',
    project_description: 'Conversion de 80 hectares de café en culture sous ombrage avec intégration de Gliricidia et Albizzia. Amélioration du score carbone de 3.2 à 8.1/10.',
    verification_standard: 'Gold Standard',
    quantity_tonnes_co2: 320,
    price_per_tonne: 20000,
    vintage_year: 2026,
    region: 'Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-DANANE'
  },
  {
    _id: 'demo-cc-6',
    credit_type: 'Reforestation',
    project_name: 'Corridors Écologiques - Bouaflé',
    project_description: 'Création de corridors écologiques entre fragments forestiers sur 100 hectares. 30 000 arbres plantés avec suivi par drone et imagerie satellite.',
    verification_standard: 'Plan Vivo',
    quantity_tonnes_co2: 600,
    price_per_tonne: 17000,
    vintage_year: 2025,
    region: 'Centre-Ouest',
    status: 'available',
    seller_name: 'Coopérative COOP-BOUAFLE'
  }
];

const CarbonMarketplace = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStandard, setSelectedStandard] = useState('');
  const [purchasingId, setPurchasingId] = useState(null);

  // Access guard: Only RSE enterprises and admins can access this page
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user || !['entreprise_rse', 'admin'].includes(user.user_type)) {
      toast({
        title: 'Acces restreint',
        description: 'Le Marche Carbone est reserve aux entreprises RSE.',
        variant: 'destructive'
      });
      navigate('/');
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const standards = [
    { value: '', label: 'Tous les standards' },
    { value: 'Verra VCS', label: 'Verra VCS' },
    { value: 'Gold Standard', label: 'Gold Standard' },
    { value: 'Plan Vivo', label: 'Plan Vivo' }
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStandard]);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedStandard) params.standard = selectedStandard;
      const data = await greenlinkApi.getCarbonCredits(params);
      // Use demo data if API returns empty
      setCredits(data && data.length > 0 ? data : DEMO_CREDITS);
    } catch (error) {
      /* error logged */
      setCredits(DEMO_CREDITS);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (credit) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour acheter des crédits carbone',
        variant: 'destructive'
      });
      navigate('/login');
      return;
    }

    if (user.user_type !== 'entreprise_rse') {
      toast({
        title: 'Accès limité',
        description: 'Seules les entreprises RSE peuvent acheter des crédits carbone',
        variant: 'destructive'
      });
      return;
    }

    setPurchasingId(credit._id);
    try {
      await greenlinkApi.purchaseCarbonCredits({
        credit_id: credit._id,
        quantity_tonnes: credit.quantity_tonnes_co2,
        total_price: credit.quantity_tonnes_co2 * credit.price_per_tonne,
        retirement_requested: false
      });
      
      toast({
        title: 'Achat réussi!',
        description: `${credit.quantity_tonnes_co2} tonnes de CO₂ achetées`
      });
      
      fetchCredits();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Échec de l\'achat',
        variant: 'destructive'
      });
    } finally {
      setPurchasingId(null);
    }
  };

  const filteredCredits = credits.filter(credit =>
    credit.credit_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.project_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    credit.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isRSE = user?.user_type === 'entreprise_rse';
  const isFarmer = user?.user_type === 'producteur';
  const isSeller = user && ['producteur', 'cooperative', 'farmer'].includes(user.user_type);
  const isAdmin = user?.user_type === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Bouton Retour */}
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="mb-4 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          
          {/* Header */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-700">
              Marketplace Carbone
            </Badge>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Crédits Carbone Certifiés
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isFarmer 
                ? "Découvrez comment vos pratiques agricoles génèrent des crédits carbone valorisables"
                : "Investissez dans des projets agricoles durables en Côte d'Ivoire et compensez votre empreinte carbone"
              }
            </p>
            {/* Action buttons for sellers and admin */}
            <div className="flex justify-center gap-3 mt-6">
              {isSeller && (
                <Button 
                  onClick={() => navigate('/carbon-marketplace/create')}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                  data-testid="submit-carbon-credits-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Soumettre mes Crédits Carbone
                </Button>
              )}
              {isAdmin && (
                <Button 
                  onClick={() => navigate('/admin/carbon-approvals')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                  data-testid="admin-approvals-btn"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Gérer les Approbations
                </Button>
              )}
            </div>
          </div>

          {/* Info Banner for Farmers */}
          {isFarmer && (
            <Card className="p-6 mb-8 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <div className="flex items-center gap-4">
                <Leaf className="w-12 h-12" />
                <div>
                  <h3 className="text-xl font-bold mb-1">Vous êtes producteur?</h3>
                  <p className="opacity-90">
                    Vos pratiques agricoles durables génèrent des crédits carbone. 
                    Consultez votre tableau de bord pour voir vos crédits accumulés et les primes associées.
                  </p>
                </div>
                <Button 
                  onClick={() => navigate('/farmer/dashboard')}
                  className="bg-white text-green-700 hover:bg-green-50"
                >
                  Mon Dashboard
                </Button>
              </div>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Rechercher un projet carbone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 py-3"
                />
              </div>
              
              <div className="flex gap-2">
                {standards.map((std) => (
                  <Button
                    key={std.value}
                    variant={selectedStandard === std.value ? 'default' : 'outline'}
                    onClick={() => setSelectedStandard(std.value)}
                    className={selectedStandard === std.value 
                      ? 'bg-green-600 text-white' 
                      : 'border-gray-200'}
                  >
                    {std.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <Leaf className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total disponible</p>
                  <p className="text-2xl font-bold text-green-700">
                    {credits.reduce((sum, c) => sum + c.quantity_tonnes_co2, 0).toLocaleString()}t
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <TreePine className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Projets actifs</p>
                  <p className="text-2xl font-bold text-blue-700">{credits.length}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Standards</p>
                  <p className="text-2xl font-bold text-purple-700">3</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 bg-orange-50 border-orange-200">
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Régions</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {[...new Set(credits.map(c => c.region))].length}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Credits Grid */}
          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <Card key={`el-${i}`} className="p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
                  <div className="h-8 bg-gray-200 rounded mb-2"></div>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </Card>
              ))}
            </div>
          ) : filteredCredits.length === 0 ? (
            <Card className="p-12 text-center">
              <Leaf className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Aucun crédit disponible
              </h3>
              <p className="text-gray-600">
                Essayez de modifier vos filtres ou revenez plus tard
              </p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCredits.map((credit) => (
                <Card 
                  key={credit._id} 
                  className="overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Header with gradient */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-white/20 text-white border-0">
                        {credit.verification_standard}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        <span className="text-xs">Vérifié</span>
                      </div>
                    </div>
                    <h3 className="font-bold text-lg">{credit.credit_type}</h3>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {credit.project_description}
                    </p>

                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Leaf className="w-4 h-4" />
                          <span className="text-sm">Quantité</span>
                        </div>
                        <span className="font-bold text-green-700">
                          {credit.quantity_tonnes_co2} t CO₂
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm">Prix/tonne</span>
                        </div>
                        <span className="font-bold text-gray-900">
                          {credit.price_per_tonne.toLocaleString()} XOF
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">Vintage</span>
                        </div>
                        <span className="font-medium">{credit.vintage_year}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="text-sm">Région</span>
                        </div>
                        <span className="font-medium">{credit.region}</span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="bg-green-50 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Total</span>
                        <span className="text-xl font-bold text-green-700">
                          {(credit.quantity_tonnes_co2 * credit.price_per_tonne).toLocaleString()} XOF
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    {isRSE ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                        onClick={() => handlePurchase(credit)}
                        disabled={purchasingId === credit._id || credit.status !== 'available'}
                      >
                        {purchasingId === credit._id ? (
                          'Traitement...'
                        ) : credit.status !== 'available' ? (
                          'Non disponible'
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4 mr-2" />
                            Acheter ces crédits
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="outline"
                        className="w-full border-green-600 text-green-600 hover:bg-green-50"
                        onClick={() => navigate('/login')}
                      >
                        {user ? 'Réservé aux entreprises RSE' : 'Se connecter pour acheter'}
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* How it works */}
          <Card className="mt-12 p-8 bg-gradient-to-r from-gray-50 to-green-50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Comment fonctionne notre marketplace?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TreePine className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Projets Vérifiés</h3>
                <p className="text-gray-600 text-sm">
                  Tous nos crédits proviennent de projets agricoles durables certifiés par des standards internationaux
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Certificats Officiels</h3>
                <p className="text-gray-600 text-sm">
                  Recevez des certificats conformes aux normes CSRD et utilisables pour vos rapports RSE
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Impact Traçable</h3>
                <p className="text-gray-600 text-sm">
                  Suivez l'impact réel de vos investissements sur les communautés agricoles ivoiriennes
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CarbonMarketplace;
