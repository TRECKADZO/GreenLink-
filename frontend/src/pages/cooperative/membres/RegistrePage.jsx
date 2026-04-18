import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  Users, Search, Loader2, Home, ChevronRight, Download,
  CheckCircle2, Clock, XCircle, Eye, FileSpreadsheet, FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const STATUT_STYLES = {
  valide: 'bg-emerald-50 text-emerald-700',
  en_cours: 'bg-amber-50 text-amber-700',
  en_attente_validation: 'bg-orange-50 text-orange-700',
  retrait: 'bg-gray-100 text-gray-600',
};
const STATUT_LABELS = { valide: 'Actif', en_cours: 'En cours', en_attente_validation: 'A valider', retrait: 'Retrait' };

const RegistrePage = () => {
  const navigate = useNavigate();
  const [membres, setMembres] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterSexe, setFilterSexe] = useState('');
  const [filterVillage, setFilterVillage] = useState('');
  const [selectedMembre, setSelectedMembre] = useState(null);

  useEffect(() => { load(); }, [search, filterStatut, filterSexe, filterVillage]);

  const load = async () => {
    setLoading(true);
    try {
      const token = tokenService.getToken();
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterSexe) params.append('sexe', filterSexe);
      if (filterVillage) params.append('village', filterVillage);
      const res = await fetch(`${API}/api/membres/registre?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMembres(data.membres || []);
      setTotal(data.total || 0);
    } catch { toast.error('Erreur'); }
    finally { setLoading(false); }
  };

  const handleValider = async (id) => {
    try {
      const token = tokenService.getToken();
      await fetch(`${API}/api/membres/adhesion/${id}/valider`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Membre valide');
      load();
    } catch { toast.error('Erreur'); }
  };

  const handleExportExcel = async () => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/export/excel`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'registre_membres.xlsx'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Excel telecharge');
    } catch { toast.error('Erreur export'); }
  };

  const handleBulletinPDF = async (id) => {
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/adhesion/${id}/bulletin/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'bulletin_adhesion.pdf'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Bulletin telecharge');
    } catch { toast.error('Erreur export'); }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="registre-page">
      <div className="bg-[#1A3622]">
        <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
          <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
            <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <ChevronRight className="h-3 w-3" />
            <button onClick={() => navigate('/cooperative/membres')} className="hover:text-white">Membres</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80">Registre</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/cooperative/membres')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">Base de Donnees des Membres</h1>
                <p className="text-sm text-white/60 mt-1">{total} membre(s) | Champs conformes norme 4.2.3.2 (a-n)</p>
              </div>
            </div>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-white text-[#1A3622] rounded-md text-sm font-medium hover:bg-white/90" data-testid="btn-export-excel">
              <FileSpreadsheet className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 md:px-8 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6" data-testid="filters">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, code, telephone, CNI..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white focus:outline-none focus:border-[#1A3622]" data-testid="search-input" />
          </div>
          <select value={filterStatut} onChange={(e) => setFilterStatut(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-statut">
            <option value="">Tous statuts</option>
            <option value="valide">Actif</option>
            <option value="en_cours">En cours</option>
            <option value="en_attente_validation">A valider</option>
            <option value="retrait">Retrait</option>
          </select>
          <select value={filterSexe} onChange={(e) => setFilterSexe(e.target.value)} className="px-3 py-2 text-sm border border-[#E5E5E0] rounded-md bg-white" data-testid="filter-sexe">
            <option value="">Tous</option>
            <option value="M">Hommes</option>
            <option value="F">Femmes</option>
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#1A3622]" /></div>
        ) : membres.length === 0 ? (
          <div className="bg-white border border-[#E5E5E0] rounded-md p-12 text-center" data-testid="empty-state">
            <Users className="h-12 w-12 text-[#D4AF37] mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-[#1A3622] mb-2">Aucun membre ARS 1000</h3>
            <p className="text-sm text-[#6B7280]">Utilisez la procedure d'adhesion pour enregistrer les membres.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E0] rounded-md overflow-hidden" data-testid="membres-table">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E5E5E0] bg-[#F9FAFB]">
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Code</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Nom (a)</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Sexe (c)</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Village/Section</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Campement</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Ha (j)</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Adhesion</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Statut</th>
                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-[#6B7280]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E0]">
                  {membres.map(m => (
                    <tr key={m.adhesion_id} className="hover:bg-[#F9FAFB]">
                      <td className="px-3 py-2 text-xs font-mono">{m.code_membre}</td>
                      <td className="px-3 py-2 text-xs font-medium text-[#111827]">{m.full_name}</td>
                      <td className="px-3 py-2 text-xs">{m.sexe === 'M' ? 'H' : m.sexe === 'F' ? 'F' : '-'}</td>
                      <td className="px-3 py-2 text-xs">{m.localite || m.village}</td>
                      <td className="px-3 py-2 text-xs">{m.campement || '-'}</td>
                      <td className="px-3 py-2 text-xs">{m.hectares_approx || 0}</td>
                      <td className="px-3 py-2 text-xs">{m.date_adhesion}</td>
                      <td className="px-3 py-2"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${STATUT_STYLES[m.statut] || 'bg-gray-100 text-gray-600'}`}>{STATUT_LABELS[m.statut] || m.statut}</span></td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          {m.statut === 'en_attente_validation' && (
                            <button onClick={() => handleValider(m.adhesion_id)} className="p-1 rounded hover:bg-emerald-50 text-emerald-600" title="Valider" data-testid={`btn-valider-${m.code_membre}`}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleBulletinPDF(m.adhesion_id)} className="p-1 rounded hover:bg-[#E8F0EA]" title="Bulletin PDF" data-testid={`btn-pdf-${m.code_membre}`}>
                            <FileText className="h-3.5 w-3.5 text-[#1A3622]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RegistrePage;
