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
  ArrowRight,
  Loader2,
  Ruler,
  Award
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const farmingPractices = [
  { id: 'agroforesterie', label: 'Agroforesterie', description: 'Arbres et cultures ensemble' },
  { id: 'compost', label: 'Compost organique', description: 'Engrais naturel' },
  { id: 'zero_pesticides', label: 'Zero pesticides chimiques', description: 'Agriculture propre' },
  { id: 'couverture_vegetale', label: 'Couverture vegetale', description: 'Protection du sol' },
  { id: 'rotation_cultures', label: 'Rotation des cultures', description: 'Diversification' },
];

const CarbonCalculator = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [calculating, setCalculating] = useState(false);
  const [formData, setFormData] = useState({
    hectares: '',
    arbres_grands: '',
    arbres_moyens: '',
    arbres_petits: '',
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

  const totalTrees = (parseInt(formData.arbres_grands) || 0) + (parseInt(formData.arbres_moyens) || 0) + (parseInt(formData.arbres_petits) || 0);

  const calculatePremium = async () => {
    setCalculating(true);
    try {
      const response = await fetch(`${API_URL}/api/ussd/calculate-premium`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hectares: parseFloat(formData.hectares) || 1,
          arbres_grands: parseInt(formData.arbres_grands) || 0,
          arbres_moyens: parseInt(formData.arbres_moyens) || 0,
          arbres_petits: parseInt(formData.arbres_petits) || 0,
          culture: formData.cropType,
          practices: formData.practices
        })
      });
      const data = await response.json();
      setResult(data);
      setStep(3);
    } catch (error) {
      console.error('Calculation error:', error);
    } finally {
      setCalculating(false);
    }
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
                <h2 className="text-xl sm:text-2xl font-bold text-white">Calculateur de Prime Carbone</h2>
                <p className="text-white/80 text-sm">Estimez votre prime en 2 minutes</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
              data-testid="close-calculator"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
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
          {/* Step 1: Basic Info + Tree Categories */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Informations sur votre exploitation
              </h3>
              
              <div>
                <Label htmlFor="hectares" className="text-gray-700">
                  Surface cultivee (hectares)
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
                  data-testid="input-hectares"
                />
              </div>

              {/* Tree Height Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="w-4 h-4 text-[#2d5a4d]" />
                  <Label className="text-gray-700 font-medium">Arbres d'ombrage par taille</Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-2">
                      <TreePine className="w-5 h-5 text-emerald-700" />
                      <span className="text-xs font-semibold text-emerald-700">GRANDS</span>
                    </div>
                    <p className="text-[10px] text-emerald-600 mb-2">&gt; 12 metres</p>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.arbres_grands}
                      onChange={(e) => setFormData({...formData, arbres_grands: e.target.value})}
                      className="h-9 text-center bg-white border-emerald-300"
                      min="0"
                      data-testid="input-arbres-grands"
                    />
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-2">
                      <TreePine className="w-4 h-4 text-amber-700" />
                      <span className="text-xs font-semibold text-amber-700">MOYENS</span>
                    </div>
                    <p className="text-[10px] text-amber-600 mb-2">8 - 12 metres</p>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.arbres_moyens}
                      onChange={(e) => setFormData({...formData, arbres_moyens: e.target.value})}
                      className="h-9 text-center bg-white border-amber-300"
                      min="0"
                      data-testid="input-arbres-moyens"
                    />
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                    <div className="flex items-center gap-1 mb-2">
                      <TreePine className="w-3 h-3 text-sky-700" />
                      <span className="text-xs font-semibold text-sky-700">PETITS</span>
                    </div>
                    <p className="text-[10px] text-sky-600 mb-2">&lt; 8 metres</p>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.arbres_petits}
                      onChange={(e) => setFormData({...formData, arbres_petits: e.target.value})}
                      className="h-9 text-center bg-white border-sky-300"
                      min="0"
                      data-testid="input-arbres-petits"
                    />
                  </div>
                </div>
                {totalTrees > 0 && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Total: {totalTrees} arbres {formData.hectares ? `(${Math.round(totalTrees / Math.max(parseFloat(formData.hectares), 0.1))}/ha)` : ''}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">
                  Les grands arbres sequestrent plus de carbone (coefficient x1.0 vs x0.7 et x0.3)
                </p>
              </div>

              <div>
                <Label className="text-gray-700">Type de culture principale</Label>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {[{id: 'cacao', label: 'Cacao'}, {id: 'cafe', label: 'Cafe'}, {id: 'anacarde', label: 'Anacarde'}].map((crop) => (
                    <button
                      key={crop.id}
                      onClick={() => setFormData({...formData, cropType: crop.id})}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        formData.cropType === crop.id
                          ? 'border-[#2d5a4d] bg-[#2d5a4d]/10 text-[#2d5a4d] font-medium'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`crop-${crop.id}`}
                    >
                      {crop.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => setStep(2)}
                className="w-full bg-[#2d5a4d] hover:bg-[#1a4038]"
                disabled={!formData.hectares || totalTrees === 0}
                data-testid="step1-next"
              >
                Continuer
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Practices */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Vos pratiques agricoles durables
              </h3>
              <p className="text-gray-600 text-sm">
                Selectionnez les pratiques que vous appliquez
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
                    data-testid={`practice-${practice.id}`}
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
                      <div className="text-left">
                        <span className="font-medium text-gray-900">{practice.label}</span>
                        <p className="text-xs text-gray-500">{practice.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button 
                  onClick={calculatePremium}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                  disabled={calculating}
                  data-testid="calculate-btn"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calcul...
                    </>
                  ) : (
                    <>
                      Calculer ma prime
                      <Calculator className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && result && (
            <div className="space-y-6">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
                  result.eligible ? 'bg-green-100' : 'bg-orange-100'
                }`}>
                  {result.eligible ? (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  ) : (
                    <Leaf className="w-10 h-10 text-orange-600" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900" data-testid="result-title">
                  {result.eligible ? 'Vous etes eligible !' : 'Continuez vos efforts !'}
                </h3>
                <p className="text-gray-600">
                  {result.eligible 
                    ? 'Votre exploitation est eligible a la prime carbone GreenLink'
                    : 'Ameliorez vos pratiques pour atteindre un score de 5/10'
                  }
                </p>
              </div>

              {/* Score */}
              <div className="bg-gradient-to-br from-[#2d5a4d] to-[#1a4038] rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white/80">Votre Score Carbone</span>
                  <Badge className={`text-lg px-3 py-1 ${
                    result.eligible 
                      ? 'bg-green-400/30 text-green-100' 
                      : 'bg-orange-400/30 text-orange-100'
                  }`} data-testid="score-badge">
                    {result.score}/10
                  </Badge>
                </div>
                <div className="w-full bg-white/20 rounded-full h-4 mb-2">
                  <div 
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      result.eligible ? 'bg-green-400' : 'bg-orange-400'
                    }`}
                    style={{ width: `${result.score * 10}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60">
                  <span>0</span>
                  <span className="text-[#d4a574]">Seuil: 5</span>
                  <span>10</span>
                </div>
              </div>

              {/* Tree Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <TreePine className="w-4 h-4 text-[#2d5a4d]" />
                  Vos arbres d'ombrage
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="bg-emerald-100 rounded-lg p-2">
                    <p className="text-lg font-bold text-emerald-800">{result.arbres_grands || 0}</p>
                    <p className="text-[10px] text-emerald-600">Grands (&gt;12m)</p>
                  </div>
                  <div className="bg-amber-100 rounded-lg p-2">
                    <p className="text-lg font-bold text-amber-800">{result.arbres_moyens || 0}</p>
                    <p className="text-[10px] text-amber-600">Moyens (8-12m)</p>
                  </div>
                  <div className="bg-sky-100 rounded-lg p-2">
                    <p className="text-lg font-bold text-sky-800">{result.arbres_petits || 0}</p>
                    <p className="text-[10px] text-sky-600">Petits (&lt;8m)</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Densite ponderee: {result.arbres_par_ha} arbres equivalents/ha
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 bg-green-50 border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700">CO2 sequestre</span>
                  </div>
                  <p className="text-2xl font-bold text-green-800" data-testid="co2-value">
                    {result.co2_par_ha} <span className="text-sm">t/ha/an</span>
                  </p>
                </Card>
                
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <TreePine className="w-5 h-5 text-purple-600" />
                    <span className="text-sm text-purple-700">Total arbres</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-800">
                    {result.total_arbres} <span className="text-sm">arbres</span>
                  </p>
                </Card>
                
                <Card className={`p-4 ${result.eligible ? 'bg-[#d4a574]/20 border-[#d4a574]' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`w-5 h-5 ${result.eligible ? 'text-[#c49564]' : 'text-gray-400'}`} />
                    <span className={`text-sm ${result.eligible ? 'text-[#8b6914]' : 'text-gray-500'}`}>
                      Prime par kg
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${result.eligible ? 'text-[#8b6914]' : 'text-gray-400'}`} data-testid="prime-kg-value">
                    {result.prime_fcfa_kg} <span className="text-sm">FCFA/kg</span>
                  </p>
                </Card>
                
                <Card className={`p-4 ${result.eligible ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`w-5 h-5 ${result.eligible ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <span className={`text-sm ${result.eligible ? 'text-emerald-700' : 'text-gray-500'}`}>
                      Prime annuelle
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${result.eligible ? 'text-emerald-800' : 'text-gray-400'}`} data-testid="prime-annual-value">
                    {(result.prime_annuelle / 1000).toFixed(0)}K <span className="text-sm">FCFA</span>
                  </p>
                </Card>
              </div>

              {/* ARS 1000 Compliance */}
              {result.ars_level && (
                <div className={`rounded-xl p-4 border ${
                  result.ars_level === 'Or' ? 'bg-yellow-50 border-yellow-300' :
                  result.ars_level === 'Argent' ? 'bg-slate-50 border-slate-300' :
                  result.ars_level === 'Bronze' ? 'bg-orange-50 border-orange-300' :
                  'bg-red-50 border-red-200'
                }`} data-testid="ars-section">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award className={`w-5 h-5 ${
                        result.ars_level === 'Or' ? 'text-yellow-600' :
                        result.ars_level === 'Argent' ? 'text-slate-500' :
                        result.ars_level === 'Bronze' ? 'text-orange-600' :
                        'text-red-500'
                      }`} />
                      <span className="text-sm font-semibold text-gray-800">Conformite ARS 1000</span>
                    </div>
                    <Badge className={`px-2 py-0.5 text-xs font-bold ${
                      result.ars_level === 'Or' ? 'bg-yellow-200 text-yellow-800' :
                      result.ars_level === 'Argent' ? 'bg-slate-200 text-slate-700' :
                      result.ars_level === 'Bronze' ? 'bg-orange-200 text-orange-800' :
                      'bg-red-200 text-red-700'
                    }`} data-testid="ars-badge">
                      {result.ars_level}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-1000 ${
                        result.ars_level === 'Or' ? 'bg-yellow-500' :
                        result.ars_level === 'Argent' ? 'bg-slate-400' :
                        result.ars_level === 'Bronze' ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(result.ars_pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                    <span>{result.ars_pct}%</span>
                    <div className="flex gap-3">
                      <span>Bronze 30%</span>
                      <span>Argent 55%</span>
                      <span>Or 80%</span>
                    </div>
                  </div>
                  {result.ars_conseil && (
                    <p className="text-xs text-gray-600 italic">{result.ars_conseil}</p>
                  )}
                </div>
              )}

              {!result.eligible && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">Pour ameliorer votre score :</p>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>- Plantez plus d'arbres d'ombrage (surtout des grands &gt; 12m)</li>
                    <li>- Pratiquez l'agroforesterie</li>
                    <li>- Utilisez du compost organique</li>
                    <li>- Evitez les pesticides chimiques</li>
                  </ul>
                </div>
              )}

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => { setStep(1); setResult(null); }}
                  className="flex-1"
                  data-testid="recalculate-btn"
                >
                  Recalculer
                </Button>
                <Button 
                  onClick={onClose}
                  className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038]"
                  data-testid="calculator-cta-btn"
                >
                  {result.eligible ? "S'inscrire" : "Ameliorer mon score"}
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
