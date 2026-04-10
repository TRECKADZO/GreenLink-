import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Users, Phone, MapPin, Search, RefreshCw,
  UserPlus, Smartphone, Globe, Calendar, Loader2, TreePine
} from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatDate = (d) => {
  if (!d) return 'N/A';
  const date = new Date(d);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const USSDRegistrationsPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/ussd/registrations?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRegistrations(data.registrations || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filtered = registrations.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.phone_number?.includes(s) ||
      r.village?.toLowerCase().includes(s) ||
      r.coop_code?.toLowerCase().includes(s)
    );
  });

  const ussdCount = registrations.filter(r => r.registered_via === 'ussd').length;
  const webCount = registrations.filter(r => r.registered_via === 'web').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/cooperative/dashboard')} data-testid="inscriptions-back-btn">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inscriptions Planteurs</h1>
              <p className="text-sm text-gray-500">Inscriptions via USSD et formulaire web</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRegistrations} disabled={loading} data-testid="inscriptions-refresh-btn">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card data-testid="inscriptions-stat-total">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{total}</p>
                <p className="text-xs text-gray-500">Total inscriptions</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="inscriptions-stat-ussd">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{ussdCount}</p>
                <p className="text-xs text-gray-500">Via USSD</p>
              </div>
            </CardContent>
          </Card>
          <Card data-testid="inscriptions-stat-web">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-purple-700" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{webCount}</p>
                <p className="text-xs text-gray-500">Via Web</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              data-testid="inscriptions-search-input"
              placeholder="Rechercher par nom, telephone, village, code coop..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Aucune inscription trouvee</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="inscriptions-table">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Nom complet</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Telephone</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Village</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Code Planteur</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Canal</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, i) => (
                      <tr key={r._id || i} className="border-b hover:bg-gray-50" data-testid={`inscription-row-${i}`}>
                        <td className="py-3 px-4 font-medium text-gray-900">{r.full_name || r.nom_complet}</td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> {r.phone_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {r.village || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {r.code_planteur || r.coop_code || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={r.registered_via === 'ussd' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}>
                            {r.registered_via === 'ussd' ? (
                              <><Smartphone className="h-3 w-3 mr-1" /> USSD</>
                            ) : (
                              <><Globe className="h-3 w-3 mr-1" /> Web</>
                            )}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-xs">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {formatDate(r.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default USSDRegistrationsPage;
