import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cooperativeApi } from '../../services/cooperativeApi';
import { 
  FileText, ChevronLeft, Download, CheckCircle,
  AlertTriangle, MapPin, Leaf, Users, Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { toast } from 'sonner';

const ReportsPage = () => {
  const navigate = useNavigate();
  const [eudrReport, setEudrReport] = useState(null);
  const [villageStats, setVillageStats] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const [exportingPDF, setExportingPDF] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true);
      await cooperativeApi.downloadEUDRPdf();
      toast.success('Rapport PDF téléchargé avec succès');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCarbonPDF = async () => {
    try {
      setExportingPDF(true);
      await cooperativeApi.downloadCarbonPdf();
      toast.success('Rapport Carbone PDF téléchargé avec succès');
    } catch (error) {
      console.error('Carbon PDF export error:', error);
      toast.error('Erreur lors du téléchargement du PDF Carbone');
    } finally {
      setExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    // Generate CSV from current data
    if (!eudrReport) return;
    
    try {
      setExportingCSV(true);
      const csvData = [
        ['Rapport EUDR - ' + cooperative?.name],
        ['Date', new Date().toLocaleDateString('fr-FR')],
        [''],
        ['CONFORMITE'],
        ['Taux de conformité', compliance?.compliance_rate + '%'],
        ['Taux de géolocalisation', compliance?.geolocation_rate + '%'],
        ['Parcelles géolocalisées', compliance?.geolocated_parcels],
        ['Total parcelles', compliance?.total_parcels],
        ['Alertes déforestation', compliance?.deforestation_alerts],
        [''],
        ['STATISTIQUES'],
        ['Total membres', statistics?.total_members],
        ['Total hectares', statistics?.total_hectares],
        ['CO2 capturé (tonnes)', statistics?.total_co2_tonnes],
        ['Score carbone moyen', statistics?.average_carbon_score]
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rapport_eudr_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Rapport CSV téléchargé avec succès');
    } catch (error) {
      console.error('CSV export error:', error);
      toast.error('Erreur lors de l\'export CSV');
    } finally {
      setExportingCSV(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const { cooperative, compliance, statistics } = eudrReport || {};

  return (
    <div className="min-h-screen bg-gray-50" data-testid="reports-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/cooperative/dashboard')}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Rapports & Conformité EUDR</h1>
                <p className="text-sm text-gray-500">
                  Rapport généré le {new Date(eudrReport?.report_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF}>
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cooperative Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Informations Coopérative
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-500">Nom</p>
                <p className="font-semibold text-lg">{cooperative?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Code</p>
                <p className="font-semibold text-lg">{cooperative?.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Certifications</p>
                <div className="flex gap-2 mt-1">
                  {cooperative?.certifications?.map((cert, i) => (
                    <Badge key={i} variant="outline" className="text-green-700">
                      {cert}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Conformité EUDR
              </CardTitle>
              <CardDescription>
                Statut de conformité selon la réglementation européenne
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Compliance Rate */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Taux de conformité</span>
                    <span className="text-sm font-bold text-green-600">
                      {compliance?.compliance_rate || 0}%
                    </span>
                  </div>
                  <Progress value={compliance?.compliance_rate || 0} className="h-3" />
                </div>

                {/* Geolocation Rate */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Géolocalisation</span>
                    <span className="text-sm font-bold">
                      {compliance?.geolocation_rate || 0}%
                    </span>
                  </div>
                  <Progress value={compliance?.geolocation_rate || 0} className="h-3" />
                  <p className="text-xs text-gray-500 mt-1">
                    {compliance?.geolocated_parcels || 0} / {compliance?.total_parcels || 0} parcelles géolocalisées
                  </p>
                </div>

                {/* Deforestation Alerts */}
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <div className="flex items-center gap-3">
                    {compliance?.deforestation_alerts === 0 ? (
                      <>
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">Aucune alerte déforestation</p>
                          <p className="text-sm text-green-600">
                            Toutes les parcelles sont conformes
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-6 w-6 text-amber-600" />
                        <div>
                          <p className="font-medium text-amber-800">
                            {compliance?.deforestation_alerts} alerte(s) détectée(s)
                          </p>
                          <p className="text-sm text-amber-600">
                            Vérification requise
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Statistiques Globales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold text-blue-900">{statistics?.total_members || 0}</p>
                  <p className="text-sm text-blue-600">Membres</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <MapPin className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold text-green-900">{statistics?.total_hectares || 0}</p>
                  <p className="text-sm text-green-600">Hectares</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg text-center">
                  <Leaf className="h-8 w-8 mx-auto text-emerald-600 mb-2" />
                  <p className="text-2xl font-bold text-emerald-900">{statistics?.total_co2_tonnes || 0}</p>
                  <p className="text-sm text-emerald-600">Tonnes CO₂</p>
                </div>
                <div className="p-4 bg-teal-50 rounded-lg text-center">
                  <CheckCircle className="h-8 w-8 mx-auto text-teal-600 mb-2" />
                  <p className="text-2xl font-bold text-teal-900">{statistics?.average_carbon_score || 0}/10</p>
                  <p className="text-sm text-teal-600">Score Moyen</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Village Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par Village</CardTitle>
            <CardDescription>
              Distribution des membres selon les villages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {villageStats.length > 0 ? (
              <div className="space-y-3">
                {villageStats.map((village, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{village.village || 'Non spécifié'}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-bold">{village.members_count}</span>
                        <span className="text-gray-500 ml-1">membres</span>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {village.active_count} actifs
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune donnée de village disponible</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Formats d'export disponibles</p>
              <p className="mt-1">
                Les rapports peuvent être exportés en PDF (pour présentation) ou CSV (pour analyse). 
                Ces documents sont conformes aux exigences de la réglementation EUDR pour la traçabilité 
                des matières premières.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
