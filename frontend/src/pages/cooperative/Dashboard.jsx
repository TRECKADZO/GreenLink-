import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cooperativeApi } from '../../services/cooperativeApi';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { DashboardHeader } from './components/DashboardHeader';
import { KPIStrip } from './components/KPIStrip';
import { QuickActionsPanel } from './components/QuickActionsPanel';
import { RecentMembersCard } from './components/RecentMembersCard';
import { ActivationWidget } from './components/ActivationWidget';
import { ParcelsSection } from './components/ParcelsSection';
import { FinancialCard } from './components/FinancialCard';
import { CommissionCardNew } from './components/CommissionCardNew';
import { USSDPanel } from './components/USSDPanel';
import { AlertsBanner } from './components/AlertsBanner';

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

  const { coop_info, members, parcelles, lots, financial, recent_members, agents } = dashboardData || {};

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="cooperative-dashboard">
      <DashboardHeader coopInfo={coop_info} user={user} navigate={navigate} />
      <KPIStrip members={members} parcelles={parcelles} financial={financial} navigate={navigate} />

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-6">
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
            <CommissionCardNew coopInfo={coop_info} onUpdated={loadDashboard} />
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
