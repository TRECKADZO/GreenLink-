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
    { id: 'coop', name: 'Coopératives', icon: Users },
    { id: 'pricing', name: 'Tarifs', icon: CreditCard },
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
      answer: "La répartition du revenu brut est transparente :\n\n• **27%** - Coûts (audits Verra, vérifications terrain, buffer permanence)\n• **~55%** - Redistribué aux **planteurs** (75% du net)\n• **~15%** - Marge **GreenLink** (20% du net)\n• **~3%** - Part des **coopératives** (5% du net)\n\n**Total = 100%** du revenu brut"
    },
    {
      id: 7,
      category: 'carbon',
      question: "Quelle prime carbone puis-je recevoir comme planteur ?",
      answer: "La prime carbone dépend de vos pratiques :\n\n• **Faible ombrage** (≤20 arbres/ha) : ~80 XOF/kg de cacao\n• **Ombrage moyen** (21-40 arbres/ha) : ~120 XOF/kg\n• **Bon ombrage** (41-60 arbres/ha) : ~160 XOF/kg\n• **Optimal** (48+ arbres/ha + pratiques bio) : ~180 XOF/kg\n\nPlus vous plantez d'arbres, plus votre prime est élevée !"
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
      answer: "Les coopératives bénéficient de nombreux avantages **gratuits** :\n\n• Gestion complète des membres et parcelles\n• Génération automatique des rapports EUDR\n• Distribution des primes carbone aux membres\n• Génération de reçus PDF pour chaque paiement\n• Notifications push aux membres\n• Application mobile dédiée pour les agents de terrain\n• Support prioritaire"
    },
    {
      id: 10,
      category: 'coop',
      question: "Comment enregistrer ma coopérative ?",
      answer: "Pour enregistrer votre coopérative :\n\n1. Créez un compte en sélectionnant 'Coopérative'\n2. Renseignez le nom officiel et le code de la coopérative\n3. Ajoutez vos coordonnées (email, téléphone)\n4. Importez ou ajoutez manuellement vos membres\n5. Enregistrez les parcelles de chaque membre\n\nL'accès est **100% gratuit** pour les coopératives."
    },
    {
      id: 11,
      category: 'coop',
      question: "Comment distribuer les primes carbone aux membres ?",
      answer: "La distribution se fait en quelques étapes :\n\n1. Accédez à 'Distributions' dans votre tableau de bord\n2. Sélectionnez le lot de crédits vendus\n3. Vérifiez le calcul automatique par membre (au prorata des tonnes CO2)\n4. Validez la distribution\n5. Les membres reçoivent une notification push\n6. Le paiement est effectué via Orange Money\n\nDes reçus PDF sont générés automatiquement."
    },
    
    // Tarifs
    {
      id: 12,
      category: 'pricing',
      question: "Combien coûte GreenLink ?",
      answer: "**Gratuit à vie** pour :\n• Producteurs\n• Coopératives\n\n**Plans payants avec 15 jours d'essai gratuit** :\n• Acheteurs : 49,000 XOF/mois\n• Fournisseurs : 29,000 XOF/mois + 5% commission\n• Entreprises RSE : Sur devis\n\nTous les plans payants incluent une période d'essai sans engagement."
    },
    {
      id: 13,
      category: 'pricing',
      question: "Pourquoi est-ce gratuit pour les producteurs ?",
      answer: "Notre modèle économique repose sur les crédits carbone et les abonnements des acheteurs professionnels. Les producteurs et coopératives sont au cœur de notre écosystème - sans eux, pas de crédits carbone !\n\nEn leur offrant un accès gratuit, nous :\n• Maximisons l'adoption de pratiques durables\n• Augmentons le volume de crédits carbone\n• Créons un impact social positif\n• Renforçons les chaînes d'approvisionnement"
    },
    {
      id: 14,
      category: 'pricing',
      question: "Comment fonctionne la période d'essai ?",
      answer: "Pour les plans payants (Acheteurs, Fournisseurs, RSE) :\n\n• **15 jours gratuits** avec accès à toutes les fonctionnalités\n• Aucune carte bancaire requise pour démarrer\n• Rappel avant la fin de l'essai\n• Possibilité d'annuler à tout moment\n• Après l'essai : paiement via Orange Money ou carte"
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
