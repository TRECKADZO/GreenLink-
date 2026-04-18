import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Sprout, Phone, Lock, User, Mail, FileText, Shield, MapPin, Eye, EyeOff, Users, Baby, Calendar, GraduationCap } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const userTypes = [
  { value: 'producteur', label: 'Producteur', icon: '🌱', desc: 'Je vends mes récoltes' },
  { value: 'acheteur', label: 'Acheteur', icon: '🛒', desc: 'J\'achète des produits agricoles' },
  { value: 'entreprise_rse', label: 'Entreprise RSE', icon: '🏢', desc: 'Je cherche des crédits carbone' },
  { value: 'fournisseur', label: 'Fournisseur', icon: '📦', desc: 'Je fournis des intrants agricoles' },
  { value: 'cooperative', label: 'Coopérative', icon: '🤝', desc: 'Je gère une coopérative agricole' }
];

// Liste des 51 départements de Côte d'Ivoire
const DEPARTEMENTS = [
  { code: "ABEN", nom: "Abengourou", region: "Indenie-Djuablin" },
  { code: "ABID", nom: "Abidjan", region: "District d'Abidjan" },
  { code: "ABOI", nom: "Aboisso", region: "Sud-Comoe" },
  { code: "ADIA", nom: "Adiaké", region: "Sud-Comoe" },
  { code: "ADZO", nom: "Adzopé", region: "La Me" },
  { code: "AGBO", nom: "Agboville", region: "Agneby-Tiassa" },
  { code: "AGNI", nom: "Agnibilékro", region: "Indenie-Djuablin" },
  { code: "ALEP", nom: "Alépé", region: "La Me" },
  { code: "BANG", nom: "Bangolo", region: "Guemon" },
  { code: "BEOU", nom: "Béoumi", region: "Gbeke" },
  { code: "BIAN", nom: "Biankouma", region: "Tonkpi" },
  { code: "BOCA", nom: "Bocanda", region: "N'Zi" },
  { code: "BOND", nom: "Bondoukou", region: "Gontougo" },
  { code: "BONG", nom: "Bongouanou", region: "Moronou" },
  { code: "BOUA", nom: "Bouaflé", region: "Marahoue" },
  { code: "BOUK", nom: "Bouaké", region: "Gbeke" },
  { code: "DABA", nom: "Dabakala", region: "Hambol" },
  { code: "DABO", nom: "Dabou", region: "Grands-Ponts" },
  { code: "DANA", nom: "Danané", region: "Tonkpi" },
  { code: "DAOU", nom: "Daoukro", region: "Iffou" },
  { code: "DIMB", nom: "Dimbokro", region: "N'Zi" },
  { code: "DALO", nom: "Daloa", region: "Haut-Sassandra" },
  { code: "DIVO", nom: "Divo", region: "Loh-Djiboua" },
  { code: "DOUE", nom: "Duékoué", region: "Guemon" },
  { code: "GAGN", nom: "Gagnoa", region: "Goh" },
  { code: "BASS", nom: "Grand-Bassam", region: "Sud-Comoe" },
  { code: "LAHO", nom: "Grand-Lahou", region: "Grands-Ponts" },
  { code: "GUIG", nom: "Guiglo", region: "Cavally" },
  { code: "ISSI", nom: "Issia", region: "Haut-Sassandra" },
  { code: "JACQ", nom: "Jacqueville", region: "Grands-Ponts" },
  { code: "LAKO", nom: "Lakota", region: "Loh-Djiboua" },
  { code: "MAN", nom: "Man", region: "Tonkpi" },
  { code: "MANK", nom: "Mankono", region: "Bere" },
  { code: "MBAH", nom: "M'Bahiakro", region: "N'Zi" },
  { code: "OUME", nom: "Oumé", region: "Goh" },
  { code: "SAKA", nom: "Sakassou", region: "Gbeke" },
  { code: "SANP", nom: "San-Pédro", region: "San-Pedro" },
  { code: "SASS", nom: "Sassandra", region: "Gbokle" },
  { code: "SEGU", nom: "Séguéla", region: "Worodougou" },
  { code: "SINF", nom: "Sinfra", region: "Marahoue" },
  { code: "SOUB", nom: "Soubré", region: "Nawa" },
  { code: "TABO", nom: "Tabou", region: "San-Pedro" },
  { code: "TAND", nom: "Tanda", region: "Gontougo" },
  { code: "TIAS", nom: "Tiassalé", region: "Agneby-Tiassa" },
  { code: "TOUL", nom: "Touleupleu", region: "Cavally" },
  { code: "TIEB", nom: "Tiébissou", region: "Belier" },
  { code: "TOUB", nom: "Touba", region: "Bafing" },
  { code: "TOUM", nom: "Toumodi", region: "Belier" },
  { code: "VAVO", nom: "Vavoua", region: "Haut-Sassandra" },
  { code: "YAMO", nom: "Yamoussoukro", region: "District de Yamoussoukro" },
  { code: "ZUEN", nom: "Zuénoula", region: "Marahoue" },
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [contactMethod, setContactMethod] = useState('phone');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
    fullName: '',
    userType: '',
    departement: '',
    zone: '',
    // Cooperative fields
    coopName: '',
    sponsorReferralCode: '', // Code de parrainage (optionnel)
    coopSigle: '',
    coopSiege: '',
    coopNbSections: '',
    coopNbMagasins: '',
    coopNbCacaoyeres: '',
    coopNiveauCertification: 'Bronze',
    coopCampagne: '2024/2025',
    // ICI Data Fields for producers
    genre: '',
    dateNaissance: '',
    niveauEducation: '',
    tailleMenage: '',
    nombreEnfants: '',
    village: '',
    campement: ''
  });
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralValidation, setReferralValidation] = useState(null);
  const [validatingReferral, setValidatingReferral] = useState(false);

  // Stable field updater to prevent re-renders losing keyboard focus on mobile
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Effet pour sélectionner Email par défaut pour les coopératives
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (formData.userType === 'cooperative') {
      setContactMethod('email');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.userType]);

  // Get unique regions for filtering
  const regions = [...new Set(DEPARTEMENTS.map(d => d.region))].sort();
  
  // Filter departments by selected region
  const filteredDepartements = formData.zone 
    ? DEPARTEMENTS.filter(d => d.region === formData.zone)
    : DEPARTEMENTS;

  // Validate referral code for cooperatives
  const validateReferralCode = async (code) => {
    if (!code || code.length < 5) {
      setReferralValidation(null);
      return;
    }
    
    setValidatingReferral(true);
    try {
      const response = await axios.post(`${API_URL}/api/cooperative-referral/validate`, {
        referral_code: code.toUpperCase()
      });
      setReferralValidation(response.data);
    } catch (error) {
      setReferralValidation({ valid: false, message: 'Erreur de validation du code' });
    } finally {
      setValidatingReferral(false);
    }
  };

  // Debounce referral code validation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (formData.userType === 'cooperative' && formData.sponsorReferralCode) {
      const timer = setTimeout(() => {
        validateReferralCode(formData.sponsorReferralCode);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setReferralValidation(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.sponsorReferralCode, formData.userType]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptConditions || !acceptPrivacy) {
      toast({
        title: 'Acceptation requise',
        description: 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité',
        variant: 'destructive'
      });
      return;
    }

    if (formData.userType === 'cooperative' && !formData.coopName.trim()) {
      toast({
        title: 'Nom de la cooperative obligatoire',
        description: 'Veuillez saisir le nom de votre cooperative avant de continuer',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    // Prepare ICI data for producers
    const iciData = formData.userType === 'producteur' ? {
      genre: formData.genre || null,
      date_naissance: formData.dateNaissance || null,
      niveau_education: formData.niveauEducation || null,
      taille_menage: formData.tailleMenage ? parseInt(formData.tailleMenage) : null,
      nombre_enfants: formData.nombreEnfants ? parseInt(formData.nombreEnfants) : null,
      village: formData.village || null,
      campement: formData.campement || null
    } : {};

    const result = await register(
      formData.identifier,
      formData.password,
      formData.fullName,
      formData.userType,
      contactMethod === 'email',
      { 
        acceptedConditions: true, 
        acceptedPrivacy: true, 
        acceptedAt: new Date().toISOString(),
        departement: formData.departement,
        zone: formData.zone,
        coop_name: formData.coopName || null,
        sponsor_referral_code: formData.sponsorReferralCode?.toUpperCase() || null,
        coop_sigle: formData.coopSigle || null,
        coop_siege: formData.coopSiege || null,
        coop_nb_sections: parseInt(formData.coopNbSections) || 0,
        coop_nb_magasins: parseInt(formData.coopNbMagasins) || 0,
        coop_nb_cacaoyeres: parseInt(formData.coopNbCacaoyeres) || 0,
        coop_niveau_certification: formData.coopNiveauCertification || 'Bronze',
        coop_campagne: formData.coopCampagne || '2024/2025',
        ...iciData
      }
    );

    setLoading(false);

    if (result.success) {
      // Store registration result for cooperative code display
      if (formData.userType === 'cooperative' && result.user?.coop_code) {
        setRegistrationResult({
          coopCode: result.user.coop_code,
          coopName: result.user.coop_name || formData.coopName,
        });
      } else {
        toast({
          title: 'Compte cree avec succes!',
          description: 'Bienvenue sur GreenLink'
        });
        navigate('/profile');
      }
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  // Show department selection for producteur and cooperative
  const showDepartmentSelection = ['producteur', 'cooperative'].includes(formData.userType);

  const canSubmit = formData.userType && formData.fullName && formData.identifier && formData.password && acceptConditions && acceptPrivacy;

  // Cooperative registration success page
  if (registrationResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#2d5a4d]/10 flex items-center justify-center">
            <Shield className="w-10 h-10 text-[#2d5a4d]" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cooperative creee !</h2>
          <p className="text-gray-600 mb-6">
            Bienvenue, {registrationResult.coopName}
          </p>
          <div className="bg-[#2d5a4d]/5 border-2 border-[#2d5a4d]/20 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 mb-1">Votre code cooperative (auto-genere)</p>
            <p className="text-2xl font-bold text-[#2d5a4d] tracking-widest" data-testid="register-coop-code">{registrationResult.coopCode}</p>
            <p className="text-xs text-gray-500 mt-2">
              Communiquez ce code a vos agents terrain pour rattacher les planteurs.
            </p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => navigate('/cooperative/dashboard')}
              className="flex-1"
              data-testid="register-coop-dashboard-btn"
            >
              Mon tableau de bord
            </Button>
            <Button 
              onClick={() => navigate('/profile')}
              className="flex-1 bg-[#2d5a4d] hover:bg-[#235043] text-white"
              data-testid="register-coop-profile-btn"
            >
              Completer mon profil
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-7 h-7 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
            <p className="text-sm text-gray-600">Rejoignez la révolution agricole</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type Selection */}
          <div>
            <Label className="mb-3 block">Type de compte *</Label>
            <div className="grid grid-cols-2 gap-3">
              {userTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setFormData({ ...formData, userType: type.value })}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.userType === type.value
                      ? 'border-[#2d5a4d] bg-[#2d5a4d]/5'
                      : 'border-gray-200 hover:border-[#2d5a4d]/50'
                  }`}
                  data-testid={`user-type-${type.value}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-semibold text-gray-900">{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{type.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Nom complet *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="Jean Kouadio"
                value={formData.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                className="pl-10"
                required
                data-testid="fullname-input"
              />
            </div>
          </div>

          {/* Department Selection - Only for Producteur and Cooperative */}
          {showDepartmentSelection && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Region et Departement de production
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Region Filter */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Region</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value, departement: '' })}
                  >
                    <option value="">Toutes les regions</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                </div>
                
                {/* Department Selection */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Département *</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.departement}
                    onChange={(e) => {
                      const dept = DEPARTEMENTS.find(d => d.code === e.target.value);
                      setFormData({ 
                        ...formData, 
                        departement: e.target.value,
                        zone: dept ? dept.region : formData.zone
                      });
                    }}
                    required={showDepartmentSelection}
                  >
                    <option value="">-- Sélectionner --</option>
                    {filteredDepartements.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.nom} ({dept.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Village/Section Input */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Village / Section</Label>
                  <Input
                    type="text"
                    placeholder="Nom du village ou section"
                    value={formData.village}
                    onChange={(e) => updateField('village', e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Campement</Label>
                  <Input
                    type="text"
                    placeholder="Nom du campement"
                    value={formData.campement}
                    onChange={(e) => updateField('campement', e.target.value)}
                    className="text-sm"
                    data-testid="campement-input"
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                51 départements producteurs de Côte d'Ivoire disponibles
              </p>
            </div>
          )}

          {/* Cooperative Name - Only for cooperatives */}
          {formData.userType === 'cooperative' && (
            <div className="space-y-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                Informations de la cooperative
              </h3>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Nom de la cooperative *</Label>
                <Input
                  type="text"
                  placeholder="Ex: Cooperative des planteurs de Daloa"
                  value={formData.coopName}
                  onChange={(e) => updateField('coopName', e.target.value)}
                  className="text-sm"
                  required
                  data-testid="coop-name-input"
                />
              </div>
              
              {/* Code de parrainage optionnel */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <Label className="text-xs text-emerald-700 mb-1 block font-medium">
                  Avez-vous un code de parrainage ? (facultatif)
                </Label>
                <Input
                  type="text"
                  placeholder="Ex: GL-COOP-ABJ-1234"
                  value={formData.sponsorReferralCode}
                  onChange={(e) => updateField('sponsorReferralCode', e.target.value.toUpperCase())}
                  className="text-sm font-mono uppercase"
                  data-testid="sponsor-code-input"
                />
                {validatingReferral && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Validation en cours...
                  </p>
                )}
                {referralValidation && (
                  <p className={`text-xs mt-1 ${referralValidation.valid ? 'text-emerald-600' : 'text-red-500'}`}>
                    {referralValidation.valid ? '✓ ' : '✗ '}{referralValidation.message}
                    {referralValidation.sponsor_name && (
                      <span className="font-medium"> ({referralValidation.sponsor_name})</span>
                    )}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Si une autre cooperative vous a invite, entrez son code ici. Sinon, laissez vide.
                </p>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Votre code cooperative et votre code de parrainage unique seront generes automatiquement.
              </p>
              
              {/* Message service gratuit */}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Service 100% gratuit</strong> - Le service est entierement gratuit pour votre cooperative. 
                  Vous pourrez parrainer d'autres cooperatives en partageant votre code apres inscription.
                </p>
              </div>

              {/* ARS 1000 Cooperative Fields */}
              <div className="mt-4 p-3 bg-white rounded-lg border border-amber-200 space-y-3">
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Informations ARS 1000</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Sigle</Label>
                    <Input type="text" placeholder="Ex: COOPAD" value={formData.coopSigle} onChange={(e) => updateField('coopSigle', e.target.value)} className="text-sm" data-testid="coop-sigle-input" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Siege</Label>
                    <Input type="text" placeholder="Ville / Localite" value={formData.coopSiege} onChange={(e) => updateField('coopSiege', e.target.value)} className="text-sm" data-testid="coop-siege-input" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Nb sections</Label>
                    <Input type="number" placeholder="0" value={formData.coopNbSections} onChange={(e) => updateField('coopNbSections', e.target.value)} className="text-sm" data-testid="coop-nb-sections" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Nb magasins stockage</Label>
                    <Input type="number" placeholder="0" value={formData.coopNbMagasins} onChange={(e) => updateField('coopNbMagasins', e.target.value)} className="text-sm" data-testid="coop-nb-magasins" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Nb cacaoyeres</Label>
                    <Input type="number" placeholder="0" value={formData.coopNbCacaoyeres} onChange={(e) => updateField('coopNbCacaoyeres', e.target.value)} className="text-sm" data-testid="coop-nb-cacaoyeres" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Niveau certification</Label>
                    <select value={formData.coopNiveauCertification} onChange={(e) => updateField('coopNiveauCertification', e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md" data-testid="coop-niveau-cert">
                      <option value="Bronze">Bronze</option>
                      <option value="Argent">Argent</option>
                      <option value="Or">Or</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Campagne</Label>
                    <Input type="text" value={formData.coopCampagne} onChange={(e) => updateField('coopCampagne', e.target.value)} className="text-sm" data-testid="coop-campagne" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ICI Data Collection - Only for Producteurs */}
          {formData.userType === 'producteur' && (
            <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Informations du ménage (optionnel)
                <span className="text-xs font-normal text-gray-500 ml-2">Pour le suivi ICI</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Genre */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Genre
                  </Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.genre}
                    onChange={(e) => updateField('genre', e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="homme">Homme</option>
                    <option value="femme">Femme</option>
                  </select>
                </div>

                {/* Date de naissance */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Année de naissance
                  </Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.dateNaissance}
                    onChange={(e) => updateField('dateNaissance', e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {Array.from({ length: 70 }, (_, i) => 2006 - i).map(year => (
                      <option key={year} value={`${year}-01-01`}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Niveau d'éducation */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" />
                    Niveau d'éducation
                  </Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.niveauEducation}
                    onChange={(e) => updateField('niveauEducation', e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    <option value="aucun">Aucun</option>
                    <option value="primaire">Primaire</option>
                    <option value="secondaire">Secondaire</option>
                    <option value="superieur">Supérieur</option>
                  </select>
                </div>

                {/* Taille du ménage */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Taille du ménage
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="Ex: 5"
                    value={formData.tailleMenage}
                    onChange={(e) => updateField('tailleMenage', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Nombre d'enfants */}
                <div>
                  <Label className="text-xs text-gray-600 mb-1 block flex items-center gap-1">
                    <Baby className="w-3 h-3" />
                    Nombre d'enfants (&lt;18 ans)
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="15"
                    placeholder="Ex: 3"
                    value={formData.nombreEnfants}
                    onChange={(e) => updateField('nombreEnfants', e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-green-700 bg-green-100 p-2 rounded">
                Ces informations permettent de mieux vous accompagner et de suivre les indicateurs de développement durable (ODD) dans le secteur cacao.
              </p>
            </div>
          )}

          {/* Contact Method Toggle */}
          <div>
            <Label className="mb-3 block">Méthode de contact *</Label>
            <div className="flex gap-2 mb-3">
              <Button
                type="button"
                variant={contactMethod === 'phone' ? 'default' : 'outline'}
                className={contactMethod === 'phone' ? 'bg-[#2d5a4d] hover:bg-[#1a4038]' : ''}
                onClick={() => setContactMethod('phone')}
              >
                <Phone className="w-4 h-4 mr-2" />
                Téléphone
              </Button>
              <Button
                type="button"
                variant={contactMethod === 'email' ? 'default' : 'outline'}
                className={contactMethod === 'email' ? 'bg-[#2d5a4d] hover:bg-[#1a4038]' : ''}
                onClick={() => setContactMethod('email')}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </div>

            {/* Phone or Email Input */}
            {contactMethod === 'phone' ? (
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="+225 0707070707"
                  value={formData.identifier}
                  onChange={(e) => updateField('identifier', e.target.value)}
                  className="pl-10"
                  required
                  data-testid="phone-input"
                />
                <p className="text-xs text-gray-500 mt-1">Format: +225XXXXXXXXXX ou XXXXXXXXXX</p>
              </div>
            ) : (
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  type="email"
                  placeholder="exemple@email.com"
                  value={formData.identifier}
                  onChange={(e) => updateField('identifier', e.target.value)}
                  className="pl-10"
                  required
                  data-testid="email-input"
                />
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Mot de passe *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 6 caractères"
                value={formData.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="pl-10 pr-10"
                required
                minLength={6}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Terms & Privacy Acceptance */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2d5a4d]" />
              Acceptation des conditions
            </h3>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="conditions"
                checked={acceptConditions}
                onCheckedChange={setAcceptConditions}
                data-testid="accept-conditions"
              />
              <label htmlFor="conditions" className="text-sm text-gray-700 cursor-pointer">
                J'accepte les{' '}
                <Link 
                  to="/conditions" 
                  target="_blank"
                  className="text-[#2d5a4d] font-semibold hover:underline"
                >
                  Conditions Générales d'Utilisation
                </Link>
                {' '}*
              </label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="privacy"
                checked={acceptPrivacy}
                onCheckedChange={setAcceptPrivacy}
                data-testid="accept-privacy"
              />
              <label htmlFor="privacy" className="text-sm text-gray-700 cursor-pointer">
                J'accepte la{' '}
                <Link 
                  to="/confidentialite" 
                  target="_blank"
                  className="text-[#2d5a4d] font-semibold hover:underline"
                >
                  Politique de Confidentialité
                </Link>
                {' '}et je consens au traitement de mes données personnelles *
              </label>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white py-6 text-lg"
            disabled={loading || !canSubmit}
            data-testid="submit-register"
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </Button>

          {!canSubmit && formData.userType && (
            <p className="text-xs text-center text-amber-600">
              Veuillez accepter les conditions pour continuer
            </p>
          )}
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Déjà un compte?{' '}
            <Link to="/login" className="text-[#2d5a4d] font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
