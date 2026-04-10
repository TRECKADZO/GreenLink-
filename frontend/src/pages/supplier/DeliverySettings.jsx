import { tokenService } from "../../services/tokenService";
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import Navbar from '../../components/Navbar';
import SupplierSidebar from '../../components/SupplierSidebar';
import { useToast } from '../../hooks/use-toast';
import axios from 'axios';
import { Truck, Package, MapPin, Scale, Gift, Save, Loader2, Info } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const getAuthHeader = () => {
  const token = tokenService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const DeliverySettings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    modeles_livraison: {
      frais_fixe: { actif: false, montant: 0 },
      par_distance: {
        actif: false,
        zones: { meme_ville: 0, meme_region: 0, national: 0 }
      },
      par_poids: { actif: false, prix_par_unite: 0 }
    },
    seuil_gratuit: { actif: false, montant_minimum: 0 }
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'fournisseur') {
      navigate('/');
      return;
    }
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, navigate]);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/marketplace/supplier/delivery-settings`,
        { headers: getAuthHeader() }
      );
      if (response.data?.modeles_livraison) {
        setSettings({
          modeles_livraison: response.data.modeles_livraison,
          seuil_gratuit: response.data.seuil_gratuit || { actif: false, montant_minimum: 0 }
        });
      }
    } catch (error) {
      console.error('Error fetching delivery settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/api/marketplace/supplier/delivery-settings`,
        settings,
        { headers: { ...getAuthHeader(), 'Content-Type': 'application/json' } }
      );
      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos modèles de livraison ont été mis à jour'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateModel = (model, field, value) => {
    setSettings(prev => ({
      ...prev,
      modeles_livraison: {
        ...prev.modeles_livraison,
        [model]: {
          ...prev.modeles_livraison[model],
          [field]: value
        }
      }
    }));
  };

  const updateZone = (zone, value) => {
    setSettings(prev => ({
      ...prev,
      modeles_livraison: {
        ...prev.modeles_livraison,
        par_distance: {
          ...prev.modeles_livraison.par_distance,
          zones: {
            ...prev.modeles_livraison.par_distance.zones,
            [zone]: parseFloat(value) || 0
          }
        }
      }
    }));
  };

  const updateSeuil = (field, value) => {
    setSettings(prev => ({
      ...prev,
      seuil_gratuit: {
        ...prev.seuil_gratuit,
        [field]: field === 'actif' ? value : (parseFloat(value) || 0)
      }
    }));
  };

  const activeCount = [
    settings.modeles_livraison.frais_fixe.actif,
    settings.modeles_livraison.par_distance.actif,
    settings.modeles_livraison.par_poids.actif
  ].filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <SupplierSidebar />
        <div className="ml-64 pt-20 p-8 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#2d5a4d]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SupplierSidebar />

      <div className="ml-64 pt-20 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2" data-testid="delivery-settings-title">
              Paramètres de Livraison
            </h1>
            <p className="text-gray-600">
              Configurez vos modèles de livraison. Vous pouvez activer un, deux ou les trois modèles.
              Les frais se cumulent lorsque plusieurs modèles sont actifs.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-[#2d5a4d]/10 text-[#2d5a4d] text-sm px-3 py-1">
              {activeCount} modèle{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
            </Badge>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2d5a4d] hover:bg-[#1a4038] text-white"
              data-testid="save-delivery-settings-btn"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Comment ça fonctionne :</strong> Activez les modèles souhaités. Si plusieurs sont actifs,
            les frais se cumulent (ex: Frais fixe 2 000 F + Zone 3 000 F = 5 000 F total).
            Le seuil de gratuité annule tous les frais si le sous-total de la commande dépasse le montant défini.
          </div>
        </div>

        <div className="grid gap-6">
          {/* Model 1: Frais Fixe */}
          <Card className="p-6 border-l-4 border-l-amber-500" data-testid="frais-fixe-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Frais Fixe</h3>
                  <p className="text-sm text-gray-500">Un montant fixe par commande, peu importe le contenu</p>
                </div>
              </div>
              <Switch
                checked={settings.modeles_livraison.frais_fixe.actif}
                onCheckedChange={(checked) => updateModel('frais_fixe', 'actif', checked)}
                data-testid="frais-fixe-toggle"
              />
            </div>
            {settings.modeles_livraison.frais_fixe.actif && (
              <div className="mt-4 pl-13">
                <Label htmlFor="frais-fixe-montant">Montant par commande (XOF)</Label>
                <Input
                  id="frais-fixe-montant"
                  type="number"
                  placeholder="2000"
                  min="0"
                  value={settings.modeles_livraison.frais_fixe.montant || ''}
                  onChange={(e) => updateModel('frais_fixe', 'montant', parseFloat(e.target.value) || 0)}
                  className="mt-1 max-w-xs"
                  data-testid="frais-fixe-montant-input"
                />
              </div>
            )}
          </Card>

          {/* Model 2: Par Distance/Zone */}
          <Card className="p-6 border-l-4 border-l-blue-500" data-testid="par-distance-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Par Zone / Distance</h3>
                  <p className="text-sm text-gray-500">Tarif selon la zone de livraison de l'acheteur</p>
                </div>
              </div>
              <Switch
                checked={settings.modeles_livraison.par_distance.actif}
                onCheckedChange={(checked) => updateModel('par_distance', 'actif', checked)}
                data-testid="par-distance-toggle"
              />
            </div>
            {settings.modeles_livraison.par_distance.actif && (
              <div className="mt-4 grid md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="zone-meme-ville">Même ville (XOF)</Label>
                  <Input
                    id="zone-meme-ville"
                    type="number"
                    placeholder="1000"
                    min="0"
                    value={settings.modeles_livraison.par_distance.zones.meme_ville || ''}
                    onChange={(e) => updateZone('meme_ville', e.target.value)}
                    className="mt-1"
                    data-testid="zone-meme-ville-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ex: Abidjan → Abidjan</p>
                </div>
                <div>
                  <Label htmlFor="zone-meme-region">Même région (XOF)</Label>
                  <Input
                    id="zone-meme-region"
                    type="number"
                    placeholder="3000"
                    min="0"
                    value={settings.modeles_livraison.par_distance.zones.meme_region || ''}
                    onChange={(e) => updateZone('meme_region', e.target.value)}
                    className="mt-1"
                    data-testid="zone-meme-region-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ex: Abidjan → Grand-Bassam</p>
                </div>
                <div>
                  <Label htmlFor="zone-national">National (XOF)</Label>
                  <Input
                    id="zone-national"
                    type="number"
                    placeholder="5000"
                    min="0"
                    value={settings.modeles_livraison.par_distance.zones.national || ''}
                    onChange={(e) => updateZone('national', e.target.value)}
                    className="mt-1"
                    data-testid="zone-national-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ex: Abidjan → Bouaké</p>
                </div>
              </div>
            )}
          </Card>

          {/* Model 3: Par Poids/Quantité */}
          <Card className="p-6 border-l-4 border-l-green-500" data-testid="par-poids-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Scale className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Par Quantité</h3>
                  <p className="text-sm text-gray-500">Frais calculés selon le nombre d'unités commandées</p>
                </div>
              </div>
              <Switch
                checked={settings.modeles_livraison.par_poids.actif}
                onCheckedChange={(checked) => updateModel('par_poids', 'actif', checked)}
                data-testid="par-poids-toggle"
              />
            </div>
            {settings.modeles_livraison.par_poids.actif && (
              <div className="mt-4">
                <Label htmlFor="prix-par-unite">Prix par unité commandée (XOF)</Label>
                <Input
                  id="prix-par-unite"
                  type="number"
                  placeholder="500"
                  min="0"
                  value={settings.modeles_livraison.par_poids.prix_par_unite || ''}
                  onChange={(e) => updateModel('par_poids', 'prix_par_unite', parseFloat(e.target.value) || 0)}
                  className="mt-1 max-w-xs"
                  data-testid="prix-par-unite-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Ex: 5 sacs x 500 F/unité = 2 500 F de frais de livraison
                </p>
              </div>
            )}
          </Card>

          {/* Seuil de gratuité */}
          <Card className="p-6 border-l-4 border-l-purple-500" data-testid="seuil-gratuit-card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Seuil de Gratuité</h3>
                  <p className="text-sm text-gray-500">Livraison gratuite au-dessus d'un certain montant</p>
                </div>
              </div>
              <Switch
                checked={settings.seuil_gratuit.actif}
                onCheckedChange={(checked) => updateSeuil('actif', checked)}
                data-testid="seuil-gratuit-toggle"
              />
            </div>
            {settings.seuil_gratuit.actif && (
              <div className="mt-4">
                <Label htmlFor="seuil-montant">Montant minimum de commande (XOF)</Label>
                <Input
                  id="seuil-montant"
                  type="number"
                  placeholder="50000"
                  min="0"
                  value={settings.seuil_gratuit.montant_minimum || ''}
                  onChange={(e) => updateSeuil('montant_minimum', e.target.value)}
                  className="mt-1 max-w-xs"
                  data-testid="seuil-montant-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  La livraison sera gratuite si le sous-total dépasse ce montant
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Preview */}
        <Card className="mt-8 p-6 bg-gradient-to-br from-[#2d5a4d]/5 to-[#d4a574]/5" data-testid="delivery-preview">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#2d5a4d]" />
            Aperçu pour vos clients
          </h3>
          <div className="space-y-2 text-sm">
            {activeCount === 0 ? (
              <p className="text-gray-500 italic">Aucun modèle actif — livraison gratuite par défaut</p>
            ) : (
              <>
                {settings.modeles_livraison.frais_fixe.actif && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-700">Fixe</Badge>
                    <span className="text-gray-700">
                      {settings.modeles_livraison.frais_fixe.montant.toLocaleString()} XOF par commande
                    </span>
                  </div>
                )}
                {settings.modeles_livraison.par_distance.actif && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700">Zone</Badge>
                    <span className="text-gray-700">
                      {settings.modeles_livraison.par_distance.zones.meme_ville.toLocaleString()} F (ville) /
                      {' '}{settings.modeles_livraison.par_distance.zones.meme_region.toLocaleString()} F (région) /
                      {' '}{settings.modeles_livraison.par_distance.zones.national.toLocaleString()} F (national)
                    </span>
                  </div>
                )}
                {settings.modeles_livraison.par_poids.actif && (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-700">Quantité</Badge>
                    <span className="text-gray-700">
                      {settings.modeles_livraison.par_poids.prix_par_unite.toLocaleString()} XOF par unité
                    </span>
                  </div>
                )}
                {settings.seuil_gratuit.actif && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                    <Badge className="bg-purple-100 text-purple-700">Gratuit</Badge>
                    <span className="text-gray-700">
                      Livraison offerte dès {settings.seuil_gratuit.montant_minimum.toLocaleString()} XOF d'achat
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Save Button (bottom) */}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2d5a4d] hover:bg-[#1a4038] text-white px-8"
            data-testid="save-delivery-settings-bottom-btn"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder les paramètres
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeliverySettings;
