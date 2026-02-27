import React from 'react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  Server,
  AlertTriangle,
  CheckCircle,
  Smartphone
} from 'lucide-react';

const SecuritePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <ShieldCheck className="w-16 h-16 text-[#2d5a4d] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Sécurité
            </h1>
            <p className="text-gray-600">
              Votre sécurité est notre priorité
            </p>
          </div>

          <div className="space-y-8">
            {/* Security Overview */}
            <Card className="p-8 bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] text-white">
              <div className="flex items-center gap-4 mb-4">
                <ShieldCheck className="w-12 h-12" />
                <div>
                  <h2 className="text-2xl font-bold">Protection de Niveau Entreprise</h2>
                  <p className="opacity-90">
                    GreenLink utilise les mêmes standards de sécurité que les banques
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">256-bit</p>
                  <p className="text-sm opacity-80">Chiffrement SSL</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">99.9%</p>
                  <p className="text-sm opacity-80">Disponibilité</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold">24/7</p>
                  <p className="text-sm opacity-80">Surveillance</p>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-6 h-6 text-[#2d5a4d]" />
                Sécurité de Votre Compte
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Nous protégeons votre compte avec :</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Mots de passe sécurisés</h4>
                      <p className="text-sm">Hashage bcrypt avec sel unique</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Sessions sécurisées</h4>
                      <p className="text-sm">Tokens JWT avec expiration automatique</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Détection d'intrusion</h4>
                      <p className="text-sm">Alertes sur connexions suspectes</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Déconnexion automatique</h4>
                      <p className="text-sm">Sessions expirées après inactivité</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-[#2d5a4d]" />
                Sécurité des Paiements
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Tous les paiements sont traités de manière sécurisée via Orange Money, 
                  un service certifié et régulé par la BCEAO.
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">OM</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">Orange Money</h4>
                      <p className="text-sm text-gray-600">Paiement mobile sécurisé</p>
                    </div>
                  </div>
                  <ul className="list-disc pl-6 space-y-2 text-sm">
                    <li>Validation par code PIN personnel</li>
                    <li>Confirmation SMS instantanée</li>
                    <li>Transactions traçables et annulables</li>
                    <li>Protection contre la fraude</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Server className="w-6 h-6 text-[#2d5a4d]" />
                Infrastructure Technique
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Notre infrastructure est conçue pour la sécurité :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Hébergement sur serveurs certifiés (ISO 27001)</li>
                  <li>Certificats SSL/TLS pour toutes les communications</li>
                  <li>Pare-feu et protection DDoS</li>
                  <li>Sauvegardes quotidiennes chiffrées</li>
                  <li>Tests de pénétration réguliers</li>
                  <li>Mises à jour de sécurité automatiques</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8 border-yellow-200 bg-yellow-50">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                Conseils de Sécurité
              </h2>
              <div className="space-y-4 text-gray-700">
                <p className="font-semibold">Pour protéger votre compte :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Utilisez un mot de passe unique et complexe (min. 8 caractères, 
                  lettres, chiffres, symboles)</li>
                  <li>Ne partagez jamais vos identifiants</li>
                  <li>Vérifiez l'URL du site (https://greenlink-agritech.com)</li>
                  <li>Déconnectez-vous après utilisation sur un ordinateur partagé</li>
                  <li>Signalez immédiatement toute activité suspecte</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Smartphone className="w-6 h-6 text-[#2d5a4d]" />
                Signaler un Problème
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Si vous suspectez une faille de sécurité ou une activité frauduleuse :
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-semibold text-red-800 mb-2">
                    Contactez immédiatement notre équipe de sécurité :
                  </p>
                  <p className="text-red-700">
                    Email : security@greenlink-agritech.com<br />
                    Urgences : +225 07 XX XX XX XX
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default SecuritePage;
