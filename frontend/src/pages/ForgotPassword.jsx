import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sprout, Mail, ArrowLeft, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: request, 2: verify code, 3: new password
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [simulationCode, setSimulationCode] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Step 1: Request reset code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error('Veuillez entrer votre email ou téléphone');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/auth/forgot-password`, {
        identifier: identifier.trim()
      });
      
      // Track delivery method from backend
      setDeliveryMethod(response.data.delivery_method || null);
      
      // If real email was sent, show confirmation
      if (response.data.email_sent) {
        setEmailSent(true);
      }
      // Only show simulation code for phone-only users (SMS not yet configured)
      // NEVER show code for email users - they must check their inbox
      if (response.data.simulation_code && response.data.delivery_method === 'sms_simulation') {
        setSimulationCode(response.data.simulation_code);
      }
      
      toast.success('Code de réinitialisation envoyé');
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du code');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 6) {
      toast.error('Veuillez entrer le code à 6 chiffres');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/verify-reset-code`, {
        identifier: identifier.trim(),
        code: code.trim()
      });
      
      toast.success('Code vérifié');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Code invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/reset-password`, {
        identifier: identifier.trim(),
        code: code.trim(),
        new_password: newPassword
      });
      
      toast.success('Mot de passe réinitialisé avec succès!');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8" data-testid="forgot-password-card">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-7 h-7 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {step === 1 && 'Mot de passe oublié'}
              {step === 2 && 'Vérification'}
              {step === 3 && 'Nouveau mot de passe'}
            </h1>
            <p className="text-sm text-gray-600">
              {step === 1 && 'Entrez votre email ou téléphone'}
              {step === 2 && 'Entrez le code reçu'}
              {step === 3 && 'Créez votre nouveau mot de passe'}
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-10 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-[#2d5a4d]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Request Code */}
        {step === 1 && (
          <form onSubmit={handleRequestCode} className="space-y-6">
            <div>
              <Label htmlFor="identifier">Email ou Téléphone</Label>
              <div className="relative mt-2">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="exemple@email.com ou +225 0707070707"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  data-testid="identifier-input"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white py-6 text-lg"
              disabled={loading}
              data-testid="request-code-btn"
            >
              {loading ? 'Envoi en cours...' : 'Envoyer le code'}
            </Button>
          </form>
        )}

        {/* Step 2: Verify Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            {/* Email Sent Confirmation */}
            {emailSent && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Mail className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Code envoyé par email</p>
                    <p className="text-sm text-green-700 mt-1">
                      Un code de vérification à 6 chiffres a été envoyé à votre adresse email. 
                      Vérifiez votre boîte de réception et vos spams.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* SMS Simulation - Code Display (phone-only users, SMS not yet configured) */}
            {simulationCode && deliveryMethod === 'sms_simulation' && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div className="w-full">
                    <p className="text-sm font-medium text-amber-800">Mode simulation SMS</p>
                    <div className="mt-2 bg-white border-2 border-amber-400 rounded-lg p-3 text-center">
                      <span className="text-2xl font-bold tracking-[0.4em] text-[#2d5a4d]">{simulationCode}</span>
                    </div>
                    <p className="text-xs text-amber-600 mt-2">
                      Le service SMS n'est pas encore configuré. Recopiez ce code ci-dessous.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phone user without email - no simulation code available */}
            {!emailSent && !simulationCode && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Code envoyé</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Si un compte existe avec cet identifiant, un code de réinitialisation a été envoyé.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="code">Code de vérification</Label>
              <div className="relative mt-2">
                <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="pl-10 text-center text-xl tracking-widest"
                  maxLength={6}
                  data-testid="code-input"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Entrez le code à 6 chiffres reçu
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#2d5a4d] hover:bg-[#1a4038] text-white"
                disabled={loading || code.length !== 6}
                data-testid="verify-code-btn"
              >
                {loading ? 'Vérification...' : 'Vérifier'}
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">Code vérifié avec succès</span>
            </div>

            <div>
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative mt-2">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  data-testid="new-password-input"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative mt-2">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Répétez le mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  data-testid="confirm-password-input"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white py-6 text-lg"
              disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
              data-testid="reset-password-btn"
            >
              {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </Button>
          </form>
        )}

        {/* Back to login link */}
        <div className="mt-6 text-center">
          <Link to="/login" className="text-sm text-[#2d5a4d] hover:underline flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPassword;
