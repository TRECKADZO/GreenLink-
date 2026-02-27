import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, LogOut, User } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-[#2d5a4d]/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => navigate('/')}
        >
          <div className="w-10 h-10 bg-[#d4a574] rounded-lg flex items-center justify-center">
            <Sprout className="w-6 h-6 text-[#2d5a4d]" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">GreenLink</h1>
            <p className="text-white/70 text-xs">Agriculture durable</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button 
                variant="ghost" 
                className="text-white hover:text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => navigate('/profile')}
              >
                <User className="w-4 h-4 mr-2" />
                {user.full_name}
              </Button>
              <Button 
                variant="ghost" 
                className="text-white/70 hover:text-white hover:bg-white/10 transition-all duration-300"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                className="text-white hover:text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => navigate('/login')}
              >
                Se connecter
              </Button>
              <Button 
                className="bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold transition-all duration-300"
                onClick={() => navigate('/register')}
              >
                S'inscrire
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;