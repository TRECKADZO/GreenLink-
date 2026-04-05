import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { offlineCooperativeApi as cooperativeApi } from '../../services/offlineCooperativeApi';
import { 
  Upload, ChevronLeft, FileText, CheckCircle,
  AlertCircle, Download, Users, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';

const ImportMembersPage = () => {
  const navigate = useNavigate();
  const [csvData, setCsvData] = useState('');
  const [parsedMembers, setParsedMembers] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);

  const sampleCSV = `nom_complet,telephone,village,cni
Kouassi Yao Jean,+2250701234567,Gagnoa Centre,CI-2020-123456
Adjoua Marie,+2250709876543,Oumé,
Koffi Amenan,+2250705551234,Lakota,CI-2019-789012
Tra Bi Emmanuel,+2250707778888,Issia,CI-2021-456789`;

  const parseCSV = (text) => {
    setParseErrors([]);
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      setParseErrors(['Le fichier doit contenir au moins une ligne d\'en-tête et une ligne de données']);
      return;
    }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const requiredHeaders = ['nom_complet', 'telephone', 'village'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h) && !headers.includes(h.replace('_', '')));
    
    if (missingHeaders.length > 0) {
      setParseErrors([`Colonnes manquantes: ${missingHeaders.join(', ')}`]);
      return;
    }

    const members = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 3 || !values[0]) continue;

      const member = {
        full_name: values[headers.indexOf('nom_complet')] || values[0],
        phone_number: values[headers.indexOf('telephone')] || values[1],
        village: values[headers.indexOf('village')] || values[2],
        cni_number: values[headers.indexOf('cni')] || values[3] || null,
        consent_given: true
      };

      // Validation
      if (!member.full_name || member.full_name.length < 3) {
        errors.push(`Ligne ${i + 1}: Nom invalide`);
        continue;
      }
      if (!member.phone_number || member.phone_number.length < 10) {
        errors.push(`Ligne ${i + 1}: Téléphone invalide`);
        continue;
      }
      if (!member.village) {
        errors.push(`Ligne ${i + 1}: Village manquant`);
        continue;
      }

      members.push(member);
    }

    setParsedMembers(members);
    setParseErrors(errors);
    
    if (members.length > 0) {
      toast.success(`${members.length} membres prêts à importer`);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      setCsvData(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedMembers.length === 0) {
      toast.error('Aucun membre à importer');
      return;
    }

    setImporting(true);
    try {
      const response = await cooperativeApi.importMembersCSV(parsedMembers);
      setResult(response);
      toast.success(`${response.imported} membres importés avec succès`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modele_import_membres.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="import-members-page">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/cooperative/members')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Import CSV de Membres</h1>
              <p className="text-sm text-gray-500">Importez plusieurs membres en une seule fois</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Instructions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Format du fichier CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Votre fichier CSV doit contenir les colonnes suivantes:
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline">nom_complet *</Badge>
              <Badge variant="outline">telephone *</Badge>
              <Badge variant="outline">village *</Badge>
              <Badge variant="secondary">cni (optionnel)</Badge>
            </div>
            <Button variant="outline" onClick={downloadSample}>
              <Download className="h-4 w-4 mr-2" />
              Télécharger le modèle CSV
            </Button>
          </CardContent>
        </Card>

        {/* Upload Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>1. Charger le fichier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-600">Cliquez pour sélectionner un fichier CSV</span>
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
            </div>
            
            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Ou collez directement les données CSV:</p>
              <Textarea
                placeholder={sampleCSV}
                value={csvData}
                onChange={(e) => {
                  setCsvData(e.target.value);
                  if (e.target.value.length > 20) {
                    parseCSV(e.target.value);
                  }
                }}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Parse Errors */}
        {parseErrors.length > 0 && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">Attention</p>
                  <ul className="text-sm text-amber-700 mt-1 list-disc list-inside">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {parsedMembers.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                2. Aperçu ({parsedMembers.length} membres)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Nom</th>
                      <th className="text-left p-2">Téléphone</th>
                      <th className="text-left p-2">Village</th>
                      <th className="text-left p-2">CNI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedMembers.slice(0, 10).map((member, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">{member.full_name}</td>
                        <td className="p-2">{member.phone_number}</td>
                        <td className="p-2">{member.village}</td>
                        <td className="p-2">{member.cni_number || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedMembers.length > 10 && (
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    ... et {parsedMembers.length - 10} autres
                  </p>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleImport} 
                  disabled={importing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>Importation...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Importer {parsedMembers.length} membres
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Import terminé!</h3>
                  <p className="text-green-700">{result.imported} membres importés avec succès</p>
                </div>
              </div>
              
              {result.errors && result.errors.length > 0 && (
                <div className="mt-4 p-3 bg-white rounded border border-amber-200">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    {result.total_errors} erreur(s):
                  </p>
                  <ul className="text-sm text-amber-700 list-disc list-inside">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="mt-4">
                <Button onClick={() => navigate('/cooperative/members')}>
                  Voir les membres
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImportMembersPage;
