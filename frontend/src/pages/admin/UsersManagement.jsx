import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, Search, Trash2, Download, FileSpreadsheet, FileText,
  ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  UserX, UserCheck, Shield, Filter, RefreshCw, CheckSquare,
  XCircle, AlertTriangle, Eye, MoreVertical
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const UsersManagement = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Filters
  const [search, setSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Dialogs
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState({ open: false, user: null });

  const userTypes = [
    { value: 'all', label: 'Tous les types' },
    { value: 'admin', label: 'Administrateur' },
    { value: 'cooperative', label: 'Coopérative' },
    { value: 'producteur', label: 'Producteur' },
    { value: 'acheteur', label: 'Acheteur' },
    { value: 'field_agent', label: 'Agent Terrain' },
    { value: 'carbon_auditor', label: 'Auditeur Carbone' }
  ];

  const getTypeColor = (type) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      cooperative: 'bg-blue-100 text-blue-700',
      producteur: 'bg-green-100 text-green-700',
      acheteur: 'bg-purple-100 text-purple-700',
      field_agent: 'bg-orange-100 text-orange-700',
      carbon_auditor: 'bg-teal-100 text-teal-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: <Badge className="bg-green-100 text-green-700">Actif</Badge>,
      suspended: <Badge className="bg-yellow-100 text-yellow-700">Suspendu</Badge>,
      banned: <Badge className="bg-red-100 text-red-700">Banni</Badge>
    };
    return badges[status] || badges.active;
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.user_type !== 'admin') {
      navigate('/');
      return;
    }
    fetchUsers();
  }, [user, authLoading, page, userTypeFilter, sortBy, sortOrder]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        skip: page * limit,
        limit: limit,
        sort_by: sortBy,
        sort_order: sortOrder
      });
      
      if (userTypeFilter !== 'all') {
        params.append('user_type', userTypeFilter);
      }
      if (search) {
        params.append('search', search);
      }
      
      const response = await axios.get(`${API_URL}/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUsers(response.data.users);
      setTotal(response.data.total);
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les utilisateurs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    fetchUsers();
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy !== column) return <ArrowUpDown className="w-4 h-4 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4" /> 
      : <ArrowDown className="w-4 h-4" />;
  };

  const toggleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const handleDelete = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/admin/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: 'Succès',
        description: 'Utilisateur supprimé'
      });
      
      setDeleteDialog({ open: false, user: null });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de supprimer',
        variant: 'destructive'
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/api/admin/users/bulk/delete`, {
        headers: { Authorization: `Bearer ${token}` },
        data: selectedUsers
      });
      
      toast({
        title: 'Succès',
        description: response.data.message
      });
      
      setBulkDeleteDialog(false);
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de la suppression',
        variant: 'destructive'
      });
    }
  };

  const exportToCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = userTypeFilter !== 'all' ? `?user_type=${userTypeFilter}` : '';
      
      const response = await axios.get(`${API_URL}/api/admin/users/export/data${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data;
      
      // Generate CSV
      const headers = Object.keys(data[0] || {}).join(';');
      const rows = data.map(row => Object.values(row).join(';')).join('\n');
      const csv = `${headers}\n${rows}`;
      
      // Download
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `utilisateurs_greenlink_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      
      toast({
        title: 'Export réussi',
        description: `${data.length} utilisateurs exportés en CSV`
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export',
        variant: 'destructive'
      });
    }
  };

  const exportToPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = userTypeFilter !== 'all' ? `?user_type=${userTypeFilter}` : '';
      
      const response = await axios.get(`${API_URL}/api/admin/users/export/data${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = response.data.data;
      
      // Create printable HTML
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Liste des Utilisateurs GreenLink</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2d5a4d; text-align: center; }
            .meta { text-align: center; color: #666; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background: #2d5a4d; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f9f9f9; }
            .footer { margin-top: 20px; text-align: center; color: #999; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>Liste des Utilisateurs GreenLink</h1>
          <p class="meta">Exporté le ${new Date().toLocaleDateString('fr-FR')} • ${data.length} utilisateurs</p>
          <table>
            <thead>
              <tr>
                ${Object.keys(data[0] || {}).map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${Object.values(row).map(v => `<td>${v}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <p class="footer">GreenLink - Plateforme Agritech Côte d'Ivoire</p>
        </body>
        </html>
      `;
      
      // Open print dialog
      const printWindow = window.open('', '_blank');
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      
      toast({
        title: 'Export PDF',
        description: 'Fenêtre d\'impression ouverte'
      });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Erreur lors de l\'export PDF',
        variant: 'destructive'
      });
    }
  };

  const isTestUser = (user) => {
    const email = (user.email || '').toLowerCase();
    const name = (user.name || '').toLowerCase();
    return email.includes('@test') || email.includes('@greenlink.ci') || 
           name.includes('test') || name.includes('demo');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="pt-24 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/dashboard')}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Retour
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Users className="w-6 h-6 text-[#2d5a4d]" />
                  Gestion des Utilisateurs
                </h1>
                <p className="text-gray-500">{total} utilisateurs au total</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
              {selectedUsers.length > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={() => setBulkDeleteDialog(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer ({selectedUsers.length})
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Rechercher par nom, email, téléphone..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit">Rechercher</Button>
                </form>
                
                <Select value={userTypeFilter} onValueChange={(v) => { setUserTypeFilter(v); setPage(0); }}>
                  <SelectTrigger className="w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type d'utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="icon" onClick={fetchUsers} title="Actualiser">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-3 text-left">
                        <Checkbox 
                          checked={selectAll}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th 
                        className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('name')}
                      >
                        <div className="flex items-center gap-1">
                          Nom {getSortIcon('name')}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium text-gray-600">Email</th>
                      <th className="p-3 text-left font-medium text-gray-600">Téléphone</th>
                      <th 
                        className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('user_type')}
                      >
                        <div className="flex items-center gap-1">
                          Type {getSortIcon('user_type')}
                        </div>
                      </th>
                      <th className="p-3 text-left font-medium text-gray-600">Statut</th>
                      <th 
                        className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-1">
                          Inscrit le {getSortIcon('created_at')}
                        </div>
                      </th>
                      <th className="p-3 text-center font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center">
                          <div className="flex items-center justify-center gap-2 text-gray-500">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Chargement...
                          </div>
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-500">
                          Aucun utilisateur trouvé
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr 
                          key={u.id} 
                          className={`border-b hover:bg-gray-50 ${selectedUsers.includes(u.id) ? 'bg-blue-50' : ''} ${isTestUser(u) ? 'bg-yellow-50' : ''}`}
                        >
                          <td className="p-3">
                            <Checkbox 
                              checked={selectedUsers.includes(u.id)}
                              onCheckedChange={() => toggleSelectUser(u.id)}
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{u.name}</span>
                              {isTestUser(u) && (
                                <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-700 border-yellow-300">
                                  TEST
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-gray-600">{u.email}</td>
                          <td className="p-3 text-gray-600">{u.phone}</td>
                          <td className="p-3">
                            <Badge className={getTypeColor(u.user_type)}>
                              {u.user_type}
                            </Badge>
                          </td>
                          <td className="p-3">{getStatusBadge(u.status)}</td>
                          <td className="p-3 text-gray-600">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('fr-FR') : '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDetailsDialog({ open: true, user: u })}
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setDeleteDialog({ open: true, user: u })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">
                  Affichage {page * limit + 1} - {Math.min((page + 1) * limit, total)} sur {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Précédent
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page + 1} / {totalPages || 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer l'utilisateur <strong>{deleteDialog.user?.name}</strong> ?
              <br />
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, user: null })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteDialog.user?.id)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialog} onOpenChange={setBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Suppression en masse
            </DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de supprimer <strong>{selectedUsers.length} utilisateur(s)</strong>.
              <br />
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialog(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer {selectedUsers.length} utilisateur(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, user: null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détails de l'utilisateur</DialogTitle>
          </DialogHeader>
          {detailsDialog.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Nom</p>
                  <p className="font-medium">{detailsDialog.user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <Badge className={getTypeColor(detailsDialog.user.user_type)}>
                    {detailsDialog.user.user_type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{detailsDialog.user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Téléphone</p>
                  <p className="font-medium">{detailsDialog.user.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Statut</p>
                  {getStatusBadge(detailsDialog.user.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vérifié</p>
                  <p className="font-medium">{detailsDialog.user.is_verified ? 'Oui' : 'Non'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Date d'inscription</p>
                  <p className="font-medium">
                    {detailsDialog.user.created_at 
                      ? new Date(detailsDialog.user.created_at).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dernière connexion</p>
                  <p className="font-medium">
                    {detailsDialog.user.last_login 
                      ? new Date(detailsDialog.user.last_login).toLocaleDateString('fr-FR')
                      : '-'}
                  </p>
                </div>
              </div>
              
              {detailsDialog.user.roles?.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Rôles</p>
                  <div className="flex gap-2 flex-wrap">
                    {detailsDialog.user.roles.map(role => (
                      <Badge key={role} variant="outline">{role}</Badge>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-400">
                ID: {detailsDialog.user.id}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog({ open: false, user: null })}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManagement;
