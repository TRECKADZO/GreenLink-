import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Leaf, Users, CreditCard, Shield, Smartphone, HelpCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const FAQPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [openItems, setOpenItems] = useState({});

  const categories = [
    { id: 'all', name: 'Toutes', icon: HelpCircle },
    { id: 'general', name: 'Général', icon: Leaf },
    { id: 'carbon', name: 'Crédits Carbone', icon: Leaf },
    { id: 'redd', name: 'REDD+', icon: Leaf },
    { id: 'coop', name: 'Coopératives', icon: Users },
    { id: 'pricing', name: 'Abonnements', icon: CreditCard },
    { id: 'security', name: 'Sécurité', icon: Shield },
    { id: 'mobile', name: 'App Mobile', icon: Smartphone },
  ];

  const faqs = [
    // Général
    {
      id: 1,
      category: 'general',
      question: "Qu'est-ce que GreenLink ?",
      answer: "GreenLink est une plateforme agritech qui connecte les producteurs de cacao de Côte d'Ivoire aux acheteurs internationaux, tout en permettant la génération et la vente de crédits carbone. Notre mission est de promouvoir une agriculture durable et d'améliorer les revenus des planteurs grâce aux pratiques agroforestières."
    },
    {
      id: 2,
      category: 'general',
      question: "Qui peut utiliser GreenLink ?",
      answer: "GreenLink est ouvert à plusieurs types d'utilisateurs :\n\n• **Producteurs** : Agriculteurs et planteurs de cacao\n• **Coopératives** : Organisations regroupant plusieurs producteurs\n• **Acheteurs** : Entreprises souhaitant acheter du cacao certifié\n• **Fournisseurs** : Vendeurs d'intrants agricoles\n• **Entreprises RSE** : Sociétés cherchant à compenser leur empreinte carbone"
    },
    {
      id: 3,
      category: 'general',
      question: "Comment créer un compte ?",
      answer: "Pour créer un compte :\n\n1. Cliquez sur 'Inscription' en haut de la page\n2. Choisissez votre type de profil (Producteur, Coopérative, Acheteur, etc.)\n3. Remplissez vos informations personnelles\n4. Acceptez les conditions d'utilisation\n5. Validez votre compte via le code reçu par SMS ou email\n\nLes producteurs et coopératives bénéficient d'un accès **gratuit à vie**."
    },
    
    // Crédits Carbone
    {
      id: 4,
      category: 'carbon',
      question: "Comment sont générés les crédits carbone ?",
      answer: "Les crédits carbone sont générés grâce aux pratiques agroforestières des planteurs :\n\n• **Arbres d'ombrage** : 48+ arbres/ha = ~4.8 tonnes CO2/ha/an\n• **Agriculture biologique** : Bonus de séquestration\n• **Résidus au sol** : Conservation du carbone\n• **Cultures de couverture** : Protection des sols\n\nChaque parcelle est vérifiée (GPS, drone, audit) avant la génération des crédits."
    },
    {
      id: 5,
      category: 'carbon',
      question: "Combien valent les crédits carbone ?",
      answer: "Les prix varient selon la qualité et l'acheteur :\n\n| Qualité | Prix USD/tonne |\n|---------|----------------|\n| Standard | 5-15 USD |\n| Vérifié (Verra) | 15-25 USD |\n| Premium (Gold Standard) | 25-40 USD |\n| Biochar amélioré | 40-60 USD |\n\nLe prix moyen actuel est d'environ **30 USD/tonne CO2**."
    },
    {
      id: 6,
      category: 'carbon',
      question: "Comment est répartie la vente des crédits carbone ?",
      answer: "Les revenus issus de la vente des credits carbone sont repartis de maniere equitable entre les differents acteurs de la chaine de valeur.\n\nLe montant exact de votre prime depend de votre score carbone et de la surface de vos parcelles. Utilisez le calculateur *144*99# pour estimer votre prime.\n\nPour toute question sur la repartition, contactez votre cooperative ou l'equipe GreenLink."
    },
    {
      id: 7,
      category: 'carbon',
      question: "Quelle prime carbone puis-je recevoir comme planteur ?",
      answer: "La prime carbone depend de vos pratiques agricoles et de votre score carbone (0 a 10).\n\n**Votre score determine le montant de votre prime :**\n- Score 5/10 (moyen) : ~44 FCFA/kg de cacao\n- Score 8/10 (bon) : ~69 FCFA/kg\n- Score 9.5/10 (excellent) : ~92 FCFA/kg\n\nPlus vos pratiques sont durables (arbres d'ombrage, pas de brulage, compost, agroforesterie), plus votre prime est elevee !\n\nUtilisez le calculateur *144*99# pour estimer votre prime."
    },
    {
      id: 8,
      category: 'carbon',
      question: "Les crédits carbone sont-ils certifiés ?",
      answer: "Oui, GreenLink travaille avec les standards internationaux reconnus :\n\n• **Verra VCS** (Verified Carbon Standard)\n• **Gold Standard** (pour les co-bénéfices sociaux)\n• **FCPF** (Forest Carbon Partnership Facility - Banque Mondiale)\n\nChaque crédit reçoit un numéro de série unique et est enregistré dans un registre international."
    },
    
    // Coopératives
    {
      id: 9,
      category: 'coop',
      question: "Quels avantages pour les coopératives ?",
      answer: "Les cooperatives beneficient de 6 mois d'essai gratuit avec acces Pro complet :\n\n\u2022 Dashboard complet avec analyse ARS 1000 (Bronze/Argent/Or)\n\u2022 Rapports REDD+ avances (emissions, agroforesterie, MRV)\n\u2022 Rapports detailles SSRTE (ICI)\n\u2022 Export PDF/Excel pret pour audits BMC et programmes REDD+\n\u2022 Alertes avancees (deforestation, brulage, SSRTE)\n\u2022 Gestion complete des membres et parcelles\n\u2022 Application mobile pour agents terrain\n\u2022 Support prioritaire"
    },
    {
      id: 10,
      category: 'coop',
      question: "Comment enregistrer ma coopérative ?",
      answer: "Pour enregistrer votre cooperative :\n\n1. Creez un compte en selectionnant 'Cooperative'\n2. Renseignez le nom officiel et le code de la cooperative\n3. Ajoutez vos coordonnees (email, telephone)\n4. Importez ou ajoutez manuellement vos membres\n5. Enregistrez les parcelles de chaque membre\n\nVotre essai gratuit de 6 mois avec acces Pro complet demarre immediatement."
    },
    {
      id: 11,
      category: 'coop',
      question: "Comment distribuer les primes carbone aux membres ?",
      answer: "La distribution se fait en quelques etapes :\n\n1. Accedez a 'Distributions' dans votre tableau de bord\n2. Selectionnez le lot de credits vendus\n3. Verifiez le calcul automatique par membre (au prorata des tonnes CO2)\n4. Validez la distribution\n5. Les membres recoivent une notification push\n6. Le paiement est effectue via Orange Money\n\nDes recus PDF sont generes automatiquement."
    },

    // REDD+
    {
      id: 21,
      category: 'redd',
      question: "Qu'est-ce que la Strategie Nationale REDD+ ?",
      answer: "La Strategie Nationale REDD+ de Cote d'Ivoire est un programme gouvernemental qui vise a reduire les emissions de gaz a effet de serre liees a la deforestation et a la degradation des forets.\n\nPour les cooperatives cacao, cela signifie :\n\u2022 Des opportunites de revenus via les credits carbone\n\u2022 Un acces aux Results-Based Payments (paiements bases sur les resultats)\n\u2022 Une tracabilite pour la conformite EUDR (zero-deforestation)\n\u2022 Des donnees pour le systeme MRV (Mesure, Reporting, Verification) national"
    },
    {
      id: 22,
      category: 'redd',
      question: "Comment GreenLink aide ma cooperative avec le REDD+ ?",
      answer: "GreenLink fournit tous les outils REDD+ dont votre cooperative a besoin :\n\n**Niveau Starter :**\n\u2022 Rapport REDD+ simplifie (nombre d'arbres, estimation carbone de base)\n\n**Niveau Pro :**\n\u2022 Estimation des reductions d'emissions\n\u2022 Suivi des pratiques agroforestieres\n\u2022 Donnees geolocalisees pour MRV national\n\u2022 Rapports zero-deforestation\n\u2022 Export PDF/Excel pour audits BMC et programmes juridictionnels (ex. Parc Tai)\n\n**Niveau Enterprise :**\n\u2022 Analyse carbone agregee pour Results-Based Payments\n\u2022 Formation agents terrain sur REDD+\n\u2022 Donnees pour programmes juridictionnels"
    },
    {
      id: 23,
      category: 'redd',
      question: "Qu'est-ce que le MRV et pourquoi est-ce important ?",
      answer: "Le MRV (Mesure, Reporting, Verification) est le systeme utilise par les programmes REDD+ pour mesurer et verifier les reductions d'emissions.\n\nGreenLink automatise la collecte des donnees MRV :\n\u2022 Geolocalisation des parcelles\n\u2022 Comptage des arbres d'ombrage\n\u2022 Suivi des pratiques agricoles\n\u2022 Estimation des stocks de carbone\n\u2022 Rapports conformes aux standards internationaux\n\nCes donnees permettent a votre cooperative d'acceder aux paiements carbone des programmes nationaux et internationaux."
    },
    {
      id: 24,
      category: 'redd',
      question: "Qu'est-ce que la conformite EUDR ?",
      answer: "L'EUDR (European Union Deforestation Regulation) exige que tout cacao exporte vers l'UE soit trace et certifie 'zero-deforestation'.\n\nGreenLink aide votre cooperative a se conformer :\n\u2022 Geolocalisation GPS de chaque parcelle\n\u2022 Verification automatique des zones forestieres protegees\n\u2022 Rapports de tracabilite par lot\n\u2022 Historique complet de la chaine d'approvisionnement\n\u2022 Export des donnees pour les certificateurs"
    },
    
    // Tarifs / Abonnements
    {
      id: 12,
      category: 'pricing',
      question: "Combien coûte GreenLink pour une cooperative ?",
      answer: "**6 mois d'essai gratuit offerts** avec acces Pro complet !\n\nApres l'essai, 3 niveaux d'abonnement :\n\n\u2022 **Starter** : 50 000 FCFA/mois (jusqu'a 400 membres)\n  Dashboard basique + ARS 1000 + REDD+ simplifie\n\n\u2022 **Pro** (recommande) : 120 000 FCFA/mois (jusqu'a 800 membres)\n  Dashboard complet + REDD+ avance + exports audits + support prioritaire\n\n\u2022 **Enterprise** : 250 000 FCFA/mois (membres illimites)\n  Tout Pro + API + formation agents REDD+ + analyse carbone agregee\n\n**Producteurs** : acces gratuit a vie.\n**Acheteurs/Fournisseurs/RSE** : sur devis (15 jours d'essai gratuit)."
    },
    {
      id: 13,
      category: 'pricing',
      question: "Comment fonctionne l'essai gratuit de 6 mois ?",
      answer: "Des l'activation de votre compte cooperative :\n\n1. Vous beneficiez de 6 mois d'acces complet au niveau Pro\n2. Vous recevez des notifications 30, 15 et 7 jours avant la fin de l'essai\n3. A la fin de l'essai, vous choisissez votre abonnement (Starter, Pro ou Enterprise)\n4. Sans choix explicite, votre cooperative passe automatiquement en mode Pro facturable\n5. Annulation possible a tout moment avant la fin de l'essai\n\nAucune carte bancaire requise pour commencer."
    },
    {
      id: 14,
      category: 'pricing',
      question: "Pourquoi est-ce gratuit pour les producteurs ?",
      answer: "Notre modele economique repose sur les credits carbone et les abonnements cooperatives. Les producteurs sont au coeur de notre ecosysteme - sans eux, pas de credits carbone !\n\nEn leur offrant un acces gratuit, nous :\n\u2022 Maximisons l'adoption de pratiques durables\n\u2022 Augmentons le volume de credits carbone\n\u2022 Creons un impact social positif\n\u2022 Renforcons les chaines d'approvisionnement\n\nLes cooperatives beneficient de 6 mois gratuits pour evaluer la valeur de GreenLink."
    },
    
    // Sécurité
    {
      id: 15,
      category: 'security',
      question: "Mes données sont-elles sécurisées ?",
      answer: "Oui, nous prenons la sécurité très au sérieux :\n\n• **Chiffrement SSL/TLS** pour toutes les communications\n• **Mots de passe hashés** avec bcrypt\n• **Authentification JWT** avec expiration\n• **Rate limiting** contre les attaques brute force\n• **Base de données MongoDB Atlas** sécurisée\n• Conformité RGPD"
    },
    {
      id: 16,
      category: 'security',
      question: "Comment récupérer mon mot de passe ?",
      answer: "Si vous avez oublié votre mot de passe :\n\n1. Cliquez sur 'Mot de passe oublié' sur la page de connexion\n2. Entrez votre email ou numéro de téléphone\n3. Recevez un code de vérification à 6 chiffres\n4. Entrez le code et créez un nouveau mot de passe\n\nLe code expire après 15 minutes pour votre sécurité."
    },
    {
      id: 17,
      category: 'security',
      question: "Comment protéger mon compte ?",
      answer: "Conseils pour sécuriser votre compte :\n\n• Utilisez un mot de passe fort (8+ caractères, chiffres, symboles)\n• Ne partagez jamais vos identifiants\n• Déconnectez-vous sur les appareils partagés\n• Vérifiez l'URL du site (https://...)\n• Activez les notifications de connexion\n• Contactez-nous immédiatement en cas d'activité suspecte"
    },
    
    // Application Mobile
    {
      id: 18,
      category: 'mobile',
      question: "Comment télécharger l'application mobile ?",
      answer: "L'application GreenLink Farmer est disponible pour Android :\n\n1. Téléchargez l'APK depuis notre site ou le lien fourni\n2. Autorisez l'installation depuis 'Sources inconnues' dans vos paramètres\n3. Installez l'application\n4. Connectez-vous avec vos identifiants GreenLink\n\n*Version iOS disponible prochainement sur l'App Store.*"
    },
    {
      id: 19,
      category: 'mobile',
      question: "Quelles fonctionnalités sont disponibles sur mobile ?",
      answer: "L'application mobile offre :\n\n**Pour les producteurs :**\n• Consultation du profil et des parcelles\n• Suivi des crédits carbone\n• Historique des paiements\n• Notifications push en temps réel\n\n**Pour les coopératives (agents terrain) :**\n• Gestion des membres\n• Enregistrement des parcelles\n• Génération de rapports\n• Distribution des primes"
    },
    {
      id: 20,
      category: 'mobile',
      question: "Les notifications push sont-elles gratuites ?",
      answer: "Oui, les notifications push sont **entièrement gratuites** !\n\nTypes de notifications :\n• Prime carbone disponible\n• Confirmation de paiement\n• Rappels hebdomadaires\n• Annonces de la coopérative\n• Mises à jour des parcelles\n\nVous pouvez personnaliser vos préférences dans les paramètres de l'application."
    },
  ];

  const toggleItem = (id) => {
    setOpenItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    const matchesSearch = searchQuery === '' || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#2d5a4d] to-[#1a4038] text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Foire Aux Questions
          </h1>
          <p className="text-xl text-green-200 mb-8">
            Trouvez rapidement les réponses à vos questions
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#2d5a4d] text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* FAQ Items */}
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-12">
              <HelpCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">Aucune question trouvée pour votre recherche.</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-4 text-[#2d5a4d] hover:underline"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            filteredFaqs.map(faq => (
              <div 
                key={faq.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => toggleItem(faq.id)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                  {openItems[faq.id] ? (
                    <ChevronUp className="w-5 h-5 text-[#2d5a4d] flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  )}
                </button>
                
                {openItems[faq.id] && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <div className="pt-4 text-gray-600 whitespace-pre-line leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Contact Section */}
        <div className="max-w-4xl mx-auto mt-12 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 text-center border border-green-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Vous n'avez pas trouvé votre réponse ?
          </h2>
          <p className="text-gray-600 mb-6">
            Notre équipe est disponible pour vous aider du lundi au vendredi, de 8h à 18h.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="mailto:support@greenlink.ci"
              className="inline-flex items-center gap-2 bg-[#2d5a4d] text-white px-6 py-3 rounded-lg hover:bg-[#1a4038] transition-colors"
            >
              <span>📧</span> support@greenlink.ci
            </a>
            <a 
              href="tel:+2250787761023"
              className="inline-flex items-center gap-2 bg-white text-[#2d5a4d] px-6 py-3 rounded-lg border-2 border-[#2d5a4d] hover:bg-[#2d5a4d] hover:text-white transition-colors"
            >
              <span>📞</span> +225 07 87 76 10 23
            </a>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default FAQPage;
