import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { Smartphone, ArrowLeft, Send, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const USSDSimulator = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [phoneScreen, setPhoneScreen] = useState('');
  const [currentText, setCurrentText] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [userPhone, setUserPhone] = useState(user?.phone_number || '+2250700000000');

  // Initialize session
  useEffect(() => {
    setSessionId(`session_${Date.now()}`);
    // Load initial menu
    sendUSSD('');
  }, []);

  const sendUSSD = async (input) => {
    setLoading(true);
    try {
      const newText = currentText ? `${currentText}*${input}` : input;
      
      const res = await fetch(`${API_URL}/api/ussd/callback`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          serviceCode: '*123*45#',
          phoneNumber: userPhone,
          text: newText
        })
      });
      
      const data = await res.json();
      setResponse(data.raw_response || data.text || 'Erreur');
      
      if (data.continue_session) {
        setCurrentText(newText);
      } else {
        // Session ended, reset
        setCurrentText('');
        setSessionId(`session_${Date.now()}`);
      }
    } catch (error) {
      console.error('USSD error:', error);
      toast.error('Erreur de connexion');
      setResponse('Erreur de connexion. Réessayez.');
    } finally {
      setLoading(false);
      setPhoneScreen('');
    }
  };

  const handleInput = (input) => {
    if (input === '0' && currentText) {
      // Go back
      const parts = currentText.split('*');
      parts.pop();
      setCurrentText(parts.join('*'));
      sendUSSD(input);
    } else if (input === '00') {
      // Reset to main menu
      setCurrentText('');
      sendUSSD('');
    } else {
      sendUSSD(input);
    }
  };

  const resetSession = () => {
    setSessionId(`session_${Date.now()}`);
    setCurrentText('');
    sendUSSD('');
    toast.success('Session réinitialisée');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-6 py-12 pt-24">
        <Button 
          variant="outline" 
          onClick={() => navigate('/farmer/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au Dashboard
        </Button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Info Panel */}
          <div>
            <Card className="p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Smartphone className="w-8 h-8 text-orange-600" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Accès USSD/SMS</h2>
                  <p className="text-sm text-gray-600">Sans connexion internet</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                  <h3 className="font-bold text-orange-900 mb-2">📱 Comment utiliser?</h3>
                  <ol className="text-sm text-orange-800 space-y-1">
                    <li>1. Composez *123*45# depuis votre téléphone</li>
                    <li>2. Suivez les instructions à l'écran</li>
                    <li>3. Ou envoyez SMS au 1234</li>
                  </ol>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h3 className="font-bold text-green-900 mb-2">✓ Avantages USSD</h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• 100% gratuit (pas de data)</li>
                    <li>• Fonctionne sans internet</li>
                    <li>• Sur tous les téléphones</li>
                    <li>• Disponible en baoulé, dioula, sénoufo</li>
                    <li>• Paiement direct Orange Money</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h3 className="font-bold text-blue-900 mb-2">💬 SMS Rapides</h3>
                  <div className="text-sm text-blue-800 space-y-1 font-mono">
                    <p>PARCELLE 3.5 450 Bouaflé ACZ</p>
                    <p>RECOLTE 250 A</p>
                    <p>SOLDE</p>
                    <p>PRIME</p>
                    <p>AIDE</p>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">Envoyez au 1234 (gratuit)</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Phone Simulator */}
          <div>
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
                Simulateur USSD
              </h3>
              
              {/* Phone Frame */}
              <div className="mx-auto max-w-sm">
                <div className="bg-gray-900 rounded-3xl p-4 shadow-2xl">
                  {/* Phone Notch */}
                  <div className="bg-black h-6 rounded-t-2xl mb-2 flex items-center justify-center">
                    <div className="w-20 h-1 bg-gray-800 rounded-full"></div>
                  </div>
                  
                  {/* Phone Screen */}
                  <div className="bg-white rounded-xl p-4 min-h-[500px] flex flex-col">
                    {/* Status Bar */}
                    <div className="flex justify-between text-xs text-gray-600 mb-4">
                      <span>Orange CI</span>
                      <span>14:32</span>
                      <span>100%🔋</span>
                    </div>

                    {/* USSD Screen */}
                    <div className="flex-1 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-bold text-gray-900 mb-3 text-center">
                        {currentScreen.title}
                      </h4>
                      <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {currentScreen.content}
                      </pre>
                    </div>

                    {/* Input */}
                    <div className="mt-4">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={phoneScreen}
                          onChange={(e) => setPhoneScreen(e.target.value)}
                          placeholder="Tapez votre choix..."
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-center text-lg font-bold"
                          maxLength="2"
                        />
                        <Button
                          onClick={() => handleInput(phoneScreen)}
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!phoneScreen}
                        >
                          <Send className="w-5 h-5" />
                        </Button>
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        {currentScreen.options.map((opt) => (
                          <Button
                            key={opt}
                            variant="outline"
                            onClick={() => handleInput(opt)}
                            className="font-bold"
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default USSDSimulator;
