import { api } from './api';

// API Marketplace pour l'app mobile
export const marketplaceApi = {
  // Produits
  getProducts: (filters = {}) => api.get('/marketplace/products', { params: filters }),
  getProduct: (id) => api.get(`/marketplace/products/${id}`),
  getProductReviews: (id) => api.get(`/marketplace/products/${id}/reviews`),
  addProductReview: (id, data) => api.post(`/marketplace/products/${id}/reviews`, data),
  
  // Panier - using query params
  getCart: () => api.get('/marketplace/cart'),
  addToCart: (productId, quantity) => api.post(`/marketplace/cart/add?product_id=${productId}&quantity=${quantity}`),
  updateCartItem: (productId, quantity) => api.put(`/marketplace/cart/update?product_id=${productId}&quantity=${quantity}`),
  removeFromCart: (productId) => api.delete(`/marketplace/cart/remove?product_id=${productId}`),
  clearCart: () => api.delete('/marketplace/cart/clear'),
  
  // Wishlist - using query params
  getWishlist: () => api.get('/marketplace/wishlist'),
  addToWishlist: (productId) => api.post(`/marketplace/wishlist/add?product_id=${productId}`),
  removeFromWishlist: (productId) => api.delete(`/marketplace/wishlist/remove?product_id=${productId}`),
  
  // Commandes
  getOrders: () => api.get('/marketplace/orders/my-orders'),
  getOrder: (id) => api.get(`/marketplace/orders/${id}`),
  createOrder: (data) => api.post('/marketplace/orders', data),
  
  // Checkout
  checkout: (data) => api.post('/marketplace/cart/checkout', data),
};
