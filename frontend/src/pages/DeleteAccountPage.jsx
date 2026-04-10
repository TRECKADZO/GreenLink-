import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { AlertTriangle, Trash2, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DeleteAccountPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    
    if (confirmText !== 'SUPPRIMER') {
      setError('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, login to get token
      const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
        identifier: email,
        password: password
      });

      const token = loginResponse.data.access_token;

      // Then delete account
      await axios.delete(`${API_URL}/api/auth/account`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
    } catch (err) {
      /* error logged */
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
      } else {
        setError(err.response?.data?.detail || 'Une erreur est survenue. Veuillez réessayer.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a4038] to-[#0d2520] flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-gray-900">Compte supprimé</CardTitle>
            <CardDescription className="text-gray-600">
              Votre compte GreenLink a été supprimé avec succès. Toutes vos données personnelles ont été effacées.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-500 mb-6">
              Merci d'avoir utilisé GreenLink. Si vous changez d'avis, vous pouvez créer un nouveau compte à tout moment.
            </p>
            <Button 
              onClick={() => navigate('/')}
              className="bg-[#2d5a4d] hover:bg-[#1a4038]"
            >
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a4038] to-[#0d2520] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur">
        <CardHeader>
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </button>
          
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <CardTitle className="text-2xl text-center text-gray-900">
            Supprimer mon compte
          </CardTitle>
          <CardDescription className="text-center text-gray-600">
            {step === 1 && "Cette action est irréversible"}
            {step === 2 && "Confirmez votre identité"}
            {step === 3 && "Confirmation finale"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">Attention !</h3>
                <p className="text-sm text-red-700 mb-3">
                  La suppression de votre compte entraînera :
                </p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>Suppression de toutes vos données personnelles</li>
                  <li>Suppression de vos parcelles et récoltes</li>
                  <li>Suppression de l'historique des paiements</li>
                  <li>Perte de votre score carbone</li>
                  <li>Annulation des conversations en cours</li>
                </ul>
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Alternative</h3>
                <p className="text-sm text-amber-700">
                  Si vous souhaitez simplement vous déconnecter ou désactiver temporairement votre compte, contactez-nous à <strong>support@greenlink.ci</strong>
                </p>
              </div>

              <Button 
                onClick={() => setStep(2)}
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Je comprends, continuer
              </Button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email ou téléphone
                </label>
                <Input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  required
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit"
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={!email || !password}
              >
                Continuer
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Pour confirmer la suppression, tapez :
                </p>
                <p className="text-xl font-bold text-red-600">SUPPRIMER</p>
              </div>

              <Input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Tapez SUPPRIMER"
                className="w-full text-center text-lg font-semibold"
              />

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button 
                type="submit"
                variant="destructive"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading || confirmText !== 'SUPPRIMER'}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Suppression en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer définitivement mon compte
                  </span>
                )}
              </Button>
            </form>
          )}

          {/* Progress indicator */}
          <div className="flex justify-center mt-6 space-x-2">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={`w-2 h-2 rounded-full ${step >= s ? 'bg-red-500' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
