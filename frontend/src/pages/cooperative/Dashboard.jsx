import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { useOffline } from '../../context/OfflineContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { DashboardHeader } from './components/DashboardHeader';
import { KPIStrip } from './components/KPIStrip';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import { RecentMembersCard } from './components/RecentMembersCard';
import { ActivationWidget } from './components/ActivationWidget';
import { ParcelsSection } from './components/ParcelsSection';
import { FinancialCard } from './components/FinancialCard';
import { USSDPanel } from './components/USSDPanel';
import { AlertsBanner } from './components/AlertsBanner';
import { REDDWidget } from './components/REDDWidget';
import { SSRTEWidget } from './components/SSRTEWidget';
import { REDDEvolutionChart } from './components/REDDEvolutionChart';
import { SSRTETrendsChart } from './components/SSRTETrendsChart';
import { RiskByZoneChart } from './components/RiskByZoneChart';
import { PracticesDonutChart } from './components/PracticesDonutChart';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSimulator, setShowSimulator] = useState(false);
  const [activationStats, setActivationStats] = useState(null);
  const [sendingReminder, setSendingReminder] = useState(null);
  const [simulatorMembers, setSimulatorMembers] = useState([]);
  const [kpiData, setKpiData] = useState(null);
  const [chartData, setChartData] = useState(null);

  const loadDashboard = async () => {
    try {
      const data = await cooperativeApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      toast.error('Erreur lors du chargement du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadActivationStats = async () => {
    try {
      const stats = await cooperativeApi.getActivationStats();
      setActivationStats(stats);
    } catch (error) {
      console.error('Error fetching activation stats:', error);
    }
  };

  const loadKPIs = async () => {
    try {
      const data = await cooperativeApi.getDashboardKPIs();
      setKpiData(data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }
  };

  const loadCharts = async () => {
    try {
      const data = await cooperativeApi.getDashboardCharts();
      setChartData(data);
    } catch (error) {
      console.error('Error fetching charts:', error);
    }
  };

  const loadSimulatorMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/cooperative/members?limit=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorMembers((data.members || []).filter(m => m.phone_number));
      }
    } catch (error) {
      console.error('Error fetching members for simulator:', error);
    }
  };

  const handleSendReminder = async (memberId, memberName) => {
    setSendingReminder(memberId);
    try {
      await cooperativeApi.sendActivationReminder(memberId);
      toast.success(`Rappel envoye a ${memberName}`);
      loadActivationStats();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi du rappel');
    } finally {
      setSendingReminder(null);
    }
  };

  const handleToggleSimulator = () => {
    setShowSimulator(prev => {
      if (!prev && simulatorMembers.length === 0) loadSimulatorMembers();
      return !prev;
    });
  };

  useEffect(() => {
    loadDashboard();
    loadActivationStats();
    loadKPIs();
    loadCharts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" strokeWidth={1.5} />
          <p className="text-xs text-[#6B7280] font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  const { coop_info, members, parcelles, financial, recent_members } = dashboardData || {};
  const hasChartData = chartData && (chartData.redd_monthly?.some(m => m.visites > 0) || chartData.ssrte_monthly?.some(m => m.visites > 0));

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="cooperative-dashboard">
      <DashboardHeader coopInfo={coop_info} user={user} navigate={navigate} />
      <KPIStrip members={members} parcelles={parcelles} financial={financial} navigate={navigate} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
            {/* Durabilite & SSRTE/ICI KPI Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <REDDWidget redd={kpiData?.redd} />
              <SSRTEWidget ssrte={kpiData?.ssrte} ici={kpiData?.ici} />
            </div>

            {/* Charts Section */}
            {hasChartData && (
              <>
                <div className="pt-2">
                  <p className="text-[10px] tracking-[0.1em] uppercase font-bold text-[#9CA3AF] mb-4">Analyses & Tendances</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <REDDEvolutionChart data={chartData.redd_monthly} />
                  <SSRTETrendsChart data={chartData.ssrte_monthly} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <RiskByZoneChart data={chartData.risk_by_zone} />
                  <PracticesDonutChart practices={kpiData?.redd?.practices_adoption} />
                </div>
              </>
            )}

            <ActivationWidget
              activationStats={activationStats}
              sendingReminder={sendingReminder}
              handleSendReminder={handleSendReminder}
              navigate={navigate}
            />
            <ParcelsSection parcelles={parcelles} navigate={navigate} />
            <FinancialCard financial={financial} />
            <AlertsBanner pendingValidation={members?.pending_validation} navigate={navigate} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <QuickActionsPanel navigate={navigate} onToggleSimulator={handleToggleSimulator} />
            <RecentMembersCard
              recentMembers={recent_members}
              pendingValidation={members?.pending_validation}
              navigate={navigate}
            />
          </div>
        </div>

        {/* USSD Simulator - Full Width */}
        <div className="mt-6">
          <USSDPanel
            show={showSimulator}
            simulatorMembers={simulatorMembers}
            onClose={() => setShowSimulator(false)}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
