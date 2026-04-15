import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokenService } from '../../../services/tokenService';
import { toast } from 'sonner';
import {
  UserPlus, Loader2, Home, ChevronRight, CheckCircle2, ArrowRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ETAPES = [
  { n: 1, titre: 'Sensibilisation', desc: 'Information sur les objectifs et la portee de la norme ARS 1000.' },
  { n: 2, titre: 'Informations (4.2.3.2 a-n)', desc: 'Saisie des informations obligatoires du producteur.' },
  { n: 3, titre: 'Bulletin d\'adhesion', desc: 'Signature du bulletin par le producteur et 2 temoins.' },
  { n: 4, titre: 'Validation', desc: 'Validation par le Responsable SMCD ou CA/CG.' },
];

const AdhesionPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    sensibilisation_faite: false, sensibilisation_date: new Date().toISOString().slice(0, 10), sensibilisation_accuse: false,
    full_name: '', date_naissance: '', sexe: '', cni_number: '', phone_number: '', village: '', department: '', zone: '',
    nombre_parcelles: 0, hectares_approx: 0, gps_parcelle: '', nombre_travailleurs: 0, statut_producteur: 'actif',
    signature_producteur: false, temoin_1_nom: '', temoin_1_signature: false, temoin_2_nom: '', temoin_2_signature: false, notes: '',
  });
  const [result, setResult] = useState(null);

  const handleSubmit = async () => {
    if (!form.full_name || !form.phone_number) { toast.error('Nom et telephone obligatoires'); return; }
    setSubmitting(true);
    try {
      const token = tokenService.getToken();
      const res = await fetch(`${API}/api/membres/adhesion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setResult(data);
      toast.success('Adhesion creee avec succes');
    } catch { toast.error('Erreur creation'); }
    finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="min-h-screen bg-[#FAF9F6]" data-testid="adhesion-success">
        <Header navigate={navigate} />
        <div className="max-w-[600px] mx-auto px-6 py-16 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#1A3622] mb-2">Adhesion enregistree</h2>
          <p className="text-sm text-[#6B7280] mb-4">Code membre: <span className="font-mono font-bold">{result.code_membre}</span></p>
          <p className="text-xs text-[#6B7280] mb-6">Statut: {result.adhesion?.statut === 'en_attente_validation' ? 'En attente de validation' : 'En cours'}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setResult(null); setStep(1); setForm({ ...form, full_name: '', phone_number: '', cni_number: '' }); }} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6]">Nouvelle adhesion</button>
            <button onClick={() => navigate('/cooperative/membres')} className="px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417]" data-testid="btn-back-dashboard">Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6]" data-testid="adhesion-page">
      <Header navigate={navigate} />

      <div className="max-w-[800px] mx-auto px-6 md:px-8 py-8">
        {/* Stepper */}
        <div className="flex items-center justify-between mb-8" data-testid="stepper">
          {ETAPES.map((e, i) => (
            <div key={e.n} className="flex items-center flex-1">
              <button onClick={() => setStep(e.n)} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= e.n ? 'bg-[#1A3622] text-white' : 'bg-[#E5E5E0] text-[#6B7280]'}`} data-testid={`step-${e.n}`}>{e.n}</button>
              <div className="ml-2 hidden md:block">
                <p className={`text-[10px] font-bold ${step >= e.n ? 'text-[#1A3622]' : 'text-[#9CA3AF]'}`}>{e.titre}</p>
              </div>
              {i < ETAPES.length - 1 && <div className={`flex-1 h-0.5 mx-3 ${step > e.n ? 'bg-[#1A3622]' : 'bg-[#E5E5E0]'}`} />}
            </div>
          ))}
        </div>

        <div className="bg-white border border-[#E5E5E0] rounded-md p-6">
          {step === 1 && (
            <div className="space-y-4" data-testid="step1-content">
              <h3 className="text-sm font-semibold text-[#1A3622]">Etape 1 - Sensibilisation</h3>
              <p className="text-xs text-[#6B7280]">Le producteur doit etre informe sur les objectifs et la portee de la norme ARS 1000, les activites de durabilite, et les droits et obligations des membres.</p>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.sensibilisation_faite} onChange={(e) => setForm({...form, sensibilisation_faite: e.target.checked})} id="sens" className="rounded" data-testid="check-sensibilisation" />
                <label htmlFor="sens" className="text-xs text-[#374151]">Sensibilisation effectuee</label>
              </div>
              <Fld label="Date de sensibilisation" type="date" value={form.sensibilisation_date} onChange={(v) => setForm({...form, sensibilisation_date: v})} testid="input-sens-date" />
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={form.sensibilisation_accuse} onChange={(e) => setForm({...form, sensibilisation_accuse: e.target.checked})} id="accuse" className="rounded" data-testid="check-accuse" />
                <label htmlFor="accuse" className="text-xs text-[#374151]">Accuse de reception signe</label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4" data-testid="step2-content">
              <h3 className="text-sm font-semibold text-[#1A3622]">Etape 2 - Informations (norme 4.2.3.2 a-n)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Fld label="(a) Nom complet *" value={form.full_name} onChange={(v) => setForm({...form, full_name: v})} testid="input-name" />
                <Fld label="(b) Date de naissance" type="date" value={form.date_naissance} onChange={(v) => setForm({...form, date_naissance: v})} testid="input-dob" />
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">(c) Sexe *</label>
                  <select value={form.sexe} onChange={(e) => setForm({...form, sexe: e.target.value})} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md" data-testid="select-sexe">
                    <option value="">--</option>
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
                <Fld label="(d) N CNI *" value={form.cni_number} onChange={(v) => setForm({...form, cni_number: v})} testid="input-cni" />
                <Fld label="(e) Telephone *" value={form.phone_number} onChange={(v) => setForm({...form, phone_number: v})} testid="input-phone" />
                <Fld label="(f) Village *" value={form.village} onChange={(v) => setForm({...form, village: v})} testid="input-village" />
                <Fld label="(g) Departement" value={form.department} onChange={(v) => setForm({...form, department: v})} testid="input-dept" />
                <Fld label="(h) Zone" value={form.zone} onChange={(v) => setForm({...form, zone: v})} testid="input-zone" />
                <Fld label="(i) Nombre de parcelles" type="number" value={form.nombre_parcelles} onChange={(v) => setForm({...form, nombre_parcelles: parseInt(v) || 0})} testid="input-parcelles" />
                <Fld label="(j) Superficie (ha)" type="number" value={form.hectares_approx} onChange={(v) => setForm({...form, hectares_approx: parseFloat(v) || 0})} testid="input-hectares" />
                <Fld label="(k) GPS parcelle" value={form.gps_parcelle} onChange={(v) => setForm({...form, gps_parcelle: v})} testid="input-gps" />
                <Fld label="(l) Nbre travailleurs" type="number" value={form.nombre_travailleurs} onChange={(v) => setForm({...form, nombre_travailleurs: parseInt(v) || 0})} testid="input-travailleurs" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4" data-testid="step3-content">
              <h3 className="text-sm font-semibold text-[#1A3622]">Etape 3 - Bulletin d'adhesion</h3>
              <div className="bg-[#F9FAFB] rounded p-4 text-xs text-[#374151]">
                <p className="mb-2">En signant ce bulletin, le producteur <strong>{form.full_name || '______'}</strong> s'engage a respecter les statuts, le reglement interieur et la charte de la cooperative, ainsi que les exigences de la norme ARS 1000.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-white border border-[#E5E5E0] rounded">
                  <input type="checkbox" checked={form.signature_producteur} onChange={(e) => setForm({...form, signature_producteur: e.target.checked})} className="rounded" data-testid="check-sig-prod" />
                  <span className="text-xs font-medium text-[#374151]">Signature du producteur</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded space-y-2">
                    <Fld label="Temoin 1 - Nom" value={form.temoin_1_nom} onChange={(v) => setForm({...form, temoin_1_nom: v})} testid="input-temoin1" />
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.temoin_1_signature} onChange={(e) => setForm({...form, temoin_1_signature: e.target.checked})} className="rounded" data-testid="check-sig-t1" />
                      <span className="text-[10px] text-[#374151]">Signature</span>
                    </div>
                  </div>
                  <div className="p-3 bg-white border border-[#E5E5E0] rounded space-y-2">
                    <Fld label="Temoin 2 - Nom" value={form.temoin_2_nom} onChange={(v) => setForm({...form, temoin_2_nom: v})} testid="input-temoin2" />
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.temoin_2_signature} onChange={(e) => setForm({...form, temoin_2_signature: e.target.checked})} className="rounded" data-testid="check-sig-t2" />
                      <span className="text-[10px] text-[#374151]">Signature</span>
                    </div>
                  </div>
                </div>
              </div>
              <Fld label="Notes" value={form.notes} onChange={(v) => setForm({...form, notes: v})} testid="input-notes" />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4" data-testid="step4-content">
              <h3 className="text-sm font-semibold text-[#1A3622]">Etape 4 - Recapitulatif & Validation</h3>
              <div className="bg-[#F9FAFB] rounded p-4 space-y-2 text-xs text-[#374151]">
                <p><strong>Nom:</strong> {form.full_name}</p>
                <p><strong>Tel:</strong> {form.phone_number} | <strong>CNI:</strong> {form.cni_number}</p>
                <p><strong>Village:</strong> {form.village} | <strong>Sexe:</strong> {form.sexe}</p>
                <p><strong>Parcelles:</strong> {form.nombre_parcelles} | <strong>Hectares:</strong> {form.hectares_approx}</p>
                <p><strong>Sensibilise:</strong> {form.sensibilisation_faite ? 'Oui' : 'Non'} | <strong>Signe:</strong> {form.signature_producteur ? 'Oui' : 'Non'}</p>
                <p><strong>Temoins:</strong> {form.temoin_1_nom || '-'}, {form.temoin_2_nom || '-'}</p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t border-[#E5E5E0]">
            <button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="px-4 py-2 text-sm border border-[#E5E5E0] rounded-md hover:bg-[#F3F4F6] disabled:opacity-30" data-testid="btn-prev">Precedent</button>
            {step < 4 ? (
              <button onClick={() => setStep(step + 1)} className="px-4 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] flex items-center gap-2" data-testid="btn-next">Suivant <ArrowRight className="h-3.5 w-3.5" /></button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="px-6 py-2 text-sm bg-[#1A3622] text-white rounded-md hover:bg-[#112417] disabled:opacity-50" data-testid="btn-submit">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer l\'adhesion'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = ({ navigate }) => (
  <div className="bg-[#1A3622]">
    <div className="max-w-[800px] mx-auto px-6 md:px-8 py-6">
      <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
        <button onClick={() => navigate('/cooperative/dashboard')} className="hover:text-white"><Home className="h-3.5 w-3.5" /></button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate('/cooperative/membres')} className="hover:text-white">Membres</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-white/80">Procedure d'adhesion</span>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/cooperative/membres')} className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors" data-testid="btn-retour"><ChevronRight className="h-4 w-4 text-white rotate-180" /></button>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Procedure d'Adhesion</h1>
          <p className="text-sm text-white/60 mt-1">Clauses 4.2.2 & 4.2.3 - 4 etapes obligatoires</p>
        </div>
      </div>
    </div>
  </div>
);

const Fld = ({ label, value, onChange, type = 'text', testid }) => (
  <div>
    <label className="block text-xs font-medium text-[#374151] mb-1">{label}</label>
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E5E5E0] rounded-md focus:outline-none focus:border-[#1A3622]" data-testid={testid} />
  </div>
);

export default AdhesionPage;
