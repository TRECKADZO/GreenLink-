import React from 'react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  Lock, 
  Eye, 
  Database, 
  Share2,
  UserCheck,
  Mail,
  Shield
} from 'lucide-react';

const ConfidentialitePage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Lock className="w-16 h-16 text-[#2d5a4d] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Politique de Confidentialité
            </h1>
            <p className="text-gray-600">
              Dernière mise à jour : Février 2026
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Eye className="w-6 h-6 text-[#2d5a4d]" />
                1. Données Collectées
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>GreenLink collecte les données suivantes :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Données d'identification :</strong> Nom, prénom, email, numéro de téléphone</li>
                  <li><strong>Données professionnelles :</strong> Type d'activité, nom de l'entreprise, 
                  volume d'achat/vente</li>
                  <li><strong>Données agricoles :</strong> Localisation des parcelles, type de cultures, 
                  pratiques agricoles</li>
                  <li><strong>Données de transaction :</strong> Historique des achats, méthodes de paiement</li>
                  <li><strong>Données techniques :</strong> Adresse IP, type de navigateur, cookies</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Database className="w-6 h-6 text-[#2d5a4d]" />
                2. Utilisation des Données
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Vos données sont utilisées pour :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Créer et gérer votre compte utilisateur</li>
                  <li>Traiter vos commandes et paiements</li>
                  <li>Calculer les scores carbone et primes associées</li>
                  <li>Générer des rapports de traçabilité (EUDR)</li>
                  <li>Améliorer nos services et personnaliser votre expérience</li>
                  <li>Vous envoyer des notifications importantes (SMS, email)</li>
                  <li>Respecter nos obligations légales</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Share2 className="w-6 h-6 text-[#2d5a4d]" />
                3. Partage des Données
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Vos données peuvent être partagées avec :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Partenaires de paiement :</strong> Orange Money pour le traitement des 
                  transactions</li>
                  <li><strong>Acheteurs :</strong> Données de traçabilité pour la conformité EUDR 
                  (avec votre consentement)</li>
                  <li><strong>Organismes de certification :</strong> Verra, Gold Standard pour la 
                  vérification des crédits carbone</li>
                  <li><strong>Autorités légales :</strong> Sur demande officielle uniquement</li>
                </ul>
                <p className="mt-4 font-semibold">
                  GreenLink ne vend jamais vos données personnelles à des tiers.
                </p>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#2d5a4d]" />
                4. Protection des Données
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>GreenLink met en œuvre les mesures de sécurité suivantes :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Chiffrement SSL/TLS pour toutes les communications</li>
                  <li>Hashage sécurisé des mots de passe (bcrypt)</li>
                  <li>Authentification par token JWT</li>
                  <li>Accès restreint aux données sensibles</li>
                  <li>Sauvegardes régulières et sécurisées</li>
                  <li>Surveillance continue des systèmes</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-[#2d5a4d]" />
                5. Vos Droits
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>Conformément à la loi ivoirienne et aux standards internationaux, vous disposez de :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
                  <li><strong>Droit de rectification :</strong> Corriger vos informations</li>
                  <li><strong>Droit de suppression :</strong> Demander l'effacement de vos données</li>
                  <li><strong>Droit d'opposition :</strong> Refuser certains traitements</li>
                  <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format standard</li>
                </ul>
                <p className="mt-4">
                  Pour exercer ces droits, contactez-nous à : <strong>privacy@greenlink-agritech.com</strong>
                </p>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Mail className="w-6 h-6 text-[#2d5a4d]" />
                6. Contact
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Pour toute question relative à cette politique de confidentialité :
                </p>
                <p>
                  <strong>Délégué à la Protection des Données</strong><br />
                  GreenLink CI SARL<br />
                  Abidjan, Cocody<br />
                  Email : privacy@greenlink-agritech.com<br />
                  Téléphone : +225 07 XX XX XX XX
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ConfidentialitePage;
