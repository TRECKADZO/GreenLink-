import { tokenService } from "../services/tokenService";
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Clock, FileText, CheckCircle2, AlertTriangle, Loader2, Send, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const REGIONS_CI = [
  'Abidjan', 'Bouake', 'Daloa', 'Yamoussoukro', 'Korhogo',
  'San-Pedro', 'Man', 'Gagnoa', 'Divo', 'Soubre',
  'Grand-Bassam', 'Abengourou', 'Bondoukou', 'Toute la Cote d\'Ivoire',
];

const SubscriptionBanner = ({ subscription }) => {
  const { toast } = useToast();
  const token = tokenService.getToken();
  const headers = { Authorization: `Bearer ${token}` };

  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [myQuotes, setMyQuotes] = useState([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    business_type: 'intrants',
    description: '',
    estimated_monthly_volume: '',
    target_regions: [],
    needs: '',
    billing_preference: 'monthly',
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchMyQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMyQuotes = async () => {
    setLoadingQuotes(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/subscriptions/quote/my-quote`, { headers });
      setMyQuotes(data.quotes || []);
    } catch (err) {
      console.warn('[Subscription] Quotes fetch failed:', err.message);
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.contact_name || !form.contact_phone || !form.description) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/subscriptions/quote/submit`, form, { headers });
      toast({ title: 'Devis soumis', description: 'Votre demande sera examinee sous 48h.' });
      setShowQuoteForm(false);
      fetchMyQuotes();
    } catch (err) {
      toast({ title: 'Erreur', description: err.response?.data?.detail || 'Erreur lors de la soumission', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRegion = (region) => {
    setForm(prev => ({
      ...prev,
      target_regions: prev.target_regions.includes(region)
        ? prev.target_regions.filter(r => r !== region)
        : [...prev.target_regions, region]
    }));
  };

  if (!subscription) return null;

  const { status, is_trial, days_remaining, requires_quote, message, price_xof, commission_rate, billing_cycle, end_date } = subscription;
  const pendingQuote = myQuotes.find(q => q.status === 'pending');
  const approvedQuote = myQuotes.find(q => q.status === 'approved');
  const rejectedQuote = myQuotes.find(q => q.status === 'rejected' && !myQuotes.some(qq => qq.status === 'pending'));

  const cycleLabel = { monthly: 'mois', quarterly: 'trimestre', yearly: 'an' }[billing_cycle] || 'mois';

  // Active subscription with pricing info - show billing card
  if (status === 'active' && !is_trial && price_xof) {
    const endDateStr = end_date ? new Date(end_date).toLocaleDateString('fr-FR') : '';
    return (
      <Card className="border-0 shadow-sm bg-emerald-50 mb-6" data-testid="active-subscription-banner">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-800">Abonnement actif</p>
                {endDateStr && <p className="text-xs text-emerald-600">Valide jusqu'au {endDateStr}</p>}
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Actif</Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Abonnement</p>
              <p className="text-lg font-bold text-gray-900">{price_xof.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-500">XOF/{cycleLabel}</span></p>
            </div>
            {commission_rate > 0 && (
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <p className="text-[10px] text-gray-500 uppercase font-medium">Commission sur ventes</p>
                <p className="text-lg font-bold text-gray-900">{commission_rate}%</p>
              </div>
            )}
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-[10px] text-gray-500 uppercase font-medium">Facturation</p>
              <p className="text-lg font-bold text-gray-900 capitalize">{cycleLabel === 'mois' ? 'Mensuelle' : cycleLabel === 'trimestre' ? 'Trimestrielle' : 'Annuelle'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active subscription without pricing (free or no data) - no banner needed
  if (status === 'active' && !is_trial) return null;

  // Trial active
  if (is_trial && days_remaining > 0) {
    return (
      <Card className="border-0 shadow-sm bg-blue-50 mb-6" data-testid="trial-banner">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Periode d'essai gratuite</p>
              <p className="text-sm text-blue-600">{days_remaining} jour(s) restant(s) sur vos 15 jours gratuits</p>
            </div>
          </div>
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">Essai gratuit</Badge>
        </CardContent>
      </Card>
    );
  }

  // Pending quote
  if (pendingQuote) {
    return (
      <Card className="border-0 shadow-sm bg-amber-50 mb-6" data-testid="pending-quote-banner">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
            <div>
              <p className="font-semibold text-amber-800">Devis en cours d'examen</p>
              <p className="text-sm text-amber-600">Soumis le {new Date(pendingQuote.submitted_at).toLocaleDateString('fr-FR')}. L'administrateur examinera votre demande sous 48h.</p>
            </div>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">En attente</Badge>
        </CardContent>
      </Card>
    );
  }

  // Rejected quote - can resubmit
  if (rejectedQuote && !pendingQuote) {
    return (
      <Card className="border-0 shadow-sm bg-red-50 mb-6" data-testid="rejected-quote-banner">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Devis refuse</p>
                <p className="text-sm text-red-600">{rejectedQuote.admin_note || 'Contactez le support pour plus d informations.'}</p>
              </div>
            </div>
          </div>
          {!showQuoteForm && (
            <Button onClick={() => setShowQuoteForm(true)} className="bg-red-600 hover:bg-red-700" size="sm">
              <FileText className="h-4 w-4 mr-1" /> Soumettre un nouveau devis
            </Button>
          )}
          {showQuoteForm && renderQuoteForm()}
        </CardContent>
      </Card>
    );
  }

  // Trial expired or no quote yet
  if (status === 'expired' || requires_quote) {
    return (
      <Card className="border-0 shadow-sm bg-amber-50 mb-6" data-testid="expired-trial-banner">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-800">Periode d'essai terminee</p>
                <p className="text-sm text-amber-600">Soumettez un devis pour continuer a utiliser la plateforme.</p>
              </div>
            </div>
          </div>
          {!showQuoteForm ? (
            <Button onClick={() => setShowQuoteForm(true)} className="bg-emerald-600 hover:bg-emerald-700" data-testid="open-quote-form-btn">
              <FileText className="h-4 w-4 mr-1" /> Remplir le formulaire de devis
            </Button>
          ) : renderQuoteForm()}
        </CardContent>
      </Card>
    );
  }

  // Suspended
  if (status === 'suspended') {
    return (
      <Card className="border-0 shadow-sm bg-red-50 mb-6" data-testid="suspended-banner">
        <CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-800">Compte suspendu</p>
            <p className="text-sm text-red-600">{message || 'Votre compte a ete suspendu. Contactez l administrateur.'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;

  function renderQuoteForm() {
    return (
      <form onSubmit={handleSubmit} className="mt-4 space-y-4 bg-white rounded-xl p-5 border" data-testid="quote-form">
        <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5 text-emerald-600" /> Formulaire de devis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Nom de l'entreprise *</label>
            <Input required value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Ex: Agri-Intrants SARL" data-testid="quote-company-name" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Nom du contact *</label>
            <Input required value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} placeholder="Ex: Jean Kouassi" data-testid="quote-contact-name" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Email</label>
            <Input type="email" value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} placeholder="email@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Telephone *</label>
            <Input required value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} placeholder="+225 07 XX XX XX XX" data-testid="quote-phone" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Type d'activite *</label>
            <Select value={form.business_type} onValueChange={v => setForm({ ...form, business_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intrants">Intrants agricoles</SelectItem>
                <SelectItem value="semences">Semences</SelectItem>
                <SelectItem value="equipements">Equipements</SelectItem>
                <SelectItem value="services">Services agricoles</SelectItem>
                <SelectItem value="transport">Transport / Logistique</SelectItem>
                <SelectItem value="autre">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Volume mensuel estime</label>
            <Input value={form.estimated_monthly_volume} onChange={e => setForm({ ...form, estimated_monthly_volume: e.target.value })} placeholder="Ex: 500 tonnes" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Description des produits/services *</label>
          <Textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Decrivez vos produits ou services..." rows={3} data-testid="quote-description" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Regions ciblees</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {REGIONS_CI.map(r => (
              <Badge
                key={r}
                variant={form.target_regions.includes(r) ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => toggleRegion(r)}
              >
                {r}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Besoins specifiques</label>
          <Textarea value={form.needs} onChange={e => setForm({ ...form, needs: e.target.value })} placeholder="Besoins ou exigences particulieres..." rows={2} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Preference de facturation</label>
          <Select value={form.billing_preference} onValueChange={v => setForm({ ...form, billing_preference: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensuel</SelectItem>
              <SelectItem value="quarterly">Trimestriel</SelectItem>
              <SelectItem value="yearly">Annuel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 pt-2">
          <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting} data-testid="submit-quote-btn">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Soumettre le devis
          </Button>
          <Button type="button" variant="outline" onClick={() => setShowQuoteForm(false)}>Annuler</Button>
        </div>
      </form>
    );
  }
};

export default SubscriptionBanner;
