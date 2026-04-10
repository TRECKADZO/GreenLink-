import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  Handshake, Quote, Plus, Trash2, Edit, Save, X, 
  ChevronLeft, Eye, EyeOff, GripVertical, ExternalLink
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContentManagement = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('partners');
  
  // Partners state
  const [partners, setPartners] = useState([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [partnerDialog, setPartnerDialog] = useState({ open: false, partner: null });
  const [partnerForm, setPartnerForm] = useState({
    name: '', description: '', logo: '', type: 'technology', color: 'bg-blue-500', website: ''
  });
  
  // Testimonials state
  const [testimonials, setTestimonials] = useState([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  const [testimonialDialog, setTestimonialDialog] = useState({ open: false, testimonial: null });
  const [testimonialForm, setTestimonialForm] = useState({
    text: '', author: '', role: '', initial: '', color: 'bg-[#2d5a4d]', is_active: true, order: 0
  });

  const partnerTypes = [
    { value: 'payment', label: 'Paiement', color: 'bg-orange-500' },
    { value: 'certification', label: 'Certification', color: 'bg-green-500' },
    { value: 'logistics', label: 'Logistique', color: 'bg-blue-500' },
    { value: 'technology', label: 'Technologie', color: 'bg-purple-500' },
    { value: 'finance', label: 'Finance', color: 'bg-yellow-500' },
    { value: 'government', label: 'Gouvernement', color: 'bg-red-500' }
  ];

  const colorOptions = [
    { value: 'bg-[#2d5a4d]', label: 'Vert GreenLink' },
    { value: 'bg-orange-500', label: 'Orange' },
    { value: 'bg-blue-500', label: 'Bleu' },
    { value: 'bg-green-500', label: 'Vert' },
    { value: 'bg-purple-500', label: 'Violet' },
    { value: 'bg-red-500', label: 'Rouge' },
    { value: 'bg-yellow-500', label: 'Jaune' },
    { value: 'bg-teal-500', label: 'Turquoise' },
    { value: 'bg-pink-500', label: 'Rose' }
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      navigate('/');
      return;
    }
    fetchPartners();
    fetchTestimonials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const fetchPartners = async () => {
    setLoadingPartners(true);
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/partners`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartners(response.data || []);
    } catch (error) {
      /* error logged */
    } finally {
      setLoadingPartners(false);
    }
  };

  const fetchTestimonials = async () => {
    setLoadingTestimonials(true);
    try {
      const token = tokenService.getToken();
      const response = await axios.get(`${API_URL}/api/admin/testimonials`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestimonials(response.data || []);
    } catch (error) {
      /* error logged */
    } finally {
      setLoadingTestimonials(false);
    }
  };

  // Partner handlers
  const openPartnerDialog = (partner = null) => {
    if (partner) {
      setPartnerForm({
        name: partner.name || '',
        description: partner.description || '',
        logo: partner.logo || '',
        type: partner.type || 'technology',
        color: partner.color || 'bg-blue-500',
        website: partner.website || ''
      });
    } else {
      setPartnerForm({
        name: '', description: '', logo: '', type: 'technology', color: 'bg-blue-500', website: ''
      });
    }
    setPartnerDialog({ open: true, partner });
  };

  const savePartner = async () => {
    try {
      const token = tokenService.getToken();
      
      if (partnerDialog.partner) {
        await axios.put(
          `${API_URL}/api/partners/${partnerDialog.partner._id}`,
          partnerForm,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        toast({ title: 'Partenaire mis à jour' });
      } else {
        await axios.post(
          `${API_URL}/api/partners`,
          partnerForm,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        toast({ title: 'Partenaire ajouté' });
      }
      
      setPartnerDialog({ open: false, partner: null });
      fetchPartners();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const deletePartner = async (partnerId) => {
    if (!window.confirm('Supprimer ce partenaire ?')) return;
    
    try {
      const token = tokenService.getToken();
      await axios.delete(`${API_URL}/api/partners/${partnerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Partenaire supprimé' });
      fetchPartners();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  // Testimonial handlers
  const openTestimonialDialog = (testimonial = null) => {
    if (testimonial) {
      setTestimonialForm({
        text: testimonial.text || '',
        author: testimonial.author || '',
        role: testimonial.role || '',
        initial: testimonial.initial || '',
        color: testimonial.color || 'bg-[#2d5a4d]',
        is_active: testimonial.is_active !== false,
        order: testimonial.order || 0
      });
    } else {
      setTestimonialForm({
        text: '', author: '', role: '', initial: '', color: 'bg-[#2d5a4d]', is_active: true, order: 0
      });
    }
    setTestimonialDialog({ open: true, testimonial });
  };

  const saveTestimonial = async () => {
    try {
      const token = tokenService.getToken();
      const data = {
        ...testimonialForm,
        initial: testimonialForm.initial || testimonialForm.author.charAt(0).toUpperCase()
      };
      
      if (testimonialDialog.testimonial) {
        await axios.put(
          `${API_URL}/api/admin/testimonials/${testimonialDialog.testimonial._id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        toast({ title: 'Témoignage mis à jour' });
      } else {
        await axios.post(
          `${API_URL}/api/admin/testimonials`,
          data,
          { headers: { Authorization: `Bearer ${token}` }}
        );
        toast({ title: 'Témoignage ajouté' });
      }
      
      setTestimonialDialog({ open: false, testimonial: null });
      fetchTestimonials();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const deleteTestimonial = async (testimonialId) => {
    if (!window.confirm('Supprimer ce témoignage ?')) return;
    
    try {
      const token = tokenService.getToken();
      await axios.delete(`${API_URL}/api/admin/testimonials/${testimonialId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Témoignage supprimé' });
      fetchTestimonials();
    } catch (error) {
      toast({ title: 'Erreur', description: 'Impossible de supprimer', variant: 'destructive' });
    }
  };

  const toggleTestimonialActive = async (testimonial) => {
    try {
      const token = tokenService.getToken();
      await axios.put(
        `${API_URL}/api/admin/testimonials/${testimonial._id}`,
        { is_active: !testimonial.is_active },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchTestimonials();
    } catch (error) {
      toast({ title: 'Erreur', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion du Contenu</h1>
              <p className="text-gray-500">Partenaires et témoignages affichés sur la page d'accueil</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="partners" className="flex items-center gap-2">
                <Handshake className="w-4 h-4" />
                Partenaires ({partners.length})
              </TabsTrigger>
              <TabsTrigger value="testimonials" className="flex items-center gap-2">
                <Quote className="w-4 h-4" />
                Témoignages ({testimonials.length})
              </TabsTrigger>
            </TabsList>

            {/* Partners Tab */}
            <TabsContent value="partners">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Ils nous font confiance</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {partners.length === 0 
                        ? "Aucun partenaire. La section sera masquée sur la page d'accueil."
                        : `${partners.length} partenaire(s) affichés sur la page d'accueil`}
                    </p>
                  </div>
                  <Button onClick={() => openPartnerDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingPartners ? (
                    <p className="text-center py-8 text-gray-500">Chargement...</p>
                  ) : partners.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <Handshake className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">Aucun partenaire enregistré</p>
                      <Button onClick={() => openPartnerDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter votre premier partenaire
                      </Button>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {partners.map((partner) => (
                        <Card key={partner._id} className="p-4 relative group">
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openPartnerDialog(partner)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deletePartner(partner._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 mb-3">
                            {partner.logo ? (
                              <img src={partner.logo} alt={partner.name} className="w-12 h-12 object-contain" />
                            ) : (
                              <div className={`w-12 h-12 ${partner.color || 'bg-[#2d5a4d]'} rounded-full flex items-center justify-center`}>
                                <span className="text-white font-bold">
                                  {partner.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <h3 className="font-semibold">{partner.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {partnerTypes.find(t => t.value === partner.type)?.label || partner.type}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600">{partner.description}</p>
                          {partner.website && (
                            <a href={partner.website} target="_blank" rel="noopener noreferrer" 
                               className="text-xs text-[#2d5a4d] flex items-center gap-1 mt-2 hover:underline">
                              <ExternalLink className="w-3 h-3" /> Site web
                            </a>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Testimonials Tab */}
            <TabsContent value="testimonials">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Ce qu'ils disent de nous</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      {testimonials.length === 0 
                        ? "Aucun témoignage. La section sera masquée sur la page d'accueil."
                        : `${testimonials.filter(t => t.is_active).length} témoignage(s) actif(s)`}
                    </p>
                  </div>
                  <Button onClick={() => openTestimonialDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingTestimonials ? (
                    <p className="text-center py-8 text-gray-500">Chargement...</p>
                  ) : testimonials.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
                      <Quote className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500 mb-4">Aucun témoignage enregistré</p>
                      <Button onClick={() => openTestimonialDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter votre premier témoignage
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {testimonials.map((testimonial) => (
                        <Card key={testimonial._id} className={`p-4 relative group ${!testimonial.is_active ? 'opacity-50 bg-gray-50' : ''}`}>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => toggleTestimonialActive(testimonial)}
                              title={testimonial.is_active ? 'Désactiver' : 'Activer'}
                            >
                              {testimonial.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => openTestimonialDialog(testimonial)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="text-red-600" onClick={() => deleteTestimonial(testimonial._id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          
                          <div className="flex gap-4">
                            <div className={`w-12 h-12 ${testimonial.color || 'bg-[#2d5a4d]'} rounded-full flex items-center justify-center flex-shrink-0`}>
                              <span className="text-white font-bold">{testimonial.initial}</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-700 mb-2">"{testimonial.text}"</p>
                              <p className="font-semibold text-sm">{testimonial.author}</p>
                              <p className="text-xs text-gray-500">{testimonial.role}</p>
                            </div>
                          </div>
                          
                          {!testimonial.is_active && (
                            <Badge className="absolute bottom-2 right-2 bg-gray-200 text-gray-600">Masqué</Badge>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Partner Dialog */}
      <Dialog open={partnerDialog.open} onOpenChange={(open) => setPartnerDialog({ open, partner: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{partnerDialog.partner ? 'Modifier le partenaire' : 'Nouveau partenaire'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nom *</Label>
              <Input 
                value={partnerForm.name}
                onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                placeholder="Ex: Orange Côte d'Ivoire"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input 
                value={partnerForm.description}
                onChange={(e) => setPartnerForm({...partnerForm, description: e.target.value})}
                placeholder="Ex: Partenaire Paiement Mobile"
              />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={partnerForm.type} onValueChange={(v) => setPartnerForm({...partnerForm, type: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {partnerTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>URL du logo (optionnel)</Label>
              <Input 
                value={partnerForm.logo}
                onChange={(e) => setPartnerForm({...partnerForm, logo: e.target.value})}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label>Couleur (si pas de logo)</Label>
              <Select value={partnerForm.color} onValueChange={(v) => setPartnerForm({...partnerForm, color: v})}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded ${partnerForm.color}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded ${c.value}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Site web (optionnel)</Label>
              <Input 
                value={partnerForm.website}
                onChange={(e) => setPartnerForm({...partnerForm, website: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPartnerDialog({ open: false, partner: null })}>
              Annuler
            </Button>
            <Button onClick={savePartner} disabled={!partnerForm.name}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Testimonial Dialog */}
      <Dialog open={testimonialDialog.open} onOpenChange={(open) => setTestimonialDialog({ open, testimonial: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{testimonialDialog.testimonial ? 'Modifier le témoignage' : 'Nouveau témoignage'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Témoignage *</Label>
              <Textarea 
                value={testimonialForm.text}
                onChange={(e) => setTestimonialForm({...testimonialForm, text: e.target.value})}
                placeholder="Grâce à GreenLink, j'ai augmenté mes revenus..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Auteur *</Label>
                <Input 
                  value={testimonialForm.author}
                  onChange={(e) => setTestimonialForm({...testimonialForm, author: e.target.value})}
                  placeholder="Kouadio Yao"
                />
              </div>
              <div>
                <Label>Initiale</Label>
                <Input 
                  value={testimonialForm.initial}
                  onChange={(e) => setTestimonialForm({...testimonialForm, initial: e.target.value.toUpperCase()})}
                  placeholder="K"
                  maxLength={2}
                />
              </div>
            </div>
            <div>
              <Label>Rôle / Fonction</Label>
              <Input 
                value={testimonialForm.role}
                onChange={(e) => setTestimonialForm({...testimonialForm, role: e.target.value})}
                placeholder="Producteur de cacao, Soubré"
              />
            </div>
            <div>
              <Label>Couleur de l'avatar</Label>
              <Select value={testimonialForm.color} onValueChange={(v) => setTestimonialForm({...testimonialForm, color: v})}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${testimonialForm.color}`} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map(c => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${c.value}`} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label>Actif sur la page d'accueil</Label>
              <Switch 
                checked={testimonialForm.is_active}
                onCheckedChange={(checked) => setTestimonialForm({...testimonialForm, is_active: checked})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestimonialDialog({ open: false, testimonial: null })}>
              Annuler
            </Button>
            <Button onClick={saveTestimonial} disabled={!testimonialForm.text || !testimonialForm.author}>
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentManagement;
