import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { marketplaceApi } from '../services/marketplaceApi';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/use-toast';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState({ items: [], total: 0, items_count: 0 });
  const [loading, setLoading] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart({ items: [], total: 0, items_count: 0 });
      return;
    }
    
    try {
      setLoading(true);
      const data = await marketplaceApi.getCart();
      setCart(data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1) => {
    if (!user) {
      toast({
        title: 'Connexion requise',
        description: 'Veuillez vous connecter pour ajouter au panier',
        variant: 'destructive'
      });
      return false;
    }

    try {
      const result = await marketplaceApi.addToCart(productId, quantity);
      toast({
        title: 'Ajouté au panier',
        description: result.product_name
      });
      await fetchCart();
      return true;
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible d\'ajouter au panier',
        variant: 'destructive'
      });
      return false;
    }
  };

  const updateQuantity = async (productId, quantity) => {
    try {
      await marketplaceApi.updateCartItem(productId, quantity);
      await fetchCart();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.response?.data?.detail || 'Impossible de mettre à jour',
        variant: 'destructive'
      });
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await marketplaceApi.removeFromCart(productId);
      toast({
        title: 'Produit retiré',
        description: 'Le produit a été retiré du panier'
      });
      await fetchCart();
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de retirer le produit',
        variant: 'destructive'
      });
    }
  };

  const clearCart = async () => {
    try {
      await marketplaceApi.clearCart();
      setCart({ items: [], total: 0, items_count: 0 });
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const checkout = async (deliveryInfo) => {
    try {
      const result = await marketplaceApi.checkout(deliveryInfo);
      setCart({ items: [], total: 0, items_count: 0 });
      return result;
    } catch (error) {
      throw error;
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      checkout,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
