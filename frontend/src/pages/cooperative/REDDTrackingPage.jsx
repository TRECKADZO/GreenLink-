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
      { code: 'AGF1', name: "Arbres d'ombrage (30-50% couverture)", hint: "Verifiez si 30 a 50% de la parcelle est couverte par des arbres. Comptez les grands arbres visibles au-dessus des cacaoyers." },
      { code: 'AGF2', name: 'Systeme agroforestier multi-strates', hint: "Y a-t-il plusieurs niveaux de vegetation ? Ex: herbes au sol, cacaoyers au milieu, grands arbres en haut." },
      { code: 'AGF3', name: 'Enrichissement parcelles', hint: "Le producteur a-t-il plante de nouveaux arbres fruitiers ou forestiers dans sa parcelle recemment ?" },
      { code: 'AGF4', name: 'Transition plein soleil vers ombrage', hint: "Si la parcelle etait en plein soleil, le producteur a-t-il commence a planter des arbres d'ombrage ?" },
    ],
  },
  {
    id: 'zero_deforestation',
    title: 'Zero-Deforestation',
    color: '#2563eb',
    bgColor: '#dbeafe',
    practices: [
      { code: 'ZD1', name: 'Intensification durable', hint: "Le producteur produit-il plus sur la meme surface sans defricher de nouvelles forets ? Ex: taille, engrais bio." },
      { code: 'ZD2', name: 'Engagement zero deforestation', hint: "Le producteur s'est-il engage a ne plus couper de foret pour agrandir ses parcelles ?" },
      { code: 'ZD3', name: 'Restauration parcelles degradees', hint: "Y a-t-il des parcelles abandonnees que le producteur est en train de replanter ou restaurer ?" },
      { code: 'ZD4', name: 'Protection forets classees', hint: "Les parcelles sont-elles eloignees des forets classees ? Le producteur respecte-t-il les limites protegees ?" },
    ],
  },
  {
    id: 'gestion_sols',
    title: 'Gestion Sols Bas-Carbone',
    color: '#d97706',
    bgColor: '#fef3c7',
    practices: [
      { code: 'SOL1', name: 'Paillage et compostage', hint: "Y a-t-il des tas de compost ou du paillage (feuilles mortes, cosses de cacao) au pied des arbres ?" },
      { code: 'SOL2', name: 'Biochar', hint: "Le producteur utilise-t-il du charbon vegetal melange a la terre pour enrichir le sol ?" },
      { code: 'SOL3', name: 'Couverture vegetale', hint: "Le sol est-il couvert par des plantes basses entre les arbres (pas de sol nu) ? Ex: legumineuses, herbes." },
      { code: 'SOL4', name: 'Gestion integree ravageurs', hint: "Le producteur lutte-t-il contre les maladies sans produits chimiques dangereux ? Ex: piegeage, taille sanitaire." },
      { code: 'SOL5', name: 'Taille et elagage sanitaire', hint: "Les cacaoyers sont-ils bien tailles ? Les branches mortes ou malades sont-elles coupees ?" },
    ],
  },
  {
    id: 'restauration',
    title: 'Restauration et Conservation',
    color: '#0d9488',
    bgColor: '#ccfbf1',
    practices: [
      { code: 'REST1', name: 'Reboisement et regeneration assistee', hint: "Le producteur a-t-il plante de nouveaux arbres forestiers ou aide des jeunes pousses a grandir ?" },
      { code: 'REST2', name: 'Plantations bois-energie', hint: "Y a-t-il des arbres plantes pour le bois de chauffage afin d'eviter de couper la foret ?" },
      { code: 'REST3', name: 'Protection zones ripariennes', hint: "Les bords de cours d'eau sont-ils proteges avec de la vegetation ? Pas de culture au bord de l'eau." },
      { code: 'REST4', name: 'Valorisation residus agricoles', hint: "Les dechets de recolte sont-ils reutilises comme compost au lieu d'etre brules ?" },
    ],
  },
  {
    id: 'tracabilite',
    title: 'Tracabilite et Conformite',
    color: '#7c3aed',
    bgColor: '#ede9fe',
    practices: [
      { code: 'TRAC1', name: 'Enregistrement GPS parcelles', hint: "Les parcelles ont-elles ete cartographiees avec un GPS ? Les polygones sont-ils enregistres ?" },
      { code: 'TRAC2', name: 'Safeguards sociaux', hint: "Pas de travail d'enfants ni de travail force. Les travailleurs ont-ils des conditions correctes ?" },
      { code: 'TRAC3', name: 'Monitoring MRV', hint: "Le producteur participe-t-il au suivi regulier (Mesure, Reporting, Verification) de ses pratiques ?" },
      { code: 'TRAC4', name: 'Certification Cacao Durable', hint: "Le producteur est-il certifie ou en cours de certification pour la norme cacao durable (Bon/Tres Bon/Excellent) ?" },
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
    setPracticeStatuses(prev => ({ ...prev, [code]: prev[code] === 'conforme' ? 'non_evalue' : 'conforme' }));
  };

  const setStatus = (code, status) => {
    setPracticeStatuses(prev => {
      if (prev[code] === status) return { ...prev, [code]: undefined };
      return { ...prev, [code]: status };
    });
  };

  const computeSummary = () => {
    let conforme = 0, partiel = 0, nonConforme = 0;
    Object.values(practiceStatuses).forEach(s => {
      if (s === 'conforme') conforme++;
      else if (s === 'partiellement') partiel++;
      else if (s === 'non_conforme') nonConforme++;
    });
    const total = conforme + partiel + nonConforme;
    return { conforme, partiel, nonConforme, total, pct: total > 0 ? Math.round((conforme + partiel * 0.5) / total * 100) : 0 };
  };

  const handleSubmit = async () => {
    if (!farmerName.trim()) {
      alert('Veuillez entrer le nom du producteur');
      return;
    }
    const evaluated = Object.entries(practiceStatuses).filter(([_, s]) => s && s !== 'non_applicable');
    if (evaluated.length === 0) {
      alert('Veuillez evaluer au moins une pratique');
      return;
    }

    setLoading(true);
    const practices_verified = [];
    for (const cat of REDD_CATEGORIES) {
      for (const p of cat.practices) {
        const status = practiceStatuses[p.code];
        if (status && status !== 'non_applicable') {
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
        alert(`Fiche enregistree ! Score environnemental: ${data.redd_score}/10 (${data.redd_level})`);
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Fiche de suivi environnemental</h1>
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

            {/* Legend */}
            <Card className="p-3 bg-gray-50 border-gray-200">
              <div className="flex flex-wrap gap-3 justify-center text-xs">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Conforme</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500" /> Partiellement</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /> Non conforme</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300" /> Non applicable</span>
              </div>
            </Card>

            {/* Summary */}
            <Card className="p-4 bg-gray-900 text-white">
              <div className="flex justify-around text-center">
                <div>
                  <p className="text-2xl font-bold text-emerald-400">{summary.conforme}</p>
                  <p className="text-xs text-gray-400">Conformes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-400">{summary.partiel}</p>
                  <p className="text-xs text-gray-400">Partiels</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{summary.nonConforme}</p>
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
                <div className="space-y-2">
                  {cat.practices.map(p => {
                    const status = practiceStatuses[p.code];
                    return (
                      <div
                        key={p.code}
                        className={`px-3 py-3 rounded-lg border transition-all text-sm ${
                          status === 'conforme' ? 'bg-emerald-50 border-emerald-200' :
                          status === 'partiellement' ? 'bg-amber-50 border-amber-200' :
                          status === 'non_conforme' ? 'bg-red-50 border-red-200' :
                          status === 'non_applicable' ? 'bg-gray-100 border-gray-200 opacity-60' :
                          'bg-white border-gray-100'
                        }`}
                        data-testid={`practice-${p.code}`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-[10px] text-gray-400 font-mono mt-0.5 flex-shrink-0">{p.code}</span>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium block text-gray-800">{p.name}</span>
                            {p.hint && <span className="text-[11px] text-gray-400 block mt-0.5 leading-tight">{p.hint}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-7">
                          <button
                            onClick={() => setStatus(p.code, 'conforme')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                              status === 'conforme'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                          >
                            Conforme
                          </button>
                          <button
                            onClick={() => setStatus(p.code, 'partiellement')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                              status === 'partiellement'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-amber-100 hover:text-amber-700'
                            }`}
                          >
                            Partiel
                          </button>
                          <button
                            onClick={() => setStatus(p.code, 'non_conforme')}
                            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all ${
                              status === 'non_conforme'
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'
                            }`}
                          >
                            Non conforme
                          </button>
                          <button
                            onClick={() => setStatus(p.code, 'non_applicable')}
                            className={`py-1.5 px-2 rounded-md text-xs font-medium transition-all ${
                              status === 'non_applicable'
                                ? 'bg-gray-500 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title="Non applicable"
                          >
                            N/A
                          </button>
                        </div>
                      </div>
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
              {loading ? 'Enregistrement...' : 'Enregistrer la fiche environnementale'}
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
                    <span>{v.total_conforme || v.total_verified || 0}/{v.total_checked} conformes</span>
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
                <h3 className="font-semibold text-sm text-gray-800 mb-3">Distribution niveaux durabilite</h3>
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
