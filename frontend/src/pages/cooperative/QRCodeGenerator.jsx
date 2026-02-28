import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import Navbar from '../../components/Navbar';
import { toast } from 'sonner';
import { 
  QrCode, Download, Printer, Search, Users, 
  RefreshCcw, Grid3X3, List, ChevronLeft, FileDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const QRCodeGenerator = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedMembers, setSelectedMembers] = useState([]);
  const printRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !['cooperative', 'admin', 'super_admin'].includes(user.user_type)) {
      toast.error('Accès réservé aux coopératives');
      navigate('/');
      return;
    }
    loadMembers();
  }, [user, authLoading, navigate]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/qrcode/cooperative/members?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to load members');
      
      const data = await response.json();
      setMembers(data.members || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Erreur lors du chargement des membres');
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = members.filter(m => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.phone?.includes(searchTerm) ||
    m.village?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleMemberSelection = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const selectAll = () => {
    if (selectedMembers.length === filteredMembers.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(filteredMembers.map(m => m.id));
    }
  };

  const downloadSelectedQRCodes = async () => {
    const selected = members.filter(m => selectedMembers.includes(m.id));
    if (selected.length === 0) {
      toast.error('Sélectionnez au moins un membre');
      return;
    }

    // Create a zip-like download by opening print dialog
    printQRCodes(selected);
  };

  const exportPDFCards = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/farmer-cards/export-pdf?cards_per_page=6`;
      
      // Si des membres sont sélectionnés, les exporter spécifiquement
      if (selectedMembers.length > 0) {
        url += `&farmer_ids=${selectedMembers.join(',')}`;
      }
      
      toast.info('Génération du PDF en cours...');
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Export failed');
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `cartes_producteurs_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success('PDF des cartes téléchargé!');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erreur lors de l\'export PDF');
    }
  };

  const printQRCodes = (membersToPrint = null) => {
    const toPrint = membersToPrint || members.filter(m => selectedMembers.includes(m.id));
    if (toPrint.length === 0) {
      toPrint.push(...members);
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - Producteurs GreenLink</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #0f766e;
          }
          .header h1 {
            color: #0f766e;
            margin: 0;
          }
          .header p {
            color: #666;
            margin: 5px 0 0;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
          }
          .card {
            border: 2px solid #0f766e;
            border-radius: 12px;
            padding: 15px;
            text-align: center;
            page-break-inside: avoid;
          }
          .card img {
            width: 120px;
            height: 120px;
          }
          .card .name {
            font-weight: bold;
            font-size: 14px;
            margin: 10px 0 5px;
            color: #1a1a1a;
          }
          .card .info {
            font-size: 11px;
            color: #666;
            margin: 2px 0;
          }
          .card .id {
            font-size: 10px;
            color: #999;
            font-family: monospace;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🌱 GreenLink - Cartes Producteurs</h1>
          <p>${user?.cooperative_name || user?.full_name || 'Coopérative'} - ${toPrint.length} membre(s)</p>
        </div>
        <div class="grid">
          ${toPrint.map(member => `
            <div class="card">
              <img src="${member.qr_code}" alt="QR Code" />
              <div class="name">${member.name || 'Producteur'}</div>
              <div class="info">${member.village || ''}</div>
              <div class="info">${member.phone || ''}</div>
              <div class="id">ID: ${member.id?.slice(-8)}</div>
            </div>
          `).join('')}
        </div>
        <div class="footer">
          Généré le ${new Date().toLocaleDateString('fr-FR')} - GreenLink Agritech
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const MemberCard = ({ member }) => {
    const isSelected = selectedMembers.includes(member.id);
    
    return (
      <div 
        className={`relative bg-slate-800 rounded-xl p-4 cursor-pointer transition-all ${
          isSelected ? 'ring-2 ring-emerald-500 bg-slate-700' : 'hover:bg-slate-700'
        }`}
        onClick={() => toggleMemberSelection(member.id)}
      >
        {/* Selection indicator */}
        <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
        }`}>
          {isSelected && <span className="text-white text-xs">✓</span>}
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-3">
          <img 
            src={member.qr_code} 
            alt={`QR ${member.name}`}
            className="w-32 h-32 rounded-lg bg-white p-1"
          />
        </div>

        {/* Info */}
        <div className="text-center">
          <p className="text-white font-semibold truncate">{member.name || 'Producteur'}</p>
          <p className="text-slate-400 text-sm">{member.village || 'Non renseigné'}</p>
          <p className="text-slate-500 text-xs font-mono mt-1">
            {member.id?.slice(-8)}
          </p>
        </div>
      </div>
    );
  };

  const MemberRow = ({ member }) => {
    const isSelected = selectedMembers.includes(member.id);
    
    return (
      <div 
        className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
          isSelected ? 'bg-emerald-900/30 border border-emerald-500' : 'bg-slate-800 hover:bg-slate-700'
        }`}
        onClick={() => toggleMemberSelection(member.id)}
      >
        {/* Checkbox */}
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
          isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
        }`}>
          {isSelected && <span className="text-white text-xs">✓</span>}
        </div>

        {/* QR Code thumbnail */}
        <img 
          src={member.qr_code} 
          alt={`QR ${member.name}`}
          className="w-12 h-12 rounded bg-white p-0.5"
        />

        {/* Info */}
        <div className="flex-1">
          <p className="text-white font-medium">{member.name || 'Producteur'}</p>
          <p className="text-slate-400 text-sm">{member.village || 'Non renseigné'} • {member.phone || ''}</p>
        </div>

        {/* ID */}
        <Badge variant="outline" className="border-slate-600 text-slate-400 font-mono text-xs">
          {member.id?.slice(-8)}
        </Badge>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate(-1)}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <QrCode className="w-8 h-8 text-emerald-400" />
                <h1 className="text-2xl font-bold">QR Codes Producteurs</h1>
              </div>
              <p className="text-slate-400">
                Générez et imprimez les QR codes de vos membres pour identification terrain
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={loadMembers}
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Stats & Actions */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{members.length}</p>
                <p className="text-sm text-slate-400">Total membres</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4 text-center">
                <QrCode className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-400">{selectedMembers.length}</p>
                <p className="text-sm text-slate-400">Sélectionnés</p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-900/30 border-emerald-500/50 col-span-2">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-emerald-400 font-semibold">Actions groupées</p>
                  <p className="text-emerald-400/70 text-sm">
                    {selectedMembers.length > 0 
                      ? `${selectedMembers.length} membre(s) sélectionné(s)`
                      : 'Sélectionnez des membres ou imprimez tout'
                    }
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="bg-purple-600 hover:bg-purple-700"
                    onClick={exportPDFCards}
                    disabled={loading}
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export PDF {selectedMembers.length > 0 ? `(${selectedMembers.length})` : 'tout'}
                  </Button>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => printQRCodes()}
                    disabled={loading}
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer {selectedMembers.length > 0 ? `(${selectedMembers.length})` : 'tout'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search & View Toggle */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                placeholder="Rechercher par nom, téléphone ou village..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-700 text-white"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="border-slate-700 text-slate-300"
            >
              {selectedMembers.length === filteredMembers.length ? 'Désélectionner tout' : 'Tout sélectionner'}
            </Button>
            <div className="flex border border-slate-700 rounded-lg overflow-hidden">
              <button
                className={`p-2 ${viewMode === 'grid' ? 'bg-slate-700' : 'bg-slate-900'}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-5 h-5 text-slate-300" />
              </button>
              <button
                className={`p-2 ${viewMode === 'list' ? 'bg-slate-700' : 'bg-slate-900'}`}
                onClick={() => setViewMode('list')}
              >
                <List className="w-5 h-5 text-slate-300" />
              </button>
            </div>
          </div>

          {/* Members Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCcw className="w-8 h-8 text-emerald-400 animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-12 text-center">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-400">Aucun membre trouvé</h3>
                <p className="text-slate-500 mt-2">
                  {searchTerm ? 'Essayez une autre recherche' : 'Ajoutez des membres à votre coopérative'}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredMembers.map(member => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map(member => (
                <MemberRow key={member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
