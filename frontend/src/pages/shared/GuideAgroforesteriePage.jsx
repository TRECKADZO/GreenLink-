import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { GuideEspeces, CalendrierPepiniere, DiagnosticParcelle, ProtectionEnvironnementale } from './AgroforesterieModules';
import { TreePine, BookOpen, Clock, Shield, ArrowLeft, Search, Leaf } from 'lucide-react';

const TABS = [
  { id: 'guide', label: 'Guide Espèces', icon: BookOpen },
  { id: 'pepiniere', label: 'Pépinière', icon: Clock },
  { id: 'diagnostic', label: 'Diagnostic', icon: Search },
  { id: 'protection', label: 'Protection Env.', icon: Shield },
];

export default function GuideAgroforesteriePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('guide');
  const isCoop = user?.user_type === 'cooperative';
  const farmerId = user?.user_type === 'farmer' || user?.user_type === 'planteur' || user?.user_type === 'producteur'
    ? user?.id || user?._id : null;

  return (
    <div className="min-h-screen bg-gray-50" data-testid="guide-agroforesterie-page">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-green-600 to-emerald-500 flex items-center justify-center">
              <TreePine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Agroforesterie</h1>
              <p className="text-[10px] text-gray-500">Lignes directrices ARS 1000 - Cacaoculture CI</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide pb-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                }`}
                data-testid={`agro-tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {activeTab === 'guide' && <GuideEspeces />}
        {activeTab === 'pepiniere' && <CalendrierPepiniere />}
        {activeTab === 'diagnostic' && <DiagnosticParcelle farmerId={farmerId} isCooperative={isCoop} />}
        {activeTab === 'protection' && <ProtectionEnvironnementale />}
      </div>
    </div>
  );
}
