import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../services/analyticsApi';
import { tokenService } from '../../services/tokenService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Loader2, Globe, Leaf, Users, Building2, TreePine, Scale, Sparkles, MapPin, Download } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatNumber = (n) => {
  if (n === null || n === undefined) return '-';
  if (typeof n !== 'number') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('fr-FR');
};

const SDGIcon = ({ sdg }) => {
  const iconMap = { 1: Users, 5: Sparkles, 8: Scale, 12: Leaf, 13: Globe, 15: TreePine };
  const Icon = iconMap[sdg] || Leaf;
  return <Icon className="w-5 h-5 text-white" strokeWidth={2} />;
};

const HeadlineCard = ({ label, value, unit, icon: Icon, color }) => (
  <Card className="border-l-4" style={{ borderLeftColor: color }}>
    <CardContent className="p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-4 h-4" style={{ color }} strokeWidth={2} />
        </div>
        <span className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">
        {formatNumber(value)}
        {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
      </p>
    </CardContent>
  </Card>
);

const SDGGoalCard = ({ goal }) => (
  <Card className="overflow-hidden" data-testid={`sdg-${goal.sdg}`}>
    <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: goal.color }}>
      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-lg">
        {goal.sdg}
      </div>
      <SDGIcon sdg={goal.sdg} />
      <span className="text-white font-semibold text-sm flex-1">{goal.name}</span>
    </div>
    <CardContent className="p-4 space-y-2">
      {goal.metrics.map((m) => (
        <div key={m.label} className="flex items-baseline justify-between border-b border-gray-100 pb-1.5 last:border-0">
          <span className="text-xs text-gray-600">{m.label}</span>
          <span className="text-sm font-bold text-gray-900">
            {typeof m.value === 'number' ? m.value.toLocaleString('fr-FR') : m.value}
            {m.unit && <span className="text-[10px] text-gray-500 ml-1">{m.unit}</span>}
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
);

const ComplianceBar = ({ label, value, weight }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-gray-600">{label} <span className="text-gray-400">({weight}%)</span></span>
      <span className="font-semibold text-gray-900">{value}%</span>
    </div>
    <Progress value={value} className="h-2" />
  </div>
);

const InstitutionalImpactTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await analyticsApi.getInstitutionalMetrics();
        setData(res);
      } catch {
        toast.error('Erreur lors du chargement des métriques institutionnelles');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCSV = () => {
    if (!data?.regional?.rows) return;
    const rows = data.regional.rows;
    const headers = ['Région', 'Coopératives', 'Membres', 'Parcelles', 'Hectares', 'CO2 (t)', 'Score carbone', 'Tonnes produites'];
    const csv = [
      headers.join(';'),
      ...rows.map(r => [r.region, r.cooperatives, r.members, r.parcels, r.hectares, r.co2_tonnes, r.avg_carbon_score, r.tonnes_produites].join(';'))
    ].join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenlink_impact_regional_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV régional téléchargé');
  };

  const exportPDF = async () => {
    try {
      toast.info('Génération du rapport PDF...');
      const token = tokenService.getToken();
      const res = await fetch(`${API_URL}/api/admin/analytics/institutional-report-pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `greenlink_impact_institutionnel_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Rapport PDF institutionnel téléchargé');
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-gray-500 py-20">Aucune donnée disponible</p>;
  }

  const { headline = {}, sdg = {}, eudr = {}, cfi = {}, regional = {} } = data;
  const filteredRows = (regional.rows || []).filter(r =>
    !regionFilter || r.region.toLowerCase().includes(regionFilter.toLowerCase())
  );

  return (
    <div className="space-y-6" data-testid="institutional-tab">
      {/* Headline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-gray-900">Impact Institutionnel</h2>
            <Badge variant="outline" className="text-[10px]">ONU · UE · Banque Mondiale · CFI · ICI</Badge>
          </div>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-md hover:from-emerald-700 hover:to-emerald-800 font-medium shadow-sm"
            data-testid="export-institutional-pdf"
          >
            <Download className="w-4 h-4" /> Rapport PDF Institutionnel
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <HeadlineCard label="Bénéficiaires" value={headline.beneficiaires_total} icon={Users} color="#E5243B" />
          <HeadlineCard label="Coopératives" value={headline.cooperatives} icon={Building2} color="#BF8B2E" />
          <HeadlineCard label="Hectares suivis" value={headline.hectares_suivis} unit="ha" icon={MapPin} color="#3F7E44" />
          <HeadlineCard label="CO₂ séquestré" value={headline.co2_sequestre_tonnes} unit="t" icon={Leaf} color="#56C02B" />
          <HeadlineCard label="Primes redistr." value={headline.primes_redistribuees_xof} unit="FCFA" icon={Scale} color="#A21942" />
          <HeadlineCard label="EUDR" value={headline.eudr_compliance_rate} unit="%" icon={Globe} color="#1A3622" />
          <HeadlineCard label="Régions" value={headline.regions_couvertes} icon={MapPin} color="#D4AF37" />
        </div>
      </div>

      {/* SDG / ODD */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3" data-testid="sdg-heading">
          🎯 Alignement ODD — Objectifs de Développement Durable ONU
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(sdg.goals || []).map(g => <SDGGoalCard key={g.sdg} goal={g} />)}
        </div>
      </div>

      {/* EUDR + CFI side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card data-testid="eudr-compliance-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                Conformité EUDR (UE 2023/1115)
              </CardTitle>
              <Badge className={
                eudr.eudr_compliance_rate >= 80 ? 'bg-emerald-100 text-emerald-800' :
                eudr.eudr_compliance_rate >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }>
                {eudr.eudr_compliance_rate}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {(eudr.risk_dimensions || []).map(d => (
              <ComplianceBar key={d.name} label={d.name} value={d.score} weight={d.weight} />
            ))}
            <div className="pt-2 border-t grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-blue-700">{eudr.geo_polygon_count || 0}</p>
                <p className="text-[10px] text-gray-500">Polygones GPS</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-700">{eudr.geo_point_count || 0}</p>
                <p className="text-[10px] text-gray-500">Points GPS</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-700">{eudr.geo_none_count || 0}</p>
                <p className="text-[10px] text-gray-500">Sans GPS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="cfi-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TreePine className="w-4 h-4 text-green-700" />
              Cocoa & Forests Initiative (CFI)
            </CardTitle>
            <p className="text-xs text-gray-500">Engagement sectoriel cacao-forêts (CI/Ghana)</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <ComplianceBar label="Parcelles cartographiées" value={cfi.parcels_mapped_pct} weight={50} />
            <ComplianceBar label="Adoption agroforesterie" value={cfi.agroforestry_adoption_pct} weight={50} />
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
              <p className="text-xs text-green-900 font-semibold">✓ Engagement zéro-déforestation actif</p>
              <p className="text-[10px] text-green-700 mt-1">Objectif ombrage ARS 1000 : {cfi.shade_trees_target_per_ha} arbres/ha</p>
              <p className="text-[10px] text-green-700">Visites SSRTE : {cfi.monitoring_visits}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Regional breakdown */}
      <Card data-testid="regional-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#D4AF37]" />
              KPIs par région ({regional.total_regions_covered} régions couvertes)
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">Métriques pour ministères, collectivités, bailleurs</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filtrer région..."
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="px-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:border-emerald-500"
              data-testid="region-filter-input"
            />
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
              data-testid="export-regional-csv"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">Région</th>
                <th className="px-4 py-2 text-right">Coop.</th>
                <th className="px-4 py-2 text-right">Membres</th>
                <th className="px-4 py-2 text-right">Parcelles</th>
                <th className="px-4 py-2 text-right">Hectares</th>
                <th className="px-4 py-2 text-right">CO₂ (t)</th>
                <th className="px-4 py-2 text-right">Score /10</th>
                <th className="px-4 py-2 text-right">Production (t)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(row => (
                <tr key={row.region} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{row.region}</td>
                  <td className="px-4 py-2 text-right">{row.cooperatives || 0}</td>
                  <td className="px-4 py-2 text-right">{row.members || 0}</td>
                  <td className="px-4 py-2 text-right">{row.parcels}</td>
                  <td className="px-4 py-2 text-right font-semibold">{row.hectares}</td>
                  <td className="px-4 py-2 text-right text-emerald-700 font-semibold">{row.co2_tonnes}</td>
                  <td className="px-4 py-2 text-right">
                    <Badge className={
                      row.avg_carbon_score >= 6 ? 'bg-emerald-100 text-emerald-800' :
                      row.avg_carbon_score >= 4 ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                    }>
                      {row.avg_carbon_score}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-right">{row.tonnes_produites}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-400">Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <p className="text-[10px] text-gray-400 text-center pt-2">
        Sources : ONU (SDG), UE (Règlement 2023/1115 EUDR), World Cocoa Foundation (CFI), ICI Côte d'Ivoire, ARS 1000-1 · Données agrégées {new Date(data.generated_at).toLocaleString('fr-FR')}
      </p>
    </div>
  );
};

export default InstitutionalImpactTab;
