import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Upload, Leaf, MapPin, Award, 
  DollarSign, Package, Calendar, Info, Check,
  Globe, Shield, Truck, FileText, Beaker, Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '../../components/ui/select';
import { Checkbox } from '../../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';

const CROP_IMAGES = {
  cacao: 'https://images.unsplash.com/photo-1573710661345-610f790e1218?w=400&q=80',
  cafe: 'https://images.unsplash.com/photo-1652211940752-fb61223427f6?w=400&q=80',
  anacarde: 'https://images.unsplash.com/photo-1594900689460-fdad3599342c?w=400&q=80'
};

const CERTIFICATIONS = [
  { id: 'fairtrade', name: 'Fairtrade International', icon: '🤝', standard: 'FLO' },
  { id: 'rainforest', name: 'Rainforest Alliance', icon: '🌿', standard: 'RA' },
  { id: 'utz', name: 'UTZ Certified', icon: '✓', standard: 'UTZ' },
  { id: 'bio', name: 'Agriculture Biologique', icon: '🌱', standard: 'AB/EU Organic' },
  { id: 'organic_usda', name: 'USDA Organic', icon: '🇺🇸', standard: 'NOP' },
  { id: 'eudr', name: 'EUDR Compliant', icon: '🇪🇺', standard: 'EU Regulation' },
  { id: 'ici', name: 'ICI Cocoa (Child Labor Free)', icon: '👧', standard: 'ICI' },
];

const GRADES = {
  cacao: [
    { id: 'grade_1', name: 'Grade I (Premium Export)', desc: 'ICCO: Max 3% moisissures, 3% ardoisées' },
    { id: 'grade_2', name: 'Grade II (Standard Export)', desc: 'ICCO: Max 4% moisissures, 8% ardoisées' },
    { id: 'sub_grade', name: 'Sub-Grade', desc: 'Qualité inférieure aux standards export' },
  ],
  cafe: [
    { id: 'specialty', name: 'Specialty Grade (SCA 80+)', desc: 'Score SCA ≥80, 0 défauts primaires' },
    { id: 'premium', name: 'Premium Grade (SCA 75-79)', desc: 'Score SCA 75-79, qualité supérieure' },
    { id: 'exchange', name: 'Exchange Grade', desc: 'Qualité ICE standard' },
    { id: 'commercial', name: 'Commercial Grade', desc: 'Qualité commerciale standard' },
  ],
  anacarde: [
    { id: 'w180', name: 'W180 (Premium)', desc: 'AFI: 170-180 amandes/lb, blanc entier' },
    { id: 'w210', name: 'W210', desc: 'AFI: 200-210 amandes/lb' },
    { id: 'w240', name: 'W240 (Standard)', desc: 'AFI: 220-240 amandes/lb' },
    { id: 'w320', name: 'W320', desc: 'AFI: 300-320 amandes/lb' },
    { id: 'w450', name: 'W450', desc: 'AFI: 400-450 amandes/lb' },
    { id: 'sw', name: 'SW (Scorched Wholes)', desc: 'Légèrement brûlés' },
    { id: 'lbw', name: 'LBW (Light Brokens)', desc: 'Morceaux légers' },
  ]
};

const VARIETIES = {
  cacao: ['Forastero', 'Criollo', 'Trinitario', 'Nacional', 'CCN-51'],
  cafe: ['Arabica', 'Robusta', 'Liberica', 'Typica', 'Bourbon', 'Caturra', 'Catuai'],
  anacarde: ['Jumbo', 'Standard']
};

const DEPARTMENTS = [
  'Abidjan', 'Abengourou', 'Aboisso', 'Adzopé', 'Agboville', 'Agnibilékrou',
  'Bongouanou', 'Bouaflé', 'Bouaké', 'Daloa', 'Dimbokro', 'Divo', 'Duékoué',
  'Gagnoa', 'Grand-Bassam', 'Guiglo', 'Issia', 'Lakota', 'Man', 'Méagui',
  'Oumé', 'San-Pédro', 'Sassandra', 'Séguéla', 'Soubré', 'Tabou', 
  'Tiassalé', 'Vavoua', 'Yamoussoukro'
];

const INCOTERMS = [
  { id: 'EXW', name: 'EXW - Ex Works', desc: 'Départ usine' },
  { id: 'FCA', name: 'FCA - Free Carrier', desc: 'Franco transporteur' },
  { id: 'FOB', name: 'FOB - Free On Board', desc: 'Franco à bord (port)' },
  { id: 'CIF', name: 'CIF - Cost Insurance Freight', desc: 'Coût, assurance, fret' },
  { id: 'DAP', name: 'DAP - Delivered at Place', desc: 'Rendu au lieu de destination' },
];

const CreateHarvestListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [form, setForm] = useState({
    // Basic Info
    crop_type: '',
    variety: '',
    grade: '',
    
    // Quantity & Price
    quantity_kg: '',
    price_per_kg: '',
    min_order_kg: '100',
    currency: 'XOF',
    incoterm: '',
    
    // Quality - Cacao (ICCO)
    bean_count: '',
    moisture_rate: '',
    defect_rate: '',
    fat_content: '',
    fermentation_days: '',
    drying_method: '',
    
    // Quality - Café (SCA/ICO)
    sca_score: '',
    screen_size: '',
    processing_method: '',
    altitude: '',
    
    // Quality - Anacarde (AFI)
    kor: '',
    nut_count: '',
    
    // Certifications
    certifications: [],
    
    // Traceability
    origin_region: '',
    origin_village: '',
    producer_count: '',
    gps_coordinates: '',
    
    // Compliance
    eudr_compliant: false,
    eudr_reference: '',
    deforestation_free: false,
    child_labor_free: false,
    
    // Logistics
    harvest_date: '',
    available_from: '',
    packaging: '',
    storage_conditions: '',
    warehouse_location: '',
    
    // Location
    location: '',
    department: '',
    
    // Description
    description: '',
    photos: [],
    lab_analysis_url: ''
  });

  const currentGrades = form.crop_type ? GRADES[form.crop_type] : [];
  const currentVarieties = form.crop_type ? VARIETIES[form.crop_type] : [];

  const handleCertificationToggle = (certId) => {
    setForm(prev => ({
      ...prev,
      certifications: prev.certifications.includes(certId)
        ? prev.certifications.filter(c => c !== certId)
        : [...prev.certifications, certId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.crop_type || !form.grade || !form.quantity_kg || !form.price_per_kg || !form.department) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        quantity_kg: parseFloat(form.quantity_kg),
        price_per_kg: parseFloat(form.price_per_kg),
        min_order_kg: parseFloat(form.min_order_kg) || 100,
        moisture_rate: form.moisture_rate ? parseFloat(form.moisture_rate) : null,
        bean_count: form.bean_count ? parseInt(form.bean_count) : null,
        defect_rate: form.defect_rate ? parseFloat(form.defect_rate) : null,
        fat_content: form.fat_content ? parseFloat(form.fat_content) : null,
        fermentation_days: form.fermentation_days ? parseInt(form.fermentation_days) : null,
        sca_score: form.sca_score ? parseFloat(form.sca_score) : null,
        kor: form.kor ? parseFloat(form.kor) : null,
        producer_count: form.producer_count ? parseInt(form.producer_count) : null,
        origin_country: 'CI'
      };

      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/harvest-marketplace/listings`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Votre récolte a été publiée avec succès sur le marché!');
      navigate('/marketplace/harvest');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900" data-testid="create-listing">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/30 via-slate-900 to-emerald-900/30 border-b border-slate-700">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au marché
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Package className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                Publier une Récolte sur le Marché
              </h1>
              <p className="text-slate-400">
                Fiche produit aux normes internationales (ICCO, ICO, AFI)
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-800 border border-slate-700 p-1 w-full justify-start overflow-x-auto">
            <TabsTrigger value="basic" className="data-[state=active]:bg-amber-600">
              <Leaf className="h-4 w-4 mr-2" />
              Produit
            </TabsTrigger>
            <TabsTrigger value="quality" className="data-[state=active]:bg-emerald-600">
              <Beaker className="h-4 w-4 mr-2" />
              Qualité
            </TabsTrigger>
            <TabsTrigger value="certifications" className="data-[state=active]:bg-blue-600">
              <Award className="h-4 w-4 mr-2" />
              Certifications
            </TabsTrigger>
            <TabsTrigger value="traceability" className="data-[state=active]:bg-purple-600">
              <Globe className="h-4 w-4 mr-2" />
              Traçabilité
            </TabsTrigger>
            <TabsTrigger value="logistics" className="data-[state=active]:bg-teal-600">
              <Truck className="h-4 w-4 mr-2" />
              Logistique
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Basic Product Info */}
          <TabsContent value="basic" className="space-y-6">
            {/* Crop Selection */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Leaf className="h-5 w-5 text-emerald-500" />
                  Type de Culture *
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Seuls les producteurs individuels et coopératives peuvent publier des récoltes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {['cacao', 'cafe', 'anacarde'].map((crop) => (
                    <div
                      key={crop}
                      onClick={() => setForm({...form, crop_type: crop, grade: '', variety: ''})}
                      className={`relative cursor-pointer rounded-xl overflow-hidden border-3 transition-all ${
                        form.crop_type === crop 
                          ? 'border-amber-500 ring-2 ring-amber-500/30 scale-[1.02]' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <img 
                        src={CROP_IMAGES[crop]} 
                        alt={crop}
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white font-bold text-lg capitalize">{crop}</p>
                        <p className="text-slate-300 text-xs">
                          {crop === 'cacao' && 'Normes ICCO'}
                          {crop === 'cafe' && 'Normes ICO/SCA'}
                          {crop === 'anacarde' && 'Normes AFI'}
                        </p>
                      </div>
                      {form.crop_type === crop && (
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                          <Check className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Variety & Grade */}
            {form.crop_type && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Variété</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={form.variety} onValueChange={(v) => setForm({...form, variety: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Sélectionner la variété..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentVarieties.map((v) => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white text-base">Grade de Qualité *</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select value={form.grade} onValueChange={(v) => setForm({...form, grade: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Sélectionner le grade..." />
                      </SelectTrigger>
                      <SelectContent>
                        {currentGrades.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            <div>
                              <span className="font-medium">{g.name}</span>
                              <span className="text-xs text-slate-400 ml-2">({g.desc})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Quantity & Price */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-500" />
                  Quantité & Prix *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-slate-300">Quantité (kg) *</Label>
                    <Input
                      type="number"
                      value={form.quantity_kg}
                      onChange={(e) => setForm({...form, quantity_kg: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="5000"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Prix (FCFA/kg) *</Label>
                    <Input
                      type="number"
                      value={form.price_per_kg}
                      onChange={(e) => setForm({...form, price_per_kg: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="1200"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Commande min (kg)</Label>
                    <Input
                      type="number"
                      value={form.min_order_kg}
                      onChange={(e) => setForm({...form, min_order_kg: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Incoterm</Label>
                    <Select value={form.incoterm} onValueChange={(v) => setForm({...form, incoterm: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {INCOTERMS.map((i) => (
                          <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {form.quantity_kg && form.price_per_kg && (
                  <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-emerald-900/50 to-teal-900/50 border border-emerald-700/30">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-400">Valeur totale du lot</span>
                      <span className="text-3xl font-bold text-white">
                        {new Intl.NumberFormat('fr-FR').format(parseFloat(form.quantity_kg) * parseFloat(form.price_per_kg))} FCFA
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-500" />
                  Localisation *
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Département *</Label>
                    <Select value={form.department} onValueChange={(v) => setForm({...form, department: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Village / Localité</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({...form, location: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Ex: Méagui Centre"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setActiveTab('quality')} className="bg-amber-600 hover:bg-amber-700">
                Suivant: Qualité →
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Quality Specifications */}
          <TabsContent value="quality" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-blue-500" />
                  Spécifications Qualité - Normes Internationales
                </CardTitle>
                <CardDescription className="text-slate-400">
                  {form.crop_type === 'cacao' && 'Standards ICCO (International Cocoa Organization)'}
                  {form.crop_type === 'cafe' && 'Standards ICO/SCA (Specialty Coffee Association)'}
                  {form.crop_type === 'anacarde' && 'Standards AFI (Alliance of Crop Traders)'}
                  {!form.crop_type && 'Sélectionnez d\'abord le type de culture'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {form.crop_type === 'cacao' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Grainage (fèves/100g)</Label>
                      <Input
                        type="number"
                        value={form.bean_count}
                        onChange={(e) => setForm({...form, bean_count: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="95 (max 100)"
                      />
                      <p className="text-xs text-slate-500 mt-1">ICCO: Max 100 fèves/100g</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Humidité (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.moisture_rate}
                        onChange={(e) => setForm({...form, moisture_rate: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="7.0 (max 7.5)"
                      />
                      <p className="text-xs text-slate-500 mt-1">ICCO: Max 7.5%</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Taux défauts (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.defect_rate}
                        onChange={(e) => setForm({...form, defect_rate: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="3.0"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Matière grasse (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.fat_content}
                        onChange={(e) => setForm({...form, fat_content: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="52"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Jours fermentation</Label>
                      <Input
                        type="number"
                        value={form.fermentation_days}
                        onChange={(e) => setForm({...form, fermentation_days: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="6"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Méthode séchage</Label>
                      <Select value={form.drying_method} onValueChange={(v) => setForm({...form, drying_method: v})}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solaire">Séchage solaire</SelectItem>
                          <SelectItem value="artificiel">Séchage artificiel</SelectItem>
                          <SelectItem value="mixte">Mixte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {form.crop_type === 'cafe' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">Score SCA (0-100)</Label>
                      <Input
                        type="number"
                        max="100"
                        value={form.sca_score}
                        onChange={(e) => setForm({...form, sca_score: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="82"
                      />
                      <p className="text-xs text-slate-500 mt-1">Specialty: ≥80</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Calibre (Screen Size)</Label>
                      <Select value={form.screen_size} onValueChange={(v) => setForm({...form, screen_size: v})}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="18+">AA (18+)</SelectItem>
                          <SelectItem value="17-18">AB (17-18)</SelectItem>
                          <SelectItem value="15-16">C (15-16)</SelectItem>
                          <SelectItem value="14">PB (14)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Méthode traitement</Label>
                      <Select value={form.processing_method} onValueChange={(v) => setForm({...form, processing_method: v})}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="washed">Lavé (Washed)</SelectItem>
                          <SelectItem value="natural">Naturel (Dry)</SelectItem>
                          <SelectItem value="honey">Honey</SelectItem>
                          <SelectItem value="semi-washed">Semi-lavé</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Humidité (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.moisture_rate}
                        onChange={(e) => setForm({...form, moisture_rate: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="11.0 (10-12%)"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Altitude (m)</Label>
                      <Input
                        value={form.altitude}
                        onChange={(e) => setForm({...form, altitude: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="1200-1500"
                      />
                    </div>
                  </div>
                )}

                {form.crop_type === 'anacarde' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-slate-300">KOR (Kernel Output Ratio)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.kor}
                        onChange={(e) => setForm({...form, kor: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="48 (lbs/80kg)"
                      />
                      <p className="text-xs text-slate-500 mt-1">Standard: ≥47 lbs</p>
                    </div>
                    <div>
                      <Label className="text-slate-300">Classification</Label>
                      <Select value={form.nut_count} onValueChange={(v) => setForm({...form, nut_count: v})}>
                        <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="W180">W180 (Premium)</SelectItem>
                          <SelectItem value="W210">W210</SelectItem>
                          <SelectItem value="W240">W240 (Standard)</SelectItem>
                          <SelectItem value="W320">W320</SelectItem>
                          <SelectItem value="W450">W450</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-300">Humidité (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={form.moisture_rate}
                        onChange={(e) => setForm({...form, moisture_rate: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white mt-2"
                        placeholder="8.0 (max 10%)"
                      />
                    </div>
                  </div>
                )}

                {!form.crop_type && (
                  <div className="text-center py-8 text-slate-400">
                    <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Veuillez d'abord sélectionner le type de culture dans l'onglet "Produit"</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Rapport d'Analyse Laboratoire
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-slate-300">URL du rapport (optionnel)</Label>
                  <Input
                    value={form.lab_analysis_url}
                    onChange={(e) => setForm({...form, lab_analysis_url: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white mt-2"
                    placeholder="https://..."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab('basic')} className="border-slate-600">
                ← Précédent
              </Button>
              <Button type="button" onClick={() => setActiveTab('certifications')} className="bg-blue-600 hover:bg-blue-700">
                Suivant: Certifications →
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: Certifications */}
          <TabsContent value="certifications" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-emerald-500" />
                  Certifications Internationales
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Sélectionnez les certifications applicables à votre récolte
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CERTIFICATIONS.map((cert) => (
                    <div
                      key={cert.id}
                      onClick={() => handleCertificationToggle(cert.id)}
                      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                        form.certifications.includes(cert.id)
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className="text-2xl">{cert.icon}</span>
                      <div className="flex-1">
                        <p className="text-white font-medium">{cert.name}</p>
                        <p className="text-xs text-slate-400">Standard: {cert.standard}</p>
                      </div>
                      {form.certifications.includes(cert.id) && (
                        <Check className="h-5 w-5 text-emerald-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Compliance */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  Conformité Réglementaire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                  <div>
                    <p className="text-white font-medium">EUDR Compliant</p>
                    <p className="text-xs text-slate-400">Règlement UE sur la déforestation</p>
                  </div>
                  <Checkbox
                    checked={form.eudr_compliant}
                    onCheckedChange={(checked) => setForm({...form, eudr_compliant: checked})}
                  />
                </div>
                {form.eudr_compliant && (
                  <div>
                    <Label className="text-slate-300">Référence Due Diligence EUDR</Label>
                    <Input
                      value={form.eudr_reference}
                      onChange={(e) => setForm({...form, eudr_reference: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Numéro de référence"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                  <div>
                    <p className="text-white font-medium">Zéro Déforestation</p>
                    <p className="text-xs text-slate-400">Attestation de non-déforestation</p>
                  </div>
                  <Checkbox
                    checked={form.deforestation_free}
                    onCheckedChange={(checked) => setForm({...form, deforestation_free: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-slate-700/50">
                  <div>
                    <p className="text-white font-medium">ICI Certified (Child Labor Free)</p>
                    <p className="text-xs text-slate-400">Certification travail des enfants</p>
                  </div>
                  <Checkbox
                    checked={form.child_labor_free}
                    onCheckedChange={(checked) => setForm({...form, child_labor_free: checked})}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab('quality')} className="border-slate-600">
                ← Précédent
              </Button>
              <Button type="button" onClick={() => setActiveTab('traceability')} className="bg-purple-600 hover:bg-purple-700">
                Suivant: Traçabilité →
              </Button>
            </div>
          </TabsContent>

          {/* TAB 4: Traceability */}
          <TabsContent value="traceability" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="h-5 w-5 text-purple-500" />
                  Traçabilité & Origine
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Informations de traçabilité pour les acheteurs internationaux
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Région d'origine</Label>
                    <Input
                      value={form.origin_region}
                      onChange={(e) => setForm({...form, origin_region: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Sud-Ouest, Centre-Ouest..."
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Village d'origine</Label>
                    <Input
                      value={form.origin_village}
                      onChange={(e) => setForm({...form, origin_village: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Nom du village"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Nombre de producteurs</Label>
                    <Input
                      type="number"
                      value={form.producer_count}
                      onChange={(e) => setForm({...form, producer_count: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="25"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Coordonnées GPS</Label>
                    <Input
                      value={form.gps_coordinates}
                      onChange={(e) => setForm({...form, gps_coordinates: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="5.3600° N, 4.0083° W"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setActiveTab('certifications')} className="border-slate-600">
                ← Précédent
              </Button>
              <Button type="button" onClick={() => setActiveTab('logistics')} className="bg-teal-600 hover:bg-teal-700">
                Suivant: Logistique →
              </Button>
            </div>
          </TabsContent>

          {/* TAB 5: Logistics */}
          <TabsContent value="logistics" className="space-y-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-teal-500" />
                  Informations Logistiques
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Date de récolte</Label>
                    <Input
                      type="date"
                      value={form.harvest_date}
                      onChange={(e) => setForm({...form, harvest_date: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Disponible à partir du</Label>
                    <Input
                      type="date"
                      value={form.available_from}
                      onChange={(e) => setForm({...form, available_from: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300">Conditionnement</Label>
                    <Select value={form.packaging} onValueChange={(v) => setForm({...form, packaging: v})}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-2">
                        <SelectValue placeholder="Sélectionner..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jute_60kg">Sacs jute 60kg</SelectItem>
                        <SelectItem value="jute_65kg">Sacs jute 65kg</SelectItem>
                        <SelectItem value="big_bag">Big bags 1T</SelectItem>
                        <SelectItem value="container">Container 20ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-300">Conditions stockage</Label>
                    <Input
                      value={form.storage_conditions}
                      onChange={(e) => setForm({...form, storage_conditions: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Entrepôt sec, ventilé..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-slate-300">Lieu d'entreposage</Label>
                    <Input
                      value={form.warehouse_location}
                      onChange={(e) => setForm({...form, warehouse_location: e.target.value})}
                      className="bg-slate-700 border-slate-600 text-white mt-2"
                      placeholder="Port d'Abidjan, Entrepôt Soubré..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                  placeholder="Description détaillée de votre récolte, particularités, historique de la coopérative..."
                />
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex gap-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => setActiveTab('traceability')}
                className="border-slate-600"
              >
                ← Précédent
              </Button>
              <Button 
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-lg py-6"
              >
                {loading ? 'Publication en cours...' : '🌍 Publier sur le Marché International'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  );
};

export default CreateHarvestListing;
