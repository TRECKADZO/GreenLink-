import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../../components/ui/select';
import { toast } from 'sonner';
import {
  UserPlus, Phone, MapPin, Leaf, Lock, ArrowLeft,
  CheckCircle, Loader2, TreePine
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { GeoSelectCI } from '../../components/GeoSelectCI';
import { REGIONS_CI, getDepartements, getSousPrefectures } from '../../data/divisionsCI';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RegisterFarmerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [cooperatives, setCooperatives] = useState([]);
  const [form, setForm] = useState({
    nom_complet: '',
    telephone: '',
    cooperative_code: '',
    village: '',
    village_custom: '',
    hectares: '',
    pin: '',
    pin_confirm: '',
    email: '',
    region: '',
    department: '',
    sous_prefecture: '',
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Load cooperatives list
  React.useEffect(() => {
    const loadCoops = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/cooperatives`);
        if (res.ok) {
          const data = await res.json();
          setCooperatives(data.cooperatives || []);
        }
      } catch (e) { console.warn('[Register] Coop check:', e?.message); }
    };
    loadCoops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.nom_complet || form.nom_complet.length < 2) {
      toast.error('Nom complet requis (min 2 caracteres)');
      return;
    }
    if (!form.telephone || form.telephone.length < 8) {
      toast.error('Numero de telephone requis');
      return;
    }
    if (!form.village) {
      toast.error('Village requis');
      return;
    }
    if (!form.pin || form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      toast.error('Code PIN a 4 chiffres requis');
      return;
    }
    if (form.pin !== form.pin_confirm) {
      toast.error('Les codes PIN ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      const village = form.village;
      const res = await fetch(`${API_URL}/api/ussd/register-web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_complet: form.nom_complet,
          telephone: form.telephone,
          cooperative_code: form.cooperative_code,
          village: village,
          pin: form.pin,
          hectares: form.hectares ? parseFloat(form.hectares) : null,
          email: form.email || null,
          region: form.region || null,
          department: form.department || null,
          sous_prefecture: form.sous_prefecture || null,
        })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(true);
        setSuccessData(data);
        toast.success('Inscription reussie !');
      } else {
        toast.error(data.detail || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      toast.error('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-950 to-gray-950">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
          <Card className="bg-gray-900/80 border-emerald-500/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Inscription reussie !</h2>
              <p className="text-gray-400 mb-6">
                Bienvenue {successData?.nom}, votre compte GreenLink a ete cree.
              </p>
              <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left space-y-2">
                <p className="text-sm text-gray-300"><span className="text-gray-500">Nom:</span> {successData?.nom}</p>
                <p className="text-sm text-gray-300"><span className="text-gray-500">Telephone:</span> {successData?.telephone}</p>
                <p className="text-sm text-gray-300"><span className="text-gray-500">Village:</span> {successData?.village}</p>
                {successData?.code_planteur && (
                  <div className="mt-2 p-3 bg-emerald-900/40 border border-emerald-500/30 rounded-lg">
                    <p className="text-xs text-emerald-400 mb-1">Code Planteur (auto-genere)</p>
                    <p className="text-lg font-bold text-emerald-300 tracking-wider" data-testid="register-success-farmer-code">{successData.code_planteur}</p>
                    <p className="text-xs text-gray-400 mt-1">Conservez ce code, il est votre identifiant unique.</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-emerald-400 mb-6">
                Composez *144*99# pour estimer votre prime carbone directement depuis votre telephone.
              </p>
              <div className="flex gap-3">
                <Button 
                  data-testid="register-success-home-btn"
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Accueil
                </Button>
                <Button 
                  data-testid="register-success-estimate-btn"
                  onClick={() => navigate('/')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Leaf className="w-4 h-4 mr-2" />
                  Estimer ma prime
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-950 via-gray-950 to-gray-950">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-12">
        <button
          data-testid="register-back-btn"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>

        <Card className="bg-gray-900/80 border-emerald-500/30 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">Creer mon compte GreenLink</CardTitle>
                <p className="text-sm text-gray-400">Inscription planteur - rapide et gratuite</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom complet */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Nom complet *</Label>
                <Input
                  data-testid="register-name-input"
                  placeholder="Ex: Kouadio Jean"
                  value={form.nom_complet}
                  onChange={(e) => handleChange('nom_complet', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Telephone */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  <Phone className="w-3.5 h-3.5 inline mr-1" /> Numero de telephone *
                </Label>
                <Input
                  data-testid="register-phone-input"
                  placeholder="+225 07 XX XX XX XX"
                  value={form.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Code cooperative (optionnel) */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  <TreePine className="w-3.5 h-3.5 inline mr-1" /> Cooperative de rattachement
                </Label>
                <Select value={form.cooperative_code} onValueChange={(v) => handleChange('cooperative_code', v)}>
                  <SelectTrigger data-testid="register-coop-input" className="bg-gray-800/50 border-gray-700 text-white">
                    <SelectValue placeholder="Selectionnez la cooperative" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="none" className="text-gray-400 hover:bg-gray-700">Aucune / Independant</SelectItem>
                    {cooperatives.map(c => (
                      <SelectItem key={c.code} value={c.code} className="text-gray-200 hover:bg-gray-700">
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Le code planteur sera genere automatiquement.</p>
              </div>

              {/* Localisation géographique */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  <MapPin className="w-3.5 h-3.5 inline mr-1" /> Localisation *
                </Label>
                <div className="space-y-2">
                  <select
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full text-white"
                    value={form.region}
                    onChange={(e) => setForm(prev => ({ ...prev, region: e.target.value, department: '', sous_prefecture: '' }))}
                    data-testid="register-region-select"
                  >
                    <option value="">-- Region --</option>
                    {REGIONS_CI.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <select
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full text-white"
                    value={form.department}
                    onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value, sous_prefecture: '' }))}
                    disabled={!form.region}
                    data-testid="register-departement-select"
                  >
                    <option value="">-- Departement --</option>
                    {getDepartements(form.region).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select
                    className="bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full text-white"
                    value={form.sous_prefecture}
                    onChange={(e) => setForm(prev => ({ ...prev, sous_prefecture: e.target.value }))}
                    disabled={!form.department}
                    data-testid="register-sous-prefecture-select"
                  >
                    <option value="">-- Sous-prefecture --</option>
                    {getSousPrefectures(form.region, form.department).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Village */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  Village / Localite *
                </Label>
                <Input
                  data-testid="register-village-input"
                  placeholder="Nom du village"
                  value={form.village}
                  onChange={(e) => handleChange('village', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* Hectares */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">
                  <Leaf className="w-3.5 h-3.5 inline mr-1" /> Hectares de cacao (approximatif)
                </Label>
                <Input
                  data-testid="register-hectares-input"
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="Ex: 4.5"
                  value={form.hectares}
                  onChange={(e) => handleChange('hectares', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              {/* PIN */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-300">
                    <Lock className="w-3.5 h-3.5 inline mr-1" /> Code PIN *
                  </Label>
                  <Input
                    data-testid="register-pin-input"
                    type="password"
                    maxLength={4}
                    placeholder="4 chiffres"
                    value={form.pin}
                    onChange={(e) => handleChange('pin', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-300">Confirmer PIN *</Label>
                  <Input
                    data-testid="register-pin-confirm-input"
                    type="password"
                    maxLength={4}
                    placeholder="4 chiffres"
                    value={form.pin_confirm}
                    onChange={(e) => handleChange('pin_confirm', e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* Email (optionnel) */}
              <div className="space-y-1.5">
                <Label className="text-sm text-gray-300">Email (optionnel)</Label>
                <Input
                  data-testid="register-email-input"
                  type="email"
                  placeholder="email@exemple.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
                />
              </div>

              <Button
                data-testid="register-submit-btn"
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base mt-4"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Inscription en cours...</>
                ) : (
                  <><UserPlus className="w-4 h-4 mr-2" /> Valider mon inscription</>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center mt-3">
                En vous inscrivant, vous acceptez les conditions d'utilisation de GreenLink Agritech.
                Votre code PIN securise vos demandes de versement.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegisterFarmerPage;
