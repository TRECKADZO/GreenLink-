import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { ArrowLeft, Leaf, Check, X, Minus, Save, BarChart3, Users } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REDD_CATEGORIES = [
  {
    id: 'agroforesterie',
    title: 'Agroforesterie',
    color: '#059669',
    bgColor: '#d1fae5',
    practices: [
      { code: 'AGF1', name: "Arbres d'ombrage (30-50% couverture)" },
      { code: 'AGF2', name: 'Systeme agroforestier multi-strates' },
      { code: 'AGF3', name: 'Enrichissement parcelles' },
      { code: 'AGF4', name: 'Transition plein soleil vers ombrage' },
    ],
  },
  {
    id: 'zero_deforestation',
    title: 'Zero-Deforestation',
    color: '#2563eb',
    bgColor: '#dbeafe',
    practices: [
      { code: 'ZD1', name: 'Intensification durable' },
      { code: 'ZD2', name: 'Engagement zero deforestation' },
      { code: 'ZD3', name: 'Restauration parcelles degradees' },
      { code: 'ZD4', name: 'Protection forets classees' },
    ],
  },
  {
    id: 'gestion_sols',
    title: 'Gestion Sols Bas-Carbone',
    color: '#d97706',
    bgColor: '#fef3c7',
    practices: [
      { code: 'SOL1', name: 'Paillage et compostage' },
      { code: 'SOL2', name: 'Biochar' },
      { code: 'SOL3', name: 'Couverture vegetale' },
      { code: 'SOL4', name: 'Gestion integree ravageurs' },
      { code: 'SOL5', name: 'Taille et elagage sanitaire' },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration et Conservation',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    practices: [
      { code: 'REST1', name: 'Reboisement et regeneration assistee' },
      { code: 'REST2', name: 'Plantations bois-energie' },
      { code: 'REST3', name: 'Protection zones ripariennes' },
      { code: 'REST4', name: 'Valorisation residus agricoles' },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite et Conformite',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    practices: [
      { code: 'TRAC1', name: 'Enregistrement GPS parcelles' },
      { code: 'TRAC2', name: 'Safeguards sociaux' },
      { code: 'TRAC3', name: 'Monitoring MRV' },
      { code: 'TRAC4', name: 'Certification ARS 1000' },
    ],
  },
];

const REDDTrackingPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramFarmerName = searchParams.get('farmer') || '';
  const paramFarmerPhone = searchParams.get('phone') || '';
  const paramFarmerId = searchParams.get('id') || '';
  const [tab, setTab] = useState('form');
  const [farmerName, setFarmerName] = useState(paramFarmerName);
  const [farmerPhone, setFarmerPhone] = useState(paramFarmerPhone);
  const [farmerId] = useState(paramFarmerId);
  const [superficie, setSuperficie] = useState('');
  const [arbres, setArbres] = useState('');
  const [practiceStatuses, setPracticeStatuses] = useState({});
  const [observations, setObservations] = useState('');
  const [recommandations, setRecommandations] = useState('');
  const [suiviRequis, setSuiviRequis] = useState(false);
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (tab === 'historique') loadVisits();
    if (tab === 'stats') loadStats();
  }, [tab]);

  const loadVisits = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/redd/tracking/visits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVisits(data.visits || []);
    } catch (e) {
      console.error('Error loading visits:', e);
    }
  };

  const loadStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/redd/tracking/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(await res.json());
    } catch (e) {
      console.error('Error loading stats:', e);
    }
  };

  const togglePractice = (code) => {
    setPracticeStatuses(prev => {
      const current = prev[code];
      if (!current || current === 'non_evalue') return { ...prev, [code]: 'conforme' };
      if (current === 'conforme') return { ...prev, [code]: 'non_conforme' };
      return { ...prev, [code]: 'non_evalue' };
    });
  };

  const computeSummary = () => {
    let total = 0, verified = 0;
    Object.values(practiceStatuses).forEach(s => {
      if (s !== 'non_evalue') total++;
      if (s === 'conforme') verified++;
    });
    return { total, verified, pct: total > 0 ? Math.round(verified / total * 100) : 0 };
  };

  const handleSubmit = async () => {
    if (!farmerName.trim()) {
      alert('Veuillez entrer le nom du producteur');
      return;
    }
    const evaluated = Object.entries(practiceStatuses).filter(([_, s]) => s !== 'non_evalue');
    if (evaluated.length === 0) {
      alert('Veuillez evaluer au moins une pratique');
      return;
    }

    setLoading(true);
    const practices_verified = [];
    for (const cat of REDD_CATEGORIES) {
      for (const p of cat.practices) {
        const status = practiceStatuses[p.code];
        if (status && status !== 'non_evalue') {
          practices_verified.push({ code: p.code, name: p.name, category: cat.id, status });
        }
      }
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/redd/tracking/visit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farmer_id: farmerId || `web_${Date.now()}`,
          farmer_name: farmerName,
          farmer_phone: farmerPhone,
          practices_verified,
          superficie_verifiee: parseFloat(superficie) || 0,
          arbres_comptes: parseInt(arbres) || 0,
          observations,
          recommandations,
          suivi_requis: suiviRequis,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Fiche enregistree ! Score REDD+: ${data.redd_score}/10 (${data.redd_level})`);
        resetForm();
      } else {
        alert(data.detail || 'Erreur lors de l\'enregistrement');
      }
    } catch (e) {
      alert('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFarmerName('');
    setFarmerPhone('');
    setSuperficie('');
    setArbres('');
    setPracticeStatuses({});
    setObservations('');
    setRecommandations('');
    setSuiviRequis(false);
  };

  const summary = computeSummary();

  return (
    <div className="min-h-screen bg-[#f8fafc]" data-testid="redd-tracking-page">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 pt-20 pb-8 sm:pt-24">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 text-gray-500 hover:text-gray-800"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <Leaf className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fiche de suivi REDD+</h1>
            <p className="text-sm text-gray-500">Verification terrain des 21 pratiques</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6" data-testid="redd-tracking-tabs">
          {[
            { id: 'form', label: 'Nouvelle fiche', icon: Save },
            { id: 'historique', label: 'Historique', icon: Users },
            { id: 'stats', label: 'Statistiques', icon: BarChart3 },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              data-testid={`tab-${t.id}`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'form' && (
          <div className="space-y-4">
            {/* Farmer Info */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Producteur</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nom du producteur *"
                  value={farmerName}
                  onChange={e => setFarmerName(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="farmer-name-input"
                />
                <input
                  type="text"
                  placeholder="Telephone"
                  value={farmerPhone}
                  onChange={e => setFarmerPhone(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="farmer-phone-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Superficie (ha)"
                  value={superficie}
                  onChange={e => setSuperficie(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="superficie-input"
                />
                <input
                  type="number"
                  placeholder="Arbres comptes"
                  value={arbres}
                  onChange={e => setArbres(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  data-testid="arbres-input"
                />
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-4 bg-gray-900 text-white">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{summary.verified}</p>
                  <p className="text-xs text-gray-400">Conformes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{summary.total - summary.verified}</p>
                  <p className="text-xs text-gray-400">Non conformes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-400">{summary.pct}%</p>
                  <p className="text-xs text-gray-400">Conformite</p>
                </div>
              </div>
            </Card>

            {/* Categories */}
            {REDD_CATEGORIES.map(cat => (
              <Card key={cat.id} className="p-4 overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-sm" style={{ color: cat.color }}>{cat.title}</h3>
                  <span className="ml-auto text-xs text-gray-400">
                    {cat.practices.filter(p => practiceStatuses[p.code] === 'conforme').length}/{cat.practices.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {cat.practices.map(p => {
                    const status = practiceStatuses[p.code];
                    return (
                      <button
                        key={p.code}
                        onClick={() => togglePractice(p.code)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                          status === 'conforme' ? 'bg-emerald-50 border border-emerald-200' :
                          status === 'non_conforme' ? 'bg-red-50 border border-red-200' :
                          'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                        }`}
                        data-testid={`practice-${p.code}`}
                      >
                        {status === 'conforme' ? (
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        ) : status === 'non_conforme' ? (
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        ) : (
                          <Minus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="flex-1">{p.name}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{p.code}</span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            ))}

            {/* Observations */}
            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Observations terrain</h3>
              <textarea
                placeholder="Decrivez vos observations..."
                value={observations}
                onChange={e => setObservations(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                data-testid="observations-textarea"
              />
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold text-gray-800 mb-2 text-sm">Recommandations</h3>
              <textarea
                placeholder="Recommandations pour le producteur..."
                value={recommandations}
                onChange={e => setRecommandations(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                data-testid="recommandations-textarea"
              />
            </Card>

            <Card className="p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Visite de suivi requise</span>
              <button
                onClick={() => setSuiviRequis(!suiviRequis)}
                className={`w-11 h-6 rounded-full transition-colors ${suiviRequis ? 'bg-emerald-600' : 'bg-gray-300'}`}
                data-testid="suivi-toggle"
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${suiviRequis ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </Card>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
              data-testid="submit-tracking-btn"
            >
              {loading ? 'Enregistrement...' : 'Enregistrer la fiche REDD+'}
            </Button>
          </div>
        )}

        {tab === 'historique' && (
          <div className="space-y-3">
            {visits.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-gray-500 text-sm">Aucune fiche de suivi enregistree</p>
              </Card>
            ) : (
              visits.map((v, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-800 text-sm">{v.farmer_name}</h4>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      v.redd_level === 'Excellence' ? 'bg-emerald-100 text-emerald-700' :
                      v.redd_level === 'Avance' ? 'bg-blue-100 text-blue-700' :
                      v.redd_level === 'Intermediaire' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {v.redd_level} ({v.redd_score}/10)
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>{new Date(v.date_visite).toLocaleDateString('fr-FR')}</span>
                    <span>{v.total_verified}/{v.total_checked} conformes</span>
                    <span>{v.conformity_pct}%</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'stats' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{stats.total_visits}</p>
                <p className="text-xs text-gray-500">Visites</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.avg_redd_score}</p>
                <p className="text-xs text-gray-500">Score moyen</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.avg_conformity}%</p>
                <p className="text-xs text-gray-500">Conformite</p>
              </Card>
            </div>
            {stats.level_distribution && Object.keys(stats.level_distribution).length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Distribution niveaux REDD+</h3>
                {Object.entries(stats.level_distribution).map(([level, count]) => (
                  <div key={level} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{level}</span>
                    <span className="text-sm font-semibold text-gray-800">{count}</span>
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}

        {tab === 'stats' && !stats && (
          <Card className="p-8 text-center">
            <p className="text-gray-500 text-sm">Chargement des statistiques...</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default REDDTrackingPage;
