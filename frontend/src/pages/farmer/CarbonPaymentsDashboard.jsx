import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Leaf, Wallet, TrendingUp, Calendar,
  Clock, CheckCircle, AlertCircle, RefreshCw,
  TreeDeciduous, Coins, Phone, ArrowRight,
  Smartphone, ShoppingBag, Banknote, Sparkles,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { num: 1, icon: Phone, text: "Compose *144*99# (gratuit)", color: "bg-emerald-500" },
  { num: 2, icon: Sparkles, text: "Réponds à 8 questions simples", color: "bg-blue-500" },
  { num: 3, icon: Leaf, text: "Reçois ta prime carbone estimée", color: "bg-teal-500" },
  { num: 4, icon: ShoppingBag, text: "Vends ton cacao à un acheteur responsable", color: "bg-amber-500" },
  { num: 5, icon: Banknote, text: "Reçois prix normal + prime sur Orange Money", color: "bg-orange-500" },
];

const CarbonPaymentsDashboard = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [primeResult, setPrimeResult] = useState(null);
  const [requestingPayment, setRequestingPayment] = useState(false);

  // Formulaire "Ma Prime" — 8 questions
  const [form, setForm] = useState({
    hectares: '',
    grands_arbres: '',
    culture: '',
    engrais_chimique: '',
    brulage: '',
    residus_au_sol: '',
    plantes_couverture: '',
    especes_arbres: '',
  });

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    } else {
      setLoading(false);
      setShowCalculator(true);
    }
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/carbon-payments/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Erreur lors du chargement');
      setData(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    if (!form.hectares || !form.grands_arbres || !form.culture || form.engrais_chimique === '' ||
        form.brulage === '' || form.residus_au_sol === '' || form.plantes_couverture === '' || !form.especes_arbres) {
      return;
    }
    setCalculating(true);
    try {
      const payload = {
        hectares: parseFloat(form.hectares),
        grands_arbres: parseInt(form.grands_arbres),
        culture: form.culture,
        engrais_chimique: form.engrais_chimique === 'oui',
        brulage: form.brulage === 'oui',
        residus_au_sol: form.residus_au_sol === 'oui',
        plantes_couverture: form.plantes_couverture === 'oui',
        especes_arbres: parseInt(form.especes_arbres),
      };
      const response = await fetch(`${API_URL}/api/carbon-payments/ma-prime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Erreur de calcul');
      const result = await response.json();
      setPrimeResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setCalculating(false);
    }
  };

  const handleRequestPayment = async () => {
    setRequestingPayment(true);
    try {
      await fetch(`${API_URL}/api/carbon-payments/request-payment`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      alert('Votre demande de paiement a été envoyée à votre coopérative.');
      fetchDashboardData();
    } catch {
      alert('Erreur lors de la demande');
    } finally {
      setRequestingPayment(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('fr-FR').format(n || 0);

  const getStatusColor = (s) => ({
    completed: 'bg-emerald-100 text-emerald-700',
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    scheduled: 'bg-purple-100 text-purple-700',
  }[s] || 'bg-gray-100 text-gray-700');

  const getStatusLabel = (s) => ({
    completed: 'Payé', pending: 'En attente', processing: 'En cours', scheduled: 'Programmé'
  }[s] || s);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" data-testid="loading-state">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error && !token) {
    // Pas connecté — on affiche directement le calculateur sans bloquer
    // Le code continue vers le render principal
  } else if (error && token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" data-testid="error-state">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 font-medium">{error}</p>
          <button onClick={fetchDashboardData} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { earnings, monthly_history, recent_payments, upcoming_payments } = data || {};

  return (
    <div className="min-h-screen bg-gray-50 pb-8" data-testid="carbon-payments-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Coins className="w-8 h-8" />
                Ma Prime Carbone
              </h1>
              <p className="text-emerald-100 mt-1">
                Découvre combien tu gagnes grâce à tes bonnes pratiques
              </p>
            </div>
            <button onClick={fetchDashboardData} className="p-2 rounded-full bg-white/10 hover:bg-white/20" data-testid="refresh-btn">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Résumé */}
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <Wallet className="w-4 h-4" />
                Total Reçu
              </div>
              <p className="text-2xl font-bold mt-1">{fmt(earnings?.total_received_xof)} <span className="text-sm font-normal">FCFA</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <Leaf className="w-4 h-4" />
                Prime/kg
              </div>
              <p className="text-2xl font-bold mt-1">{fmt(earnings?.premium_per_kg_xof || primeResult?.prime_par_kg_fcfa)} <span className="text-sm font-normal">FCFA</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4">
        {/* Comment ça marche */}
        <Card className="mb-6 border-0 shadow-lg" data-testid="how-it-works">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-gray-800 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Comment ça marche ?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-emerald-600 font-medium mb-4">En moins de 60 secondes :</p>
            <div className="space-y-3">
              {STEPS.map((step) => (
                <div key={step.num} className="flex items-center gap-3" data-testid={`step-${step.num}`}>
                  <div className={`${step.color} w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                    {step.num}
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <step.icon className="w-4 h-4 text-gray-500 shrink-0" />
                    <p className="text-sm text-gray-700">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Calculer Ma Prime */}
        <Card className="mb-6 border-2 border-emerald-200 shadow-lg" data-testid="prime-calculator">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-lg text-gray-800">
                <Leaf className="w-5 h-5 text-emerald-600" />
                Calculer Ma Prime
              </span>
              {!showCalculator && (
                <Button
                  onClick={() => setShowCalculator(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="start-calculator-btn"
                >
                  Estimer ma prime
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          {showCalculator && (
            <CardContent className="space-y-4">
              {/* 8 questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Hectares */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">1. Combien d'hectares ?</Label>
                  <Input
                    type="number"
                    value={form.hectares}
                    onChange={(e) => setForm({ ...form, hectares: e.target.value })}
                    placeholder="Ex: 3"
                    className="mt-1"
                    data-testid="q-hectares"
                  />
                </div>
                {/* 2. Arbres grands */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">2. Arbres grands ({'>'}8m) par hectare ?</Label>
                  <Input
                    type="number"
                    value={form.grands_arbres}
                    onChange={(e) => setForm({ ...form, grands_arbres: e.target.value })}
                    placeholder="Ex: 48"
                    className="mt-1"
                    data-testid="q-arbres"
                  />
                </div>
                {/* 3. Culture */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">3. Quelle culture ?</Label>
                  <Select value={form.culture} onValueChange={(v) => setForm({ ...form, culture: v })}>
                    <SelectTrigger className="mt-1" data-testid="q-culture">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cacao">Cacao</SelectItem>
                      <SelectItem value="cafe">Café</SelectItem>
                      <SelectItem value="anacarde">Anacarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 4. Engrais chimique */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">4. Engrais chimique ?</Label>
                  <Select value={form.engrais_chimique} onValueChange={(v) => setForm({ ...form, engrais_chimique: v })}>
                    <SelectTrigger className="mt-1" data-testid="q-engrais">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 5. Brûlage */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">5. Brûlage des résidus ?</Label>
                  <Select value={form.brulage} onValueChange={(v) => setForm({ ...form, brulage: v })}>
                    <SelectTrigger className="mt-1" data-testid="q-brulage">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 6. Résidus au sol */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">6. Résidus de récolte au sol ?</Label>
                  <Select value={form.residus_au_sol} onValueChange={(v) => setForm({ ...form, residus_au_sol: v })}>
                    <SelectTrigger className="mt-1" data-testid="q-residus">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui, je les laisse</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 7. Plantes de couverture */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">7. Plantes de couverture ?</Label>
                  <Select value={form.plantes_couverture} onValueChange={(v) => setForm({ ...form, plantes_couverture: v })}>
                    <SelectTrigger className="mt-1" data-testid="q-couverture">
                      <SelectValue placeholder="Choisir..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="oui">Oui</SelectItem>
                      <SelectItem value="non">Non</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* 8. Espèces d'arbres */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">8. Espèces d'arbres différentes ?</Label>
                  <Input
                    type="number"
                    value={form.especes_arbres}
                    onChange={(e) => setForm({ ...form, especes_arbres: e.target.value })}
                    placeholder="Ex: 5"
                    className="mt-1"
                    data-testid="q-especes"
                  />
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                disabled={calculating}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-6 text-lg"
                data-testid="calculate-prime-btn"
              >
                {calculating ? 'Calcul en cours...' : 'Calculer ma prime'}
              </Button>
            </CardContent>
          )}

          {/* Résultat de la prime */}
          {primeResult && (
            <CardContent data-testid="prime-result">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
                <p className="text-emerald-100 text-sm mb-1">Ta prime carbone estimée</p>
                <p className="text-5xl sm:text-6xl font-black">
                  {fmt(primeResult.prime_par_kg_fcfa)}
                </p>
                <p className="text-xl font-medium mt-1">FCFA / kg de {primeResult.culture}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200">Prime annuelle</p>
                    <p className="text-xl font-bold">{fmt(primeResult.prime_annuelle_fcfa)} FCFA</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-3">
                    <p className="text-emerald-200">CO2 séquestré/an</p>
                    <p className="text-xl font-bold">{primeResult.tonnes_co2_an} tonnes</p>
                  </div>
                </div>
                <p className="text-emerald-100 text-sm mt-4 italic">
                  {primeResult.conseil}
                </p>
              </div>

              {/* Certification Quality Compliance */}
              {primeResult.ars_level && (
                <div className={`mt-4 rounded-xl p-4 border ${
                  primeResult.ars_level === 'Or' ? 'bg-yellow-50 border-yellow-300' :
                  primeResult.ars_level === 'Argent' ? 'bg-slate-50 border-slate-300' :
                  primeResult.ars_level === 'Bronze' ? 'bg-orange-50 border-orange-300' :
                  'bg-red-50 border-red-200'
                }`} data-testid="ars-result">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Award className={`w-5 h-5 ${
                        primeResult.ars_level === 'Or' ? 'text-yellow-600' :
                        primeResult.ars_level === 'Argent' ? 'text-slate-500' :
                        primeResult.ars_level === 'Bronze' ? 'text-orange-600' :
                        'text-red-500'
                      }`} />
                      <span className="text-sm font-semibold text-gray-800">Score Pratiques Durables</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      primeResult.ars_level === 'Or' ? 'bg-yellow-200 text-yellow-800' :
                      primeResult.ars_level === 'Argent' ? 'bg-slate-200 text-slate-700' :
                      primeResult.ars_level === 'Bronze' ? 'bg-orange-200 text-orange-800' :
                      'bg-red-200 text-red-700'
                    }`} data-testid="ars-level-badge">
                      {primeResult.ars_level === 'Or' ? 'Excellent' : primeResult.ars_level === 'Argent' ? 'Tres Bon' : primeResult.ars_level === 'Bronze' ? 'Bon' : 'A ameliorer'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-1000 ${
                        primeResult.ars_level === 'Or' ? 'bg-yellow-500' :
                        primeResult.ars_level === 'Argent' ? 'bg-slate-400' :
                        primeResult.ars_level === 'Bronze' ? 'bg-orange-400' :
                        'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(primeResult.ars_pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mb-2">
                    <span>{primeResult.ars_pct}%</span>
                    <div className="flex gap-3">
                      <span>Bon 30%</span>
                      <span>Tres Bon 55%</span>
                      <span>Excellent 80%</span>
                    </div>
                  </div>
                  {primeResult.ars_conseil && (
                    <p className="text-xs text-gray-600 italic">{primeResult.ars_conseil}</p>
                  )}
                </div>
              )}

              <p className="text-xs text-gray-500 text-center mt-3">
                {primeResult.arbres_par_ha} arbres/ha, {primeResult.hectares} ha, score carbone {primeResult.score_carbone} t CO2/ha/an
              </p>
            </CardContent>
          )}
        </Card>

        {/* Mes versements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demander versement */}
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-2">Demander un versement</h3>
              <p className="text-sm text-amber-100 mb-4">
                Ta prime sera versée sur Orange Money le jour même
              </p>
              <button
                onClick={handleRequestPayment}
                disabled={requestingPayment}
                className="w-full py-3 bg-white text-amber-600 font-medium rounded-xl hover:bg-amber-50 transition disabled:opacity-50"
                data-testid="request-payment-btn"
              >
                {requestingPayment ? 'Envoi...' : 'Demander le paiement'}
              </button>
            </CardContent>
          </Card>

          {/* Derniers versements */}
          <Card className="border-0 shadow-lg" data-testid="recent-payments">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Derniers versements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recent_payments?.length > 0 ? (
                <div className="space-y-2">
                  {recent_payments.slice(0, 5).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{fmt(p.amount_xof)} FCFA</p>
                        <p className="text-xs text-gray-500">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('fr-FR') : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(p.status)}`}>
                        {getStatusLabel(p.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Pas encore de versement</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historique mensuel */}
        {monthly_history?.some(m => m.amount_xof > 0) && (
          <Card className="mt-6 border-0 shadow-lg" data-testid="monthly-history">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Mes 12 derniers mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1 h-32">
                {monthly_history?.map((m, i) => {
                  const max = Math.max(...(monthly_history?.map(x => x.amount_xof) || [1]));
                  const h = m.amount_xof > 0 ? (m.amount_xof / max) * 100 : 5;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t ${m.amount_xof > 0 ? 'bg-emerald-500' : 'bg-gray-200'}`}
                        style={{ height: `${h}%` }}
                        title={`${m.month}: ${fmt(m.amount_xof)} FCFA`}
                      />
                      <span className="text-[10px] text-gray-500 mt-1">{m.month.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CarbonPaymentsDashboard;
