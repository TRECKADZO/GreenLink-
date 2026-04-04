import React, { useState, useEffect } from 'react';
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
  { code: "ABEN", nom: "Abengourou", zone: "Est" },
  { code: "ABID", nom: "Abidjan", zone: "Sud" },
  { code: "ABOI", nom: "Aboisso", zone: "Sud-Est" },
  { code: "ADIA", nom: "Adiaké", zone: "Sud-Est" },
  { code: "ADZO", nom: "Adzopé", zone: "Sud-Est" },
  { code: "AGBO", nom: "Agboville", zone: "Sud" },
  { code: "AGNI", nom: "Agnibilékro", zone: "Est" },
  { code: "ALEP", nom: "Alépé", zone: "Sud-Est" },
  { code: "BANG", nom: "Bangolo", zone: "Ouest" },
  { code: "BEOU", nom: "Béoumi", zone: "Centre" },
  { code: "BIAN", nom: "Biankouma", zone: "Ouest" },
  { code: "BOCA", nom: "Bocanda", zone: "Centre" },
  { code: "BOND", nom: "Bondoukou", zone: "Nord-Est" },
  { code: "BONG", nom: "Bongouanou", zone: "Centre-Est" },
  { code: "BOUA", nom: "Bouaflé", zone: "Centre-Ouest" },
  { code: "BOUK", nom: "Bouaké", zone: "Centre" },
  { code: "DABA", nom: "Dabakala", zone: "Nord" },
  { code: "DABO", nom: "Dabou", zone: "Sud" },
  { code: "DANA", nom: "Danané", zone: "Ouest" },
  { code: "DAOU", nom: "Daoukro", zone: "Centre-Est" },
  { code: "DIMB", nom: "Dimbokro", zone: "Centre" },
  { code: "DALO", nom: "Daloa", zone: "Centre-Ouest" },
  { code: "DIVO", nom: "Divo", zone: "Sud" },
  { code: "DOUE", nom: "Duékoué", zone: "Ouest" },
  { code: "GAGN", nom: "Gagnoa", zone: "Centre-Ouest" },
  { code: "BASS", nom: "Grand-Bassam", zone: "Sud" },
  { code: "LAHO", nom: "Grand-Lahou", zone: "Sud" },
  { code: "GUIG", nom: "Guiglo", zone: "Ouest" },
  { code: "ISSI", nom: "Issia", zone: "Centre-Ouest" },
  { code: "JACQ", nom: "Jacqueville", zone: "Sud" },
  { code: "LAKO", nom: "Lakota", zone: "Sud-Ouest" },
  { code: "MAN", nom: "Man", zone: "Ouest" },
  { code: "MANK", nom: "Mankono", zone: "Nord" },
  { code: "MBAH", nom: "M'Bahiakro", zone: "Centre" },
  { code: "OUME", nom: "Oumé", zone: "Centre-Ouest" },
  { code: "SAKA", nom: "Sakassou", zone: "Centre" },
  { code: "SANP", nom: "San-Pédro", zone: "Sud-Ouest" },
  { code: "SASS", nom: "Sassandra", zone: "Sud-Ouest" },
  { code: "SEGU", nom: "Séguéla", zone: "Nord-Ouest" },
  { code: "SINF", nom: "Sinfra", zone: "Centre-Ouest" },
  { code: "SOUB", nom: "Soubré", zone: "Sud-Ouest" },
  { code: "TABO", nom: "Tabou", zone: "Sud-Ouest" },
  { code: "TAND", nom: "Tanda", zone: "Nord-Est" },
  { code: "TIAS", nom: "Tiassalé", zone: "Sud" },
  { code: "TOUL", nom: "Touleupleu", zone: "Ouest" },
  { code: "TIEB", nom: "Tiébissou", zone: "Centre" },
  { code: "TOUB", nom: "Touba", zone: "Nord-Ouest" },
  { code: "TOUM", nom: "Toumodi", zone: "Centre" },
  { code: "VAVO", nom: "Vavoua", zone: "Centre-Ouest" },
  { code: "YAMO", nom: "Yamoussoukro", zone: "Centre" },
  { code: "ZUEN", nom: "Zuénoula", zone: "Centre-Ouest" },
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
    // ICI Data Fields for producers
    genre: '',
    dateNaissance: '',
    niveauEducation: '',
    tailleMenage: '',
    nombreEnfants: '',
    village: ''
  });
  const [acceptConditions, setAcceptConditions] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referralValidation, setReferralValidation] = useState(null);
  const [validatingReferral, setValidatingReferral] = useState(false);

  // Get unique zones for filtering
  const zones = [...new Set(DEPARTEMENTS.map(d => d.zone))].sort();
  
  // Filter departments by selected zone
  const filteredDepartements = formData.zone 
    ? DEPARTEMENTS.filter(d => d.zone === formData.zone)
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
  useEffect(() => {
    if (formData.userType === 'cooperative' && formData.sponsorReferralCode) {
      const timer = setTimeout(() => {
        validateReferralCode(formData.sponsorReferralCode);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setReferralValidation(null);
    }
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

    setLoading(true);

    // Prepare ICI data for producers
    const iciData = formData.userType === 'producteur' ? {
      genre: formData.genre || null,
      date_naissance: formData.dateNaissance || null,
      niveau_education: formData.niveauEducation || null,
      taille_menage: formData.tailleMenage ? parseInt(formData.tailleMenage) : null,
      nombre_enfants: formData.nombreEnfants ? parseInt(formData.nombreEnfants) : null,
      village: formData.village || null
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
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                Zone et Département de production
              </Label>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Zone Filter */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Filtrer par zone</Label>
                  <select
                    className="w-full p-2 border rounded-md text-sm"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value, departement: '' })}
                  >
                    <option value="">Toutes les zones</option>
                    {zones.map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
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
                        zone: dept ? dept.zone : formData.zone
                      });
                    }}
                    required={showDepartmentSelection}
                  >
                    <option value="">-- Sélectionner --</option>
                    {filteredDepartements.map(dept => (
                      <option key={dept.code} value={dept.code}>
                        {dept.nom} ({dept.zone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Village Input */}
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Village/Localité</Label>
                <Input
                  type="text"
                  placeholder="Nom du village"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="text-sm"
                />
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
                  onChange={(e) => setFormData({ ...formData, coopName: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, sponsorReferralCode: e.target.value.toUpperCase() })}
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
                  💡 <strong>Service 100% gratuit</strong> - Le service est entierement gratuit pour votre cooperative. 
                  Vous pourrez parrainer d'autres cooperatives en partageant votre code apres inscription.
                </p>
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
                    onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, niveauEducation: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, tailleMenage: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, nombreEnfants: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
