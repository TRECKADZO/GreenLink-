import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  ShoppingCart, 
  X, 
  Plus, 
  Minus, 
  Trash2,
  Package,
  ArrowRight
} from 'lucide-react';

const CartDrawer = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, loading } = useCart();

  if (!isOpen) return null;

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-[#2d5a4d]">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">Mon Panier</h2>
            {cart.items_count > 0 && (
              <Badge className="bg-[#d4a574] text-[#2d5a4d]">
                {cart.items_count}
              </Badge>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Connectez-vous
              </h3>
              <p className="text-gray-600 mb-4">
                Connectez-vous pour voir votre panier
              </p>
              <Button
                onClick={() => {
                  onClose();
                  navigate('/login');
                }}
                className="bg-[#2d5a4d] hover:bg-[#1a4038]"
              >
                Se connecter
              </Button>
            </div>
          ) : cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Panier vide
              </h3>
              <p className="text-gray-600 mb-4">
                Ajoutez des produits depuis la marketplace
              </p>
              <Button
                onClick={() => {
                  onClose();
                  navigate('/#marketplace');
                }}
                variant="outline"
                className="border-[#2d5a4d] text-[#2d5a4d]"
              >
                Voir les produits
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div 
                  key={item.product_id}
                  className="flex gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-gradient-to-br from-[#2d5a4d]/10 to-[#d4a574]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    {item.product.images?.length > 0 ? (
                      <img 
                        src={`${process.env.REACT_APP_BACKEND_URL}${item.product.images[0]}`}
                        alt={item.product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="w-8 h-8 text-[#2d5a4d]/30" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {item.product.price.toLocaleString()} XOF/{item.product.unit}
                    </p>
                    
                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={loading}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={loading || item.quantity >= item.product.stock_quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="ml-auto p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="text-right">
                    <p className="font-bold text-[#2d5a4d]">
                      {item.item_total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">XOF</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && cart.items.length > 0 && (
          <div className="border-t p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Total</span>
              <span className="text-2xl font-bold text-[#2d5a4d]">
                {cart.total.toLocaleString()} XOF
              </span>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full bg-[#d4a574] hover:bg-[#c49564] text-[#2d5a4d] font-semibold py-6"
            >
              Passer la commande
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
