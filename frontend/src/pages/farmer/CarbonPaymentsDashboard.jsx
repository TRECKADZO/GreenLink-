import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Leaf, 
  Wallet, 
  TrendingUp, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  TreeDeciduous,
  Coins
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CarbonPaymentsDashboard = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [requestingPayment, setRequestingPayment] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/carbon-payments/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Erreur lors du chargement');
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPayment = async () => {
    setRequestingPayment(true);
    try {
      const response = await fetch(`${API_URL}/api/carbon-payments/request-payment`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        alert('Votre demande de paiement a été envoyée à votre coopérative.');
        fetchDashboardData();
      }
    } catch (err) {
      alert('Erreur lors de la demande');
    } finally {
      setRequestingPayment(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount || 0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'scheduled': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Payé';
      case 'pending': return 'En attente';
      case 'processing': return 'En cours';
      case 'scheduled': return 'Programmé';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" data-testid="loading-state">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50" data-testid="error-state">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-800 font-medium">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const { carbon_score, earnings, monthly_history, recent_payments, distribution_model, upcoming_payments } = data || {};

  return (
    <div className="min-h-screen bg-gray-50 pb-8" data-testid="carbon-payments-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <Coins className="w-8 h-8" />
                Mes Revenus Carbone
              </h1>
              <p className="text-emerald-100 mt-1">
                Suivez vos primes carbone et versements en temps réel
              </p>
            </div>
            <button 
              onClick={fetchDashboardData}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
              data-testid="refresh-btn"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <Wallet className="w-4 h-4" />
                Total Reçu
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(earnings?.total_received_xof)} <span className="text-sm font-normal">XOF</span>
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <Clock className="w-4 h-4" />
                En Attente
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(earnings?.pending_xof)} <span className="text-sm font-normal">XOF</span>
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <TrendingUp className="w-4 h-4" />
                Projection Annuelle
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(earnings?.annual_projection_xof)} <span className="text-sm font-normal">XOF</span>
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <div className="flex items-center gap-2 text-emerald-200 text-sm">
                <Leaf className="w-4 h-4" />
                Prime/kg Cacao
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(earnings?.premium_per_kg_xof)} <span className="text-sm font-normal">XOF</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['overview', 'history', 'projections'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab === 'overview' && 'Vue d\'ensemble'}
              {tab === 'history' && 'Historique'}
              {tab === 'projections' && 'Projections'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Carbon Score Card */}
            <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="carbon-score-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <TreeDeciduous className="w-5 h-5 text-emerald-600" />
                  Mon Score Carbone
                </h2>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                  <p className="text-3xl font-bold text-emerald-700">
                    {carbon_score?.total_tonnes_co2_year || 0}
                  </p>
                  <p className="text-sm text-emerald-600 mt-1">tonnes CO2/an</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-3xl font-bold text-blue-700">
                    {carbon_score?.total_hectares || 0}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">hectares</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-3xl font-bold text-purple-700">
                    {carbon_score?.parcels_count || 0}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">parcelles</p>
                </div>
              </div>

              {/* Parcels List */}
              {carbon_score?.parcels?.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Détail par parcelle</h3>
                  {carbon_score.parcels.map((parcel, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">{parcel.name}</p>
                        <p className="text-sm text-gray-500">{parcel.area_hectares} ha</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-emerald-700">{parcel.tonnes_co2_year} t CO2</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          parcel.quality === 'premium' ? 'bg-amber-100 text-amber-700' :
                          parcel.quality === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {parcel.quality}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly History Chart */}
            <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="monthly-history">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Historique des 12 derniers mois
              </h2>
              
              <div className="flex items-end justify-between gap-1 h-40">
                {monthly_history?.map((month, idx) => {
                  const maxAmount = Math.max(...(monthly_history?.map(m => m.amount_xof) || [1]));
                  const height = month.amount_xof > 0 ? (month.amount_xof / maxAmount) * 100 : 5;
                  
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div 
                        className={`w-full rounded-t transition-all ${
                          month.amount_xof > 0 ? 'bg-emerald-500' : 'bg-gray-200'
                        }`}
                        style={{ height: `${height}%` }}
                        title={`${month.month}: ${formatCurrency(month.amount_xof)} XOF`}
                      />
                      <span className="text-xs text-gray-500 mt-2 rotate-45 origin-left">
                        {month.month.slice(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Request Payment Button */}
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
              <h3 className="font-semibold mb-2">Demander un versement</h3>
              <p className="text-sm text-amber-100 mb-4">
                Vos primes seront versées via votre coopérative sur Orange Money
              </p>
              <button
                onClick={handleRequestPayment}
                disabled={requestingPayment}
                className="w-full py-3 bg-white text-amber-600 font-medium rounded-xl hover:bg-amber-50 transition disabled:opacity-50"
                data-testid="request-payment-btn"
              >
                {requestingPayment ? 'Envoi en cours...' : 'Demander le paiement'}
              </button>
            </div>

            {/* Distribution Model */}
            <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="distribution-model">
              <h3 className="font-semibold text-gray-800 mb-4">Répartition de la Prime Carbone</h3>
              
              {/* Prix de vente aux entreprises RSE */}
              <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl mb-4 border border-emerald-200">
                <p className="text-xs text-emerald-600 font-medium mb-1">Prix de vente aux entreprises RSE</p>
                <p className="text-2xl font-bold text-emerald-700">
                  {distribution_model?.price_per_tonne_xof ? formatCurrency(distribution_model.price_per_tonne_xof) : '15 000'} <span className="text-sm font-normal">XOF/tonne CO2</span>
                </p>
              </div>

              <div className="space-y-2">
                {/* Revenu brut */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-xs text-gray-500">Revenu brut annuel</span>
                  <span className="text-sm font-bold text-gray-700">{formatCurrency(distribution_model?.gross_annual_xof || 0)} XOF</span>
                </div>
                {/* 30% frais */}
                <div className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg">
                  <span className="text-xs text-red-600">Frais de service ({distribution_model?.fees_rate || '30%'})</span>
                  <span className="text-sm font-semibold text-red-600">-{formatCurrency(distribution_model?.fees_annual_xof || 0)} XOF</span>
                </div>
                {/* Net */}
                <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg">
                  <span className="text-xs text-slate-600 font-medium">Net à distribuer</span>
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(distribution_model?.net_annual_xof || 0)} XOF</span>
                </div>
                <hr className="border-gray-200 my-1" />
                {/* 70% agriculteurs */}
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-xs text-emerald-700 font-medium">Votre part ({distribution_model?.farmer_share_rate || '70%'})</span>
                  <span className="text-sm font-bold text-emerald-700">{formatCurrency(distribution_model?.farmer_annual_xof || 0)} XOF</span>
                </div>
                {/* 25% GreenLink */}
                <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg">
                  <span className="text-xs text-blue-600">GreenLink ({distribution_model?.greenlink_share_rate || '25%'})</span>
                  <span className="text-sm font-semibold text-blue-600">{formatCurrency(distribution_model?.greenlink_annual_xof || 0)} XOF</span>
                </div>
                {/* 5% coopérative */}
                <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg">
                  <span className="text-xs text-amber-600">Coopérative ({distribution_model?.coop_share_rate || '5%'})</span>
                  <span className="text-sm font-semibold text-amber-600">{formatCurrency(distribution_model?.coop_annual_xof || 0)} XOF</span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 text-center">Versement : {distribution_model?.payment_frequency || 'Trimestriel'} via Coopérative</p>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="recent-payments">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-emerald-600" />
                Derniers versements
              </h3>
              
              {recent_payments?.length > 0 ? (
                <div className="space-y-3">
                  {recent_payments.slice(0, 5).map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-800">
                          {formatCurrency(payment.amount_xof)} XOF
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('fr-FR') : 'En attente'}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Wallet className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucun versement pour le moment</p>
                </div>
              )}
            </div>

            {/* Upcoming Payments */}
            {upcoming_payments?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="upcoming-payments">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Prochains versements
                </h3>
                
                <div className="space-y-3">
                  {upcoming_payments.map((payment, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <p className="font-medium text-purple-800">
                          {formatCurrency(payment.amount_xof)} XOF
                        </p>
                        <p className="text-xs text-purple-600">
                          {payment.scheduled_date ? new Date(payment.scheduled_date).toLocaleDateString('fr-FR') : 'À venir'}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                        {getStatusLabel(payment.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarbonPaymentsDashboard;
