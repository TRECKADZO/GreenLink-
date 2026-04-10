import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Shield, Phone, Lock, ArrowLeft, CheckCircle, Eye, EyeOff, ClipboardCheck, Camera, UserPlus, MapPin, Activity } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ActivateAgent = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agentInfo, setAgentInfo] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleCheckPhone = async (e) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 8) {
      toast({
        title: 'Erreur',
        description: 'Veuillez entrer un numéro de téléphone valide',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+225' + formattedPhone;
      }

      const response = await fetch(`${API_URL}/api/auth/check-agent-phone/${encodeURIComponent(formattedPhone)}`);
      const data = await response.json();

      if (data.can_activate) {
        setAgentInfo(data);
        setStep(2);
      } else if (data.reason === 'has_account') {
        toast({
          title: 'Compte existant',
          description: data.message,
        });
        setTimeout(() => navigate('/login'), 2000);
      } else {
        toast({
          title: 'Non trouvé',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error checking phone:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de vérifier le numéro. Réessayez.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAccount = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({
        title: 'Erreur',
        description: 'Le mot de passe doit contenir au moins 6 caractères',
        variant: 'destructive'
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Erreur',
        description: 'Les mots de passe ne correspondent pas',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      let formattedPhone = phoneNumber.replace(/\s/g, '');
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+225' + formattedPhone;
      }

      const response = await fetch(`${API_URL}/api/auth/activate-agent-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: formattedPhone,
          password: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Compte Activé!',
          description: data.message,
        });
        // Auto login
        if (data.access_token) {
          login(data.access_token, data.user);
          navigate('/agent/terrain');
        } else {
          navigate('/login');
        }
      } else {
        toast({
          title: 'Erreur',
          description: data.detail || 'Activation échouée',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error activating account:', error);
      toast({
        title: 'Erreur',
        description: "Impossible d'activer le compte. Réessayez.",
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const permissions = [
    { icon: Activity, label: 'Tableau de bord performance' },
    { icon: ClipboardCheck, label: 'Visites SSRTE' },
    { icon: UserPlus, label: 'Enregistrement membres' },
    { icon: MapPin, label: 'Déclaration parcelles' },
    { icon: Camera, label: 'Photos géolocalisées' },
    { icon: Shield, label: 'Suivi travail des enfants' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-600 via-cyan-500 to-cyan-400 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => step === 1 ? navigate('/login') : setStep(1)}
            className="p-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Activer mon accès web</h1>
            <p className="text-sm text-gray-600">
              {step === 1 
                ? 'Entrez le numéro enregistré par votre coopérative'
                : 'Créez votre mot de passe pour accéder au dashboard'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-cyan-500' : 'bg-gray-300'}`} />
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-cyan-500' : 'bg-gray-300'}`} />
          <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-cyan-500' : 'bg-gray-300'}`} />
        </div>

        {/* Step 1: Phone Verification */}
        {step === 1 && (
          <form onSubmit={handleCheckPhone} className="space-y-4">
            <div>
              <Label htmlFor="phone">Numéro de téléphone</Label>
              <div className="flex mt-1">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-100 text-gray-500 text-sm">
                  +225
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07 XX XX XX XX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="rounded-l-none"
                  maxLength={12}
                  data-testid="agent-phone-input"
                />
              </div>
            </div>

            <div className="bg-cyan-50 p-4 rounded-lg border border-cyan-200">
              <div className="flex items-start gap-2">
                <Shield className="w-5 h-5 text-cyan-600 mt-0.5" />
                <p className="text-sm text-cyan-800">
                  Vous devez être enregistré comme agent terrain par votre coopérative pour activer votre compte.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-6"
              disabled={loading}
              data-testid="verify-agent-phone-btn"
            >
              {loading ? 'Vérification...' : 'Vérifier mon numéro'}
            </Button>
          </form>
        )}

        {/* Step 2: Create Password */}
        {step === 2 && agentInfo && (
          <form onSubmit={handleActivateAccount} className="space-y-4">
            {/* Agent Info Card */}
            <div className="bg-cyan-50 p-4 rounded-lg border-l-4 border-cyan-600">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-cyan-600" />
                <span className="font-semibold text-cyan-800">Profil Agent Trouvé!</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Nom:</span> <span className="font-medium">{agentInfo.agent_name}</span></p>
                <p><span className="text-gray-500">Coopérative:</span> <span className="font-medium">{agentInfo.cooperative_name}</span></p>
                {agentInfo.zone && (
                  <p><span className="text-gray-500">Zone:</span> <span className="font-medium">{agentInfo.zone}</span></p>
                )}
              </div>
              
              {/* Permissions */}
              <div className="mt-3 pt-3 border-t border-cyan-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Vos permissions:</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {permissions.map((perm, i) => (
                    <div key={`el-${i}`} className="flex items-center gap-1 text-xs text-gray-600">
                      <perm.icon className="w-3 h-3 text-cyan-500" />
                      <span>{perm.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="password">Créer un mot de passe</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mot de passe (6 caractères min.)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  data-testid="agent-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3"
                >
                  {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Répétez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  data-testid="agent-confirm-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-6"
              disabled={loading}
              data-testid="activate-agent-account-btn"
            >
              {loading ? 'Activation...' : 'Activer mon accès agent'}
            </Button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Vous avez déjà un compte?{' '}
            <Link to="/login" className="text-cyan-600 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default ActivateAgent;
