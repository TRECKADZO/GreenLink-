import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Sprout, Mail, Lock } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(formData.identifier, formData.password);

    setLoading(false);

    if (result.success) {
      toast({
        title: 'Connexion réussie!',
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
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-7 h-7 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Se connecter</h1>
            <p className="text-sm text-gray-600">Accédez à votre compte</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email or Phone */}
          <div>
            <Label htmlFor="identifier">Email ou Téléphone</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="identifier"
                type="text"
                placeholder="exemple@email.com ou +225 0707070707"
                value={formData.identifier}
                onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Votre mot de passe"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="pl-10"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2d5a4d] hover:bg-[#1a4038] text-white py-6 text-lg"
            disabled={loading}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Pas encore de compte?{' '}
            <Link to="/register" className="text-[#2d5a4d] font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;