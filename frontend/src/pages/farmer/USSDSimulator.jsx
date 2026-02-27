import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import Navbar from '../../components/Navbar';
import { Smartphone, ArrowLeft, Send } from 'lucide-react';

const USSDSimulator = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState('main');
  const [history, setHistory] = useState(['main']);
  const [phoneScreen, setPhoneScreen] = useState('');

  const screens = {
    main: {
      title: 'GreenLink USSD',
      content: `Bienvenue ${user?.full_name}

1. Déclarer parcelle
2. Déclarer récolte
3. Mes primes carbone
4. Recevoir paiement
5. Mon solde
6. Aide

Tapez votre choix`,
      options: ['1', '2', '3', '4', '5', '6']
    },
    '1': {
      title: 'Déclarer Parcelle',
      content: `DÉCLARATION PARCELLE

Envoyez SMS au 1234:
PARCELLE [Surface_ha] [Arbres] [Localité]

Exemple:
PARCELLE 3.5 450 Bouaflé

Pratiques:
A=Agroforesterie
C=Compost
Z=Zéro pesticides

Ex: PARCELLE 3.5 450 Bouaflé ACZ

0. Retour`,
      options: ['0']
    },
    '2': {
      title: 'Déclarer Récolte',
      content: `DÉCLARATION RÉCOLTE

Envoyez SMS au 1234:
RECOLTE [Quantité_kg] [Grade]

Grade: A, B, ou C

Exemple:
RECOLTE 250 A

Vous recevrez:
- Confirmation SMS
- Prime carbone si score >7
- Lien paiement Orange Money

0. Retour`,
      options: ['0']
    },
    '3': {
      title: 'Mes Primes Carbone',
      content: `VOS PRIMES CARBONE

📊 Score moyen: 8.2/10
✓ Prime active: OUI

Primes gagnées:
- Janvier: 12,500 F
- Février: 15,800 F
- Mars: 18,200 F

TOTAL: 46,500 FCFA

Continuez vos pratiques durables!

0. Retour`,
      options: ['0']
    },
    '4': {
      title: 'Recevoir Paiement',
      content: `RECEVOIR PAIEMENT

Montant disponible:
85,000 FCFA

Méthode:
1. Orange Money
2. MTN Money
3. Moov Money

Entrez votre numéro:
07 XX XX XX XX

Le paiement arrive en 2min!

0. Retour`,
      options: ['0', '1', '2', '3']
    },
    '5': {
      title: 'Mon Solde',
      content: `VOTRE SOLDE

💰 Disponible: 85,000 F
📦 En attente: 0 F
✓ Payé ce mois: 124,500 F

Parcelles: 2
Surface: 5.5 ha
Arbres: 850

Score carbone: 8.2/10
⭐ EXCELLENT

0. Retour`,
      options: ['0']
    },
    '6': {
      title: 'Aide',
      content: `AIDE GREENLINK

📞 Support: 07 87 76 10 23

SMS gratuit au 1234:
- AIDE [question]

Visitez:
bit.ly/greenlink-ci

Formation gratuite:
Chaque samedi à Daloa

0. Retour
00. Menu principal`,
      options: ['0', '00']
    }
  };

  const handleInput = (input) => {
    if (input === '0') {
      // Go back
      if (history.length > 1) {
        const newHistory = [...history];
        newHistory.pop();
        setHistory(newHistory);
        setScreen(newHistory[newHistory.length - 1]);
      }
    } else if (input === '00') {
      setScreen('main');
      setHistory(['main']);
    } else if (screens[input]) {
      setScreen(input);
      setHistory([...history, input]);
    }
    setPhoneScreen('');
  };

  const currentScreen = screens[screen];

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
