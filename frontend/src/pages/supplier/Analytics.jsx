import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  TrendingUp, Package, Users, DollarSign, Download, RefreshCw,
  ShoppingCart, ArrowUpRight, ArrowDownRight, BarChart3, PieChart,
  Calendar, FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const SupplierAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [exporting, setExporting] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return { Authorization: `Bearer ${token}` };
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/analytics/supplier/dashboard?period=${period}`,
        { headers: getAuthHeaders() }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const exportData = async (type) => {
    try {
      setExporting(true);
      const response = await axios.get(
        `${API_URL}/api/analytics/export/${type}`,
        { 
          headers: getAuthHeaders(),
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_greenlink_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendUp }) => (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${trendUp ? 'bg-green-100' : 'bg-blue-100'}`}>
          <Icon className={`w-6 h-6 ${trendUp ? 'text-green-600' : 'text-blue-600'}`} />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center mt-3 text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
          {trend}% vs période précédente
        </div>
      )}
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-[#2d5a4d] animate-spin" />
      </div>
    );
  }

  const { summary, order_status, products, customers, trends } = analytics || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500">Vue d'ensemble de vos performances</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {['7d', '30d', '90d', '1y'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-[#2d5a4d] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {p === '7d' ? '7 jours' : p === '30d' ? '30 jours' : p === '90d' ? '90 jours' : '1 an'}
              </button>
            ))}
          </div>
          
          {/* Export Buttons */}
          <Button variant="outline" onClick={() => exportData('orders')} disabled={exporting}>
            <Download className="w-4 h-4 mr-2" />
            Export Commandes
          </Button>
          <Button variant="outline" onClick={() => exportData('products')} disabled={exporting}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Export Produits
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Chiffre d'affaires"
          value={`${(summary?.total_revenue || 0).toLocaleString()} FCFA`}
          subtitle={`${(summary?.completed_revenue || 0).toLocaleString()} FCFA livrées`}
          icon={DollarSign}
          trendUp={true}
        />
        <StatCard
          title="Commandes"
          value={summary?.total_orders || 0}
          subtitle={`${summary?.completed_orders || 0} livrées`}
          icon={ShoppingCart}
          trendUp={true}
        />
        <StatCard
          title="Panier moyen"
          value={`${(summary?.avg_order_value || 0).toLocaleString()} FCFA`}
          subtitle={`${summary?.avg_items_per_order || 0} articles/commande`}
          icon={TrendingUp}
          trendUp={true}
        />
        <StatCard
          title="Clients"
          value={customers?.unique_buyers || 0}
          subtitle={`${customers?.retention_rate || 0}% taux de rétention`}
          icon={Users}
          trendUp={(customers?.retention_rate || 0) > 20}
        />
      </div>

      {/* Order Status & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-[#2d5a4d]" />
            <h2 className="text-lg font-semibold">Statut des commandes</h2>
          </div>
          <div className="space-y-3">
            {Object.entries(order_status || {}).map(([status, count]) => {
              const total = Object.values(order_status || {}).reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? (count / total * 100).toFixed(1) : 0;
              const statusLabels = {
                pending: { label: 'En attente', color: 'bg-yellow-500' },
                confirmed: { label: 'Confirmées', color: 'bg-blue-500' },
                processing: { label: 'En préparation', color: 'bg-indigo-500' },
                shipped: { label: 'Expédiées', color: 'bg-purple-500' },
                delivered: { label: 'Livrées', color: 'bg-green-500' },
                cancelled: { label: 'Annulées', color: 'bg-red-500' }
              };
              const { label, color } = statusLabels[status] || { label: status, color: 'bg-gray-500' };
              
              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-[#2d5a4d]" />
            <h2 className="text-lg font-semibold">Top Produits</h2>
          </div>
          <div className="space-y-4">
            {(products?.top_performers || []).map((product, index) => (
              <div key={product.id} className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">
                    {product.orders_count} commandes · {product.revenue.toLocaleString()} FCFA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Stock</p>
                  <p className={`font-medium ${product.stock < 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {product.stock}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          {/* Low Stock Alert */}
          {products?.low_stock?.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ {products.low_stock.length} produit(s) en stock faible
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#2d5a4d]" />
          <h2 className="text-lg font-semibold">Évolution des ventes</h2>
        </div>
        <div className="h-64 flex items-end gap-2">
          {(trends?.daily_sales || []).slice(-14).map((day, index) => {
            const maxRevenue = Math.max(...(trends?.daily_sales || []).map(d => d.revenue));
            const height = maxRevenue > 0 ? (day.revenue / maxRevenue * 100) : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-[#2d5a4d] rounded-t-sm hover:bg-[#1a4038] transition-colors cursor-pointer relative group"
                  style={{ height: `${Math.max(height, 2)}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    {day.revenue.toLocaleString()} FCFA
                    <br />
                    {day.orders} commandes
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 transform -rotate-45 origin-top-left">
                  {new Date(day.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Customer Insights */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#2d5a4d]" />
          <h2 className="text-lg font-semibold">Insights Clients</h2>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-[#2d5a4d]">{customers?.unique_buyers || 0}</p>
            <p className="text-gray-500">Clients uniques</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#2d5a4d]">{customers?.repeat_buyers || 0}</p>
            <p className="text-gray-500">Clients fidèles</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-[#2d5a4d]">{customers?.retention_rate || 0}%</p>
            <p className="text-gray-500">Taux de rétention</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SupplierAnalytics;
