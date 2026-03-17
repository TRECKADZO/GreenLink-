import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { ArrowLeft, Phone, Wifi, WifiOff, Battery, Signal, RotateCcw } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const USSDCarbonCalculator = () => {
  const navigate = useNavigate();
  const [screen, setScreen] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [textHistory, setTextHistory] = useState('');
  const [sessionActive, setSessionActive] = useState(false);
  const [step, setStep] = useState(0);
  const inputRef = useRef(null);
  const screenRef = useRef(null);

  useEffect(() => {
    setSessionId(`carbon_${Date.now()}`);
  }, []);

  useEffect(() => {
    if (screenRef.current) {
      screenRef.current.scrollTop = screenRef.current.scrollHeight;
    }
  }, [screen]);

  const startSession = async () => {
    const newSessionId = `carbon_${Date.now()}`;
    setSessionId(newSessionId);
    setTextHistory('');
    setStep(0);
    await sendUSSD('', newSessionId);
  };

  const sendUSSD = async (input, sid = null) => {
    setLoading(true);
    try {
      const newText = textHistory ? `${textHistory}*${input}` : input;
      
      const res = await fetch(`${API_URL}/api/ussd/carbon-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sid || sessionId,
          serviceCode: '*144*88#',
          phoneNumber: '+2250700000000',
          text: newText
        })
      });
      
      const data = await res.json();
      setScreen(data.raw_response || data.text || 'Erreur');
      setStep(data.step || 0);
      
      if (data.continue_session) {
        setTextHistory(newText);
        setSessionActive(true);
      } else {
        setTextHistory('');
        setSessionActive(false);
      }
    } catch {
      setScreen('Erreur de connexion.\nReessayez *144*88#');
      setSessionActive(false);
    } finally {
      setLoading(false);
      setInputValue('');
      if (inputRef.current) inputRef.current.focus();
    }
  };

  const handleSend = () => {
    if (!inputValue.trim() || loading) return;
    sendUSSD(inputValue.trim());
  };

  const handleKeypad = (val) => {
    if (val === 'send') {
      handleSend();
    } else if (val === 'del') {
      setInputValue(prev => prev.slice(0, -1));
    } else {
      setInputValue(prev => prev + val);
    }
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3a30] via-[#2d5a4d] to-[#1a4038]">
      <Navbar />
      
      <div className="max-w-lg mx-auto px-4 pt-20 pb-8 sm:pt-24">
        {/* Back button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4 text-white/70 hover:text-white hover:bg-white/10"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        {/* Titre */}
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Prime Carbone USSD</h1>
          <p className="text-white/70 text-sm sm:text-base">Composez *144*88# pour calculer votre prime</p>
        </div>

        {/* How it works */}
        <Card className="p-4 mb-6 bg-white/10 border-white/20 backdrop-blur-sm">
          <h3 className="text-white font-semibold text-sm mb-2">Comment ca marche (60 secondes)</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2">
              <div className="w-8 h-8 bg-[#d4a574] rounded-full flex items-center justify-center mx-auto mb-1">
                <Phone className="w-4 h-4 text-[#2d5a4d]" />
              </div>
              <p className="text-white/80 text-xs">1. Composez *144*88#</p>
            </div>
            <div className="p-2">
              <div className="w-8 h-8 bg-[#d4a574] rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-[#2d5a4d] font-bold text-sm">8</span>
              </div>
              <p className="text-white/80 text-xs">2. Repondez a 8 questions</p>
            </div>
            <div className="p-2">
              <div className="w-8 h-8 bg-[#d4a574] rounded-full flex items-center justify-center mx-auto mb-1">
                <span className="text-[#2d5a4d] font-bold text-xs">FCFA</span>
              </div>
              <p className="text-white/80 text-xs">3. Recevez votre prime/kg</p>
            </div>
          </div>
        </Card>

        {/* Phone Simulator */}
        <div className="mx-auto max-w-[320px]" data-testid="ussd-phone-simulator">
          {/* Phone frame */}
          <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2.5rem] p-3 shadow-2xl ring-1 ring-white/10">
            {/* Notch */}
            <div className="flex justify-center mb-1">
              <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-800 rounded-full"></div>
              </div>
            </div>
            
            {/* Screen */}
            <div className="bg-white rounded-2xl overflow-hidden">
              {/* Status bar */}
              <div className="bg-gray-100 px-4 py-1.5 flex items-center justify-between text-[11px] text-gray-600">
                <div className="flex items-center gap-1">
                  <Signal className="w-3 h-3" />
                  <span>Orange CI</span>
                </div>
                <span className="font-medium">{timeStr}</span>
                <div className="flex items-center gap-1">
                  <WifiOff className="w-3 h-3 text-gray-400" />
                  <Battery className="w-4 h-3" />
                </div>
              </div>

              {/* USSD Header */}
              <div className="bg-orange-500 px-4 py-2.5 flex items-center justify-between">
                <span className="text-white font-bold text-sm">*144*88#</span>
                {sessionActive && (
                  <span className="text-white/80 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {step}/8
                  </span>
                )}
              </div>

              {/* USSD Content */}
              <div 
                ref={screenRef}
                className="min-h-[280px] max-h-[320px] overflow-y-auto p-4 bg-white"
                data-testid="ussd-screen"
              >
                {!sessionActive && !screen ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <Phone className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-gray-900 font-bold mb-1">*144*88#</p>
                    <p className="text-gray-500 text-sm mb-4">Calculateur Prime Carbone</p>
                    <Button 
                      onClick={startSession}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
                      data-testid="start-ussd-btn"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Composer *144*88#
                    </Button>
                  </div>
                ) : loading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-3"></div>
                      <p className="text-gray-500 text-sm">Chargement...</p>
                    </div>
                  </div>
                ) : (
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-relaxed" data-testid="ussd-response">
                    {screen}
                  </pre>
                )}
              </div>

              {/* Input area */}
              {sessionActive && (
                <div className="border-t border-gray-200 p-3 bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Votre reponse..."
                      className="flex-1 px-3 py-2.5 border-2 border-gray-300 rounded-lg text-center text-lg font-bold bg-white focus:border-orange-500 focus:outline-none"
                      data-testid="ussd-input"
                      inputMode="numeric"
                    />
                    <Button
                      onClick={handleSend}
                      className="bg-green-600 hover:bg-green-700 px-4"
                      disabled={!inputValue.trim() || loading}
                      data-testid="ussd-send-btn"
                    >
                      OK
                    </Button>
                  </div>
                </div>
              )}

              {/* Keypad */}
              {sessionActive && (
                <div className="grid grid-cols-3 gap-px bg-gray-200 border-t border-gray-200">
                  {['1','2','3','4','5','6','7','8','9','*','0','#'].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleKeypad(key)}
                      className="bg-white py-3 text-lg font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      data-testid={`keypad-${key}`}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              )}

              {/* Bottom actions */}
              {!sessionActive && screen && (
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <Button 
                    onClick={startSession}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="restart-ussd-btn"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Recalculer ma prime
                  </Button>
                </div>
              )}
            </div>

            {/* Home indicator */}
            <div className="flex justify-center mt-2">
              <div className="w-28 h-1 bg-gray-600 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Info bottom */}
        <div className="mt-6 text-center">
          <p className="text-white/50 text-xs">
            Simulation USSD - En production, composez *144*88# depuis tout telephone
          </p>
          <p className="text-white/40 text-xs mt-1">
            Gratuit - Fonctionne sans internet - Disponible 24h/24
          </p>
        </div>
      </div>
    </div>
  );
};

export default USSDCarbonCalculator;
