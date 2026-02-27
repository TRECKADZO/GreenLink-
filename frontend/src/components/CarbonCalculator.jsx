import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  Leaf, 
  TreePine, 
  DollarSign, 
  X,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const farmingPractices = [
  { id: 'agroforesterie', label: 'Agroforesterie', bonus: 2.0 },
  { id: 'compost', label: 'Compost organique', bonus: 1.5 },
  { id: 'zero_pesticides', label: 'Zéro pesticides', bonus: 1.5 },
  { id: 'couverture_vegetale', label: 'Couverture végétale', bonus: 1.0 },
  { id: 'rotation_cultures', label: 'Rotation des cultures', bonus: 0.5 },
];

const CarbonCalculator = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    hectares: '',
    trees: '',
    practices: [],
    cropType: 'cacao'
  });
  const [result, setResult] = useState(null);

  const togglePractice = (practiceId) => {
    setFormData(prev => ({
      ...prev,
      practices: prev.practices.includes(practiceId)
        ? prev.practices.filter(p => p !== practiceId)
        : [...prev.practices, practiceId]
    }));
  };

  const calculatePremium = () => {
    const hectares = parseFloat(formData.hectares) || 0;
    const trees = parseInt(formData.trees) || 0;
    
    // Base carbon score calculation
    let carbonScore = 5.0;
    
    // Add bonus for practices
    const practiceBonus = formData.practices.reduce((acc, practiceId) => {
      const practice = farmingPractices.find(p => p.id === practiceId);
      return acc + (practice?.bonus || 0);
    }, 0);
    
    carbonScore = Math.min(10, carbonScore + practiceBonus);
    
    // Trees bonus
    const treesPerHa = trees / (hectares || 1);
    if (treesPerHa > 400) carbonScore = Math.min(10, carbonScore + 0.5);
    
    // Calculate carbon credits (simplified formula)
    const carbonCredits = (hectares * carbonScore * 0.8).toFixed(1);
    
    // Calculate premium (10% bonus if score >= 7)
    const baseRevenue = hectares * 850 * 1000; // FCFA per hectare per year
    const premiumRate = carbonScore >= 7 ? 0.10 : 0;
    const carbonPremium = baseRevenue * premiumRate;
    
    // Eligibility
    const isEligible = carbonScore >= 7;
    
    setResult({
      carbonScore,
      carbonCredits,
      isEligible,
      premiumRate: premiumRate * 100,
      estimatedPremium: carbonPremium,
      estimatedRevenue: baseRevenue,
      treesPerHa
    });
    
    setStep(3);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Calculator className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Calculateur de Prime Carbone</h2>
                <p className="text-white/80 text-sm">Estimez vos revenus carbone en 2 minutes</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Progress */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`flex-1 h-2 rounded-full transition-all ${
                  s <= step ? 'bg-[#d4a574]' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Informations sur votre exploitation
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hectares" className="text-gray-700">
                    Surface cultivée (hectares)
                  </Label>
                  <Input
                    id="hectares"
                    type="number"
                    placeholder="Ex: 5"
                    value={formData.hectares}
                    onChange={(e) => setFormData({...formData, hectares: e.target.value})}
                    className="mt-1"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="trees" className="text-gray-700">
                    Nombre d'arbres plantés
                  </Label>
                  <Input
                    id="trees"
                    type="number"
                    placeholder="Ex: 2000"
                    value={formData.trees}
                    onChange={(e) => setFormData({...formData, trees: e.target.value})}
                    className="mt-1"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-700">Type de culture principale</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {['cacao', 'anacarde', 'cafe'].map((crop) => (
                    <button
                      key={crop}
                      onClick={() => setFormData({...formData, cropType: crop})}
                      className={`p-3 rounded-lg border-2 transition-all capitalize ${
                        formData.cropType === crop
                          ? 'border-[#2d5a4d] bg-[#2d5a4d]/10 text-[#2d5a4d]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {crop === 'cafe' ? 'Café' : crop.charAt(0).toUpperCase() + crop.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)}
                className="w-full bg-[#2d5a4d] hover:bg-[#1a4038]"
                disabled={!formData.hectares || !formData.trees}
              >
                Continuer
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Farming Practices */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Vos pratiques agricoles durables
              </h3>
              <p className="text-gray-600 text-sm">
                Sélectionnez les pratiques que vous appliquez sur votre exploitation
              </p>
              
              <div className="space-y-3">
                {farmingPractices.map((practice) => (
                  <button
                    key={practice.id}
                    onClick={() => togglePractice(practice.id)}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                      formData.practices.includes(practice.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        formData.practices.includes(practice.id)
                          ? 'border-green-500 bg-green-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.practices.includes(practice.id) && (
                          <CheckCircle className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{practice.label}</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700">
                      +{practice.bonus} pts
                    </Badge>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Retour
                </Button>
                <Button 
                  onClick={calculatePremium}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                >
                  Calculer ma prime
                  <Calculator className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && result && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  result.isEligible ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {result.isEligible ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <Leaf className="w-10 h-10 text-orange-600" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {result.isEligible ? 'Félicitations !' : 'Presque éligible !'}
                </h3>
                <p className="text-gray-600">
                  {result.isEligible 
                    ? 'Vous êtes éligible à la prime carbone de 10%'
                    : 'Améliorez vos pratiques pour atteindre le score de 7/10'
                  }
                </p>
              </div>

              {/* Score Card */}
              <div className="bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/80">Votre Score Carbone</span>
                  <Badge className={`text-lg px-3 py-1 ${
                    result.isEligible 
                      ? 'bg-green-400/30 text-green-100' 
                      : 'bg-orange-400/30 text-orange-100'
                  }`}>
                    {result.carbonScore.toFixed(1)}/10
                  </Badge>
                </div>
                
                <div className="w-full bg-white/20 rounded-full h-4 mb-2">
                  <div 
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      result.isEligible ? 'bg-green-400' : 'bg-orange-400'
                    }`}
                    style={{ width: `${result.carbonScore * 10}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>0</span>
                  <span className="text-[#d4a574]">Seuil: 7</span>
                  <span>10</span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">Crédits Carbone</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {result.carbonCredits} <span className="text-sm">tCO₂</span>
                  </p>
                </Card>
                
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TreePine className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-purple-700">Densité arbres</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-800">
                    {result.treesPerHa.toFixed(0)} <span className="text-sm">/ha</span>
                  </p>
                </Card>
                
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-blue-700">Revenu estimé/an</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800">
                    {(result.estimatedRevenue / 1000000).toFixed(1)}M <span className="text-sm">FCFA</span>
                  </p>
                </Card>
                
                <Card className={`p-4 ${result.isEligible ? 'bg-[#d4a574]/20 border-[#d4a574]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`w-5 h-5 ${result.isEligible ? 'text-[#c49564]' : 'text-gray-400'}`} />
                    <span className={`text-sm ${result.isEligible ? 'text-[#8b6914]' : 'text-gray-500'}`}>
                      Prime Carbone ({result.premiumRate}%)
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${result.isEligible ? 'text-[#8b6914]' : 'text-gray-400'}`}>
                    {result.isEligible 
                      ? `+${(result.estimatedPremium / 1000000).toFixed(1)}M` 
                      : '0'
                    } <span className="text-sm">FCFA</span>
                  </p>
                </Card>
              </div>

              {/* CTA */}
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setResult(null);
                  }}
                  className="flex-1"
                >
                  Recalculer
                </Button>
                <Button 
                  onClick={onClose}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                >
                  {result.isEligible ? "S'inscrire maintenant" : "Améliorer mon score"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CarbonCalculator;
