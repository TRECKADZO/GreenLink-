import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  Users, Copy, Check, Share2, Gift, Heart, 
  Building2, MapPin, Calendar, ChevronRight, Sparkles
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const CooperativeReferralPage = () => {
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [coopName, setCoopName] = useState('');
  const [affiliates, setAffiliates] = useState([]);
  const [totalAffiliates, setTotalAffiliates] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const MESSAGE = "Le service est entièrement gratuit pour votre coopérative. Vous pouvez parrainer d'autres coopératives en leur partageant votre code. Cela nous aide à faire grandir ensemble le réseau des coopératives engagées dans les pratiques durables.";

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Get referral code
      const codeRes = await axios.get(`${BACKEND_URL}/api/cooperative-referral/my-code`, { headers });
      setReferralCode(codeRes.data.referral_code);
      setCoopName(codeRes.data.coop_name);

      // Get affiliates
      const affiliatesRes = await axios.get(`${BACKEND_URL}/api/cooperative-referral/my-affiliates`, { headers });
      setAffiliates(affiliatesRes.data.affiliates || []);
      setTotalAffiliates(affiliatesRes.data.total_affiliates || 0);

    } catch (err) {
      console.error('Error fetching referral data:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = referralCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareCode = async () => {
    const shareText = `Rejoignez le réseau GreenLink Agritech ! Utilisez mon code de parrainage lors de votre inscription : ${referralCode}\n\nEnsemble, engageons-nous pour des pratiques agricoles durables. 🌱`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Code de parrainage GreenLink',
          text: shareText,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback - copy to clipboard
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mb-4">
          <Users className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Réseau de Coopératives Affiliées</h1>
        <p className="text-gray-500 mt-2 max-w-xl mx-auto">{MESSAGE}</p>
      </div>

      {/* Referral Code Card */}
      <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-emerald-600" />
            Mon Code de Parrainage
          </CardTitle>
          <CardDescription>
            Partagez ce code avec d'autres coopératives pour les inviter à rejoindre le réseau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Code Display */}
            <div className="flex-1 w-full">
              <div className="bg-white rounded-xl p-4 border-2 border-dashed border-emerald-300 text-center">
                <span className="text-2xl md:text-3xl font-mono font-bold text-emerald-700 tracking-wider">
                  {referralCode}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={copyToClipboard}
                variant={copied ? "default" : "outline"}
                className={copied ? "bg-emerald-600 text-white" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"}
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "Copié !" : "Copier"}
              </Button>
              <Button 
                onClick={shareCode}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>

          {/* Share Message */}
          <div className="mt-4 p-3 bg-white/60 rounded-lg border border-emerald-200">
            <p className="text-sm text-gray-600 italic">
              "Rejoignez le réseau GreenLink Agritech ! Utilisez mon code <strong>{referralCode}</strong> lors de votre inscription. Ensemble, engageons-nous pour des pratiques agricoles durables. 🌱"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Coopératives Parrainées</p>
                <p className="text-3xl font-bold text-blue-900">{totalAffiliates}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Total Membres Affiliés</p>
                <p className="text-3xl font-bold text-purple-900">
                  {affiliates.reduce((sum, a) => sum + (a.members_count || 0), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600">Service</p>
                <p className="text-xl font-bold text-amber-900">100% Gratuit</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Heart className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliates List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Mes Parrainages ({totalAffiliates})
          </CardTitle>
          <CardDescription>
            Liste des coopératives qui ont rejoint le réseau grâce à votre code
          </CardDescription>
        </CardHeader>
        <CardContent>
          {affiliates.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune coopérative affiliée pour le moment</p>
              <p className="text-sm text-gray-400 mt-1">
                Partagez votre code pour inviter d'autres coopératives
              </p>
              <Button onClick={shareCode} className="mt-4 bg-emerald-600 hover:bg-emerald-700">
                <Share2 className="w-4 h-4 mr-2" />
                Partager mon code
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {affiliates.map((affiliate, index) => (
                <div 
                  key={affiliate.id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{affiliate.coop_name}</p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {affiliate.region && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {affiliate.region}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(affiliate.affiliated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-white">
                      <Users className="w-3 h-3 mr-1" />
                      {affiliate.members_count} membres
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Message */}
      <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Ensemble pour des pratiques durables</h3>
              <p className="text-emerald-100 text-sm">
                {MESSAGE}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CooperativeReferralPage;
