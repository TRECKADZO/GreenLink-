import { api } from './api';

// API Marketplace pour l'app mobile
export const marketplaceApi = {
  // Produits
  getProducts: (filters = {}) => api.get('/marketplace/products', { params: filters }),
  getProduct: (id) => api.get(`/marketplace/products/${id}`),
  getProductReviews: (id) => api.get(`/marketplace/products/${id}/reviews`),
  addProductReview: (id, data) => api.post(`/marketplace/products/${id}/reviews`, data),
  
  // Panier
  getCart: () => api.get('/marketplace/cart'),
  addToCart: (productId, quantity) => api.post('/marketplace/cart/add', { product_id: productId, quantity }),
  updateCartItem: (productId, quantity) => api.put(`/marketplace/cart/${productId}`, { quantity }),
  removeFromCart: (productId) => api.delete(`/marketplace/cart/${productId}`),
  clearCart: () => api.delete('/marketplace/cart'),
  
  // Wishlist
  getWishlist: () => api.get('/marketplace/wishlist'),
  addToWishlist: (productId) => api.post('/marketplace/wishlist', { product_id: productId }),
  removeFromWishlist: (productId) => api.delete(`/marketplace/wishlist/${productId}`),
  
  // Commandes
  getOrders: () => api.get('/marketplace/orders'),
  getOrder: (id) => api.get(`/marketplace/orders/${id}`),
  createOrder: (data) => api.post('/marketplace/orders', data),
  
  // Checkout
  checkout: (data) => api.post('/marketplace/checkout', data),
};
