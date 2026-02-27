import React from 'react';
import { Card } from '../components/ui/card';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { 
  FileText, 
  Shield, 
  Users, 
  CreditCard,
  Scale,
  AlertCircle
} from 'lucide-react';

const ConditionsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <FileText className="w-16 h-16 text-[#2d5a4d] mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Conditions Générales d'Utilisation
            </h1>
            <p className="text-gray-600">
              Dernière mise à jour : Février 2026
            </p>
          </div>

          <div className="space-y-8">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Scale className="w-6 h-6 text-[#2d5a4d]" />
                1. Objet
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation 
                de la plateforme GreenLink Agritech, opérée par GreenLink CI SARL. En accédant à notre 
                plateforme, vous acceptez ces conditions dans leur intégralité.
              </p>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-6 h-6 text-[#2d5a4d]" />
                2. Inscription et Comptes
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>2.1 Éligibilité :</strong> Pour créer un compte, vous devez être majeur et 
                  capable juridiquement. Les entreprises doivent être légalement enregistrées en 
                  Côte d'Ivoire ou dans un pays de l'UEMOA.
                </p>
                <p>
                  <strong>2.2 Types de comptes :</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Producteur/Agriculteur :</strong> Agriculteurs enregistrés souhaitant 
                  déclarer leurs parcelles et bénéficier des primes carbone.</li>
                  <li><strong>Acheteur Responsable :</strong> Entreprises achetant des matières 
                  premières agricoles traçables.</li>
                  <li><strong>Entreprise RSE :</strong> Sociétés souhaitant acheter des crédits 
                  carbone pour leur compensation carbone.</li>
                  <li><strong>Fournisseur :</strong> Distributeurs d'intrants agricoles souhaitant 
                  vendre sur notre marketplace.</li>
                </ul>
                <p>
                  <strong>2.3 Vérification :</strong> GreenLink se réserve le droit de vérifier 
                  l'identité des utilisateurs et de suspendre tout compte suspect.
                </p>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-[#2d5a4d]" />
                3. Services et Transactions
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>3.1 Marketplace Intrants :</strong> Les fournisseurs proposent des produits 
                  agricoles. GreenLink agit en tant qu'intermédiaire et n'est pas responsable de la 
                  qualité des produits vendus.
                </p>
                <p>
                  <strong>3.2 Crédits Carbone :</strong> Les crédits carbone vendus sur la plateforme 
                  sont certifiés selon les standards internationaux (Verra, Gold Standard, Plan Vivo). 
                  GreenLink garantit l'authenticité des certificats.
                </p>
                <p>
                  <strong>3.3 Paiements :</strong> Les paiements peuvent être effectués par Orange Money 
                  ou paiement à la livraison. GreenLink utilise des prestataires de paiement sécurisés.
                </p>
                <p>
                  <strong>3.4 Frais :</strong> GreenLink peut prélever une commission sur les 
                  transactions. Les frais applicables sont communiqués avant la validation de toute commande.
                </p>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-[#2d5a4d]" />
                4. Responsabilités
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>4.1 GreenLink s'engage à :</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Assurer la disponibilité de la plateforme (hors maintenance programmée)</li>
                  <li>Protéger les données personnelles conformément à notre politique de confidentialité</li>
                  <li>Vérifier l'authenticité des crédits carbone vendus</li>
                </ul>
                <p>
                  <strong>4.2 L'utilisateur s'engage à :</strong>
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Fournir des informations exactes lors de l'inscription</li>
                  <li>Ne pas utiliser la plateforme à des fins illégales</li>
                  <li>Respecter les droits des autres utilisateurs</li>
                </ul>
              </div>
            </Card>

            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-[#2d5a4d]" />
                5. Litiges et Juridiction
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Les présentes CGU sont régies par le droit ivoirien. En cas de litige, les parties 
                  s'engagent à rechercher une solution amiable. À défaut, les tribunaux d'Abidjan 
                  seront compétents.
                </p>
                <p>
                  <strong>Contact :</strong><br />
                  GreenLink CI SARL<br />
                  Abidjan, Cocody<br />
                  Email : contact@greenlink-agritech.com
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

export default ConditionsPage;
