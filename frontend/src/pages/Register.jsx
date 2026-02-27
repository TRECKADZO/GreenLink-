import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Sprout, Phone, Lock, User, Briefcase } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const userTypes = [
  { value: 'producteur', label: 'Producteur', icon: '🌱', desc: 'Je vends mes récoltes' },
  { value: 'acheteur', label: 'Acheteur', icon: '🛒', desc: 'J\'achète des produits agricoles' },
  { value: 'entreprise_rse', label: 'Entreprise RSE', icon: '🏢', desc: 'Je cherche des crédits carbone' },
  { value: 'fournisseur', label: 'Fournisseur', icon: '📦', desc: 'Je fournis des intrants agricoles' }
];

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    password: '',
    fullName: '',
    userType: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await register(
      formData.phoneNumber,
      formData.password,
      formData.fullName,
      formData.userType
    );

    setLoading(false);

    if (result.success) {
      toast({
        title: 'Compte créé avec succès!',
        description: 'Bienvenue sur GreenLink'
      });
      navigate('/profile');
    } else {
      toast({
        title: 'Erreur',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2d5a4d] via-[#235043] to-[#1a4038] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-7 h-7 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer un compte</h1>
            <p className="text-sm text-gray-600">Rejoignez la révolution agricole</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type Selection */}
          <div>
            <Label className="mb-3 block">Type de compte *</Label>
            <div className="grid grid-cols-2 gap-3">
              {userTypes.map((type) => (
                <div
                  key={type.value}
                  onClick={() => setFormData({ ...formData, userType: type.value })}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.userType === type.value
                      ? 'border-[#2d5a4d] bg-[#2d5a4d]/5'
                      : 'border-gray-200 hover:border-[#2d5a4d]/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{type.icon}</span>
                    <span className="font-semibold text-gray-900">{type.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{type.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName">Nom complet *</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="Jean Kouadio"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <Label htmlFor="phoneNumber">Numéro de téléphone *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="+225 0707070707"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Format: +225XXXXXXXXXX ou XXXXXXXXXX</p>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Mot de passe *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white py-6 text-lg"
            disabled={loading || !formData.userType}
          >
            {loading ? 'Création en cours...' : 'Créer mon compte'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Déjà un compte?{' '}
            <Link to="/login" className="text-[#2d5a4d] font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;