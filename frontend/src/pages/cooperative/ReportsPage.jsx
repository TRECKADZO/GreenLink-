import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  FileText, ChevronLeft, Download, CheckCircle, XCircle,
  AlertTriangle, MapPin, Leaf, Users, Globe, Shield, TrendingUp,
  Eye, ArrowRight, Clock, Scale, BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const RiskBadge = ({ level }) => {
  const config = {
    faible: { label: 'Faible', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    moyen: { label: 'Moyen', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
    eleve: { label: 'Eleve', cls: 'bg-red-100 text-red-800 border-red-300' },
    standard: { label: 'Standard', cls: 'bg-blue-100 text-blue-800 border-blue-300' },
  };
  const c = config[level] || config.standard;
  return <Badge className={`${c.cls} border font-semibold`}>{c.label}</Badge>;
};

const ScoreCircle = ({ score, size = 'lg', label }) => {
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const radius = size === 'lg' ? 54 : 36;
  const strokeWidth = size === 'lg' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const svgSize = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center">
      <svg width={svgSize} height={svgSize} className="transform -rotate-90">
        <circle cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
        <circle cx={radius + strokeWidth} cy={radius + strokeWidth} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" 
        style={{ width: svgSize, height: svgSize }}>
        <span className={`font-bold ${size === 'lg' ? 'text-3xl' : 'text-lg'}`} style={{ color }}>
          {score}%
        </span>
      </div>
      {label && <p className="text-xs text-gray-500 mt-1 text-center">{label}</p>}
    </div>
  );
};

const StatusIcon = ({ status }) => {
  if (status === 'conforme') return <CheckCircle className="h-4 w-4 text-emerald-600" />;
  return <AlertTriangle className="h-4 w-4 text-amber-500" />;
};

const ReportsPage = () => {
  const navigate = useNavigate();
  const [eudrReport, setEudrReport] = useState(null);
  const [villageStats, setVillageStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [report, villages] = await Promise.all([
          cooperativeApi.getEUDRReport(),
          cooperativeApi.getVillageStats()
        ]);
        setEudrReport(report);
        setVillageStats(villages);
      } catch (error) {
        console.error('Error fetching reports:', error);
        toast.error('Erreur lors du chargement des rapports');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await cooperativeApi.downloadEUDRPdf();
      toast.success('Rapport PDF EUDR telecharge');
    } catch (error) {
      toast.error('Erreur lors du telechargement du PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCarbonPDF = async () => {
    try {
      setExportingPDF(true);
      await cooperativeApi.downloadCarbonPdf();
      toast.success('Rapport Carbone PDF telecharge');
    } catch (error) {
      toast.error('Erreur lors du telechargement du PDF Carbone');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    if (!eudrReport) return;
    try {
      setExportingCSV(true);
      const { cooperative, compliance, statistics, risk_assessment, esg_indicators, due_diligence, cutoff_date } = eudrReport;
      const csvData = [
        ['RAPPORT EUDR - ' + cooperative?.name],
        ['Reference', 'Reglement (UE) 2023/1115'],
        ['Date', new Date().toLocaleDateString('fr-FR')],
        [''],
        ['DILIGENCE RAISONNEE'],
        ['Score conformite', due_diligence?.compliance_score + '%'],
        ['Niveau de risque', due_diligence?.niveau_risque],
        [''],
        ['GEOLOCALISATION'],
        ['Parcelles geolocalisees', compliance?.geolocated_parcels + '/' + compliance?.total_parcels],
        ['Taux geolocalisation', compliance?.geolocation_rate + '%'],
        ['Polygones GPS', compliance?.geo_polygon_count],
        ['Points GPS', compliance?.geo_point_count],
        ['Sans GPS', compliance?.geo_none_count],
        [''],
        ['EVALUATION DES RISQUES'],
        ...((risk_assessment?.dimensions || []).map(d => [d.name, d.score + '% (poids ' + d.weight + '%)'])),
        [''],
        ['DATE DE REFERENCE (31/12/2020)'],
        ['Avant date ref', cutoff_date?.parcels_before_cutoff],
        ['Apres date ref', cutoff_date?.parcels_after_cutoff],
        ['Sans date', cutoff_date?.parcels_no_date],
        [''],
        ['ESG - ENVIRONNEMENT'],
        ['CO2 capture (tonnes)', esg_indicators?.environmental?.co2_total],
        ['Score carbone moyen', esg_indicators?.environmental?.score_carbone_moyen + '/10'],
        ['Surface totale (ha)', esg_indicators?.environmental?.superficie_totale],
        [''],
        ['ESG - SOCIAL'],
        ['Membres actifs', esg_indicators?.social?.active_members],
        ['Femmes', esg_indicators?.social?.women_count + ' (' + esg_indicators?.social?.women_rate + '%)'],
        ['Taux sans travail enfants', esg_indicators?.social?.child_labor_free_rate + '%'],
        ['Visites SSRTE', esg_indicators?.social?.ssrte_visits],
        ['Profils ICI', esg_indicators?.social?.ici_profiles],
      ];
      const csvContent = csvData.map(row => row.join(';')).join('\n');
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_eudr_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Rapport CSV telecharge');
    } catch (error) {
      toast.error("Erreur lors de l'export CSV");
    } finally {
      setExportingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const { cooperative, compliance, statistics, due_diligence, risk_assessment, traceability, esg_indicators, cutoff_date } = eudrReport || {};

  return (
    <div className="min-h-screen bg-gray-50" data-testid="reports-page">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-600" />
                  Conformite EUDR
                </h1>
                <p className="text-sm text-gray-500">
                  Reglement (UE) 2023/1115 | {new Date(eudrReport?.report_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exportingCSV} data-testid="export-csv-btn">
                <Download className="h-4 w-4 mr-1" />
                {exportingCSV ? 'Export...' : 'CSV'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCarbonPDF} disabled={exportingPDF} data-testid="export-carbon-pdf-btn">
                <Leaf className="h-4 w-4 mr-1" /> Carbone PDF
              </Button>
              <Button size="sm" onClick={handleExportPDF} disabled={exportingPDF} data-testid="export-eudr-pdf-btn"
                className="bg-emerald-600 hover:bg-emerald-700">
                <FileText className="h-4 w-4 mr-1" />
                {exportingPDF ? '...' : 'EUDR PDF'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* 1. Score Global + Due Diligence */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white" data-testid="dds-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Scale className="h-5 w-5 text-emerald-600" />
                Diligence Raisonnee
              </CardTitle>
              <CardDescription>Declaration DDS - Art. 4</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4 relative">
                <ScoreCircle score={due_diligence?.compliance_score || 0} size="lg" />
              </div>
              <div className="space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Niveau de risque</span>
                  <RiskBadge level={due_diligence?.niveau_risque} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Statut DDS</span>
                  <Badge variant={due_diligence?.dds_status === 'actif' ? 'default' : 'secondary'}
                    className={due_diligence?.dds_status === 'actif' ? 'bg-emerald-600' : ''}>
                    {due_diligence?.dds_status === 'actif' ? 'Actif' : 'A completer'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pays risque</span>
                  <RiskBadge level={risk_assessment?.country_risk} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cooperative Info + Traceability */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                Identite & Tracabilite
              </CardTitle>
              <CardDescription>Chaine d'approvisionnement - Art. 9</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Cooperative</p>
                  <p className="font-semibold">{cooperative?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Code</p>
                  <p className="font-semibold">{cooperative?.code || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Commodite</p>
                  <p className="font-semibold text-sm">{cooperative?.commodity || 'Cacao'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Code HS</p>
                  <p className="font-semibold text-sm">{cooperative?.hs_code || '1801'}</p>
                </div>
              </div>
              {/* Traceability Chain */}
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg overflow-x-auto">
                {traceability?.chain?.map((step, i) => (
                  <React.Fragment key={i}>
                    <div className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                      step.status === 'actif' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-100 border-gray-200'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        step.status === 'actif' ? 'bg-emerald-600 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>{step.step}</div>
                      <div>
                        <p className="text-xs font-semibold">{step.actor}</p>
                        <p className="text-xs text-gray-500">{step.name || `${step.count} acteur(s)`}</p>
                      </div>
                    </div>
                    {i < traceability.chain.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              {/* Certifications */}
              <div className="flex flex-wrap gap-2 mt-3">
                {cooperative?.certifications?.length > 0 ? cooperative.certifications.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-emerald-700 border-emerald-300 bg-emerald-50">{c}</Badge>
                )) : (
                  <span className="text-sm text-gray-400">Aucune certification declaree</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 2. Risk Assessment Matrix */}
        <Card data-testid="risk-assessment-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              Evaluation des Risques
            </CardTitle>
            <CardDescription>Matrice d'evaluation multi-dimensionnelle - Art. 10</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risk_assessment?.dimensions?.map((dim, i) => (
                <div key={i} className="flex items-center gap-3">
                  <StatusIcon status={dim.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{dim.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">poids {dim.weight}%</span>
                        <span className={`text-sm font-bold ${
                          dim.score >= 80 ? 'text-emerald-600' : dim.score >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>{dim.score}%</span>
                      </div>
                    </div>
                    <Progress value={dim.score} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">
              {risk_assessment?.country_note}
            </p>
          </CardContent>
        </Card>

        {/* 3. Geolocation + Cut-off Date */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card data-testid="geolocation-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Geolocalisation des Parcelles
              </CardTitle>
              <CardDescription>Conformite Art. 9(1)(d) - coordonnees GPS</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <ScoreCircle score={compliance?.geolocation_rate || 0} size="sm" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <span className="text-sm">Polygones GPS</span>
                    <span className="ml-auto font-bold text-sm">{compliance?.geo_polygon_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <span className="text-sm">Points GPS</span>
                    <span className="ml-auto font-bold text-sm">{compliance?.geo_point_count || 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full" />
                    <span className="text-sm">Sans GPS</span>
                    <span className="ml-auto font-bold text-sm">{compliance?.geo_none_count || 0}</span>
                  </div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  {compliance?.deforestation_alerts === 0 ? (
                    <><CheckCircle className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Zero deforestation</span></>
                  ) : (
                    <><AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">{compliance?.deforestation_alerts} alerte(s)</span></>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="cutoff-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-600" />
                Date de Reference
              </CardTitle>
              <CardDescription>Conformite Art. 2(13) - 31 decembre 2020</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-violet-50 border border-violet-200 mb-4">
                <p className="text-xs text-violet-600 uppercase tracking-wide font-semibold">Date de reference EUDR</p>
                <p className="text-2xl font-bold text-violet-900 mt-1">31 decembre 2020</p>
                <p className="text-xs text-violet-500 mt-1">Aucune deforestation apres cette date</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" /> Avant date ref.
                  </span>
                  <span className="font-bold">{cutoff_date?.parcels_before_cutoff || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" /> Apres date ref.
                  </span>
                  <span className="font-bold">{cutoff_date?.parcels_after_cutoff || 0}</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-gray-400" /> A verifier (sans date)
                  </span>
                  <span className="font-bold">{cutoff_date?.parcels_no_date || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. ESG Indicators */}
        <Card data-testid="esg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600" />
              Indicateurs ESG
            </CardTitle>
            <CardDescription>Environnement, Social, Gouvernance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Environmental */}
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Leaf className="h-3.5 w-3.5" /> Environnement
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CO2 capture</span>
                    <span className="font-bold text-emerald-700">{esg_indicators?.environmental?.co2_total || 0}t</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Score carbone</span>
                    <span className="font-bold text-emerald-700">{esg_indicators?.environmental?.score_carbone_moyen || 0}/10</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Surface</span>
                    <span className="font-bold text-emerald-700">{esg_indicators?.environmental?.superficie_totale || 0} ha</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Zero deforestation</span>
                    {esg_indicators?.environmental?.deforestation_free ? 
                      <CheckCircle className="h-4 w-4 text-emerald-600" /> :
                      <XCircle className="h-4 w-4 text-red-500" />}
                  </div>
                </div>
              </div>
              {/* Social */}
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Social
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Membres actifs</span>
                    <span className="font-bold text-blue-700">{esg_indicators?.social?.active_members || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Femmes</span>
                    <span className="font-bold text-blue-700">{esg_indicators?.social?.women_count || 0} ({esg_indicators?.social?.women_rate || 0}%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Sans travail enfants</span>
                    <span className="font-bold text-blue-700">{esg_indicators?.social?.child_labor_free_rate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Visites SSRTE</span>
                    <span className="font-bold text-blue-700">{esg_indicators?.social?.ssrte_visits || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Profils ICI</span>
                    <span className="font-bold text-blue-700">{esg_indicators?.social?.ici_profiles || 0}</span>
                  </div>
                </div>
              </div>
              {/* Governance */}
              <div className="p-4 rounded-lg bg-violet-50 border border-violet-200">
                <p className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-3 flex items-center gap-1">
                  <Shield className="h-3.5 w-3.5" /> Gouvernance
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Score conformite</span>
                    <span className="font-bold text-violet-700">{esg_indicators?.governance?.compliance_score || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Audit terrain</span>
                    <span className="font-bold text-violet-700">{esg_indicators?.governance?.audit_coverage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Couverture ICI</span>
                    <span className="font-bold text-violet-700">{esg_indicators?.governance?.ici_coverage || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Certifications</span>
                    <span className="font-bold text-violet-700">{esg_indicators?.governance?.certifications?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Stats + Villages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Statistiques Globales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <Users className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                  <p className="text-xl font-bold text-blue-900">{statistics?.total_members || 0}</p>
                  <p className="text-xs text-blue-600">Membres</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <MapPin className="h-6 w-6 mx-auto text-green-600 mb-1" />
                  <p className="text-xl font-bold text-green-900">{statistics?.superficie_totale || 0}</p>
                  <p className="text-xs text-green-600">Hectares</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <Leaf className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                  <p className="text-xl font-bold text-emerald-900">{statistics?.co2_total || 0}</p>
                  <p className="text-xs text-emerald-600">Tonnes CO2</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 mx-auto text-teal-600 mb-1" />
                  <p className="text-xl font-bold text-teal-900">{statistics?.score_carbone_moyen || 0}/10</p>
                  <p className="text-xs text-teal-600">Score Moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Repartition par Village</CardTitle>
            </CardHeader>
            <CardContent>
              {villageStats.length > 0 ? (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {villageStats.map((v, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm font-medium">{v.village || 'Non specifie'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-bold">{v.members_count}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-emerald-600">{v.active_count} actifs</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-400">
                  <MapPin className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Aucune donnee village</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-slate-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-slate-600">
              <p className="font-semibold mb-1">Reglement (UE) 2023/1115 - Deforestation</p>
              <p>Ce rapport couvre les obligations des operateurs et negociants au titre du reglement europeen sur la deforestation. 
                 Il integre les dimensions de diligence raisonnee (Art. 4-11), tracabilite (Art. 9), geolocalisation (Art. 9.1.d), 
                 evaluation des risques (Art. 10) et indicateurs ESG pour une conformite complete.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
