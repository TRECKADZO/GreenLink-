import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/marketplace`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const marketplaceApi = {
  // Products
  createProduct: async (productData) => {
    const response = await axios.post(`${API}/products`, productData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getProducts: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const response = await axios.get(`${API}/products?${params}`);
    return response.data;
  },

  getMyProducts: async () => {
    const response = await axios.get(`${API}/products/my-products`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getProduct: async (productId) => {
    const response = await axios.get(`${API}/products/${productId}`);
    return response.data;
  },

  updateProduct: async (productId, productData) => {
    const response = await axios.put(`${API}/products/${productId}`, productData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  deleteProduct: async (productId) => {
    const response = await axios.delete(`${API}/products/${productId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Orders
  createOrder: async (orderData) => {
    const response = await axios.post(`${API}/orders`, orderData, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getMyOrders: async () => {
    const response = await axios.get(`${API}/orders/my-orders`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await axios.get(`${API}/orders/${orderId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await axios.put(`${API}/orders/${orderId}/status?status=${status}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Messages
  sendMessage: async (receiverId, content) => {
    const response = await axios.post(`${API}/messages`, {
      receiver_id: receiverId,
      content
    }, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getConversations: async () => {
    const response = await axios.get(`${API}/messages/conversations`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getMessages: async (conversationId) => {
    const response = await axios.get(`${API}/messages/${conversationId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Notifications
  getNotifications: async () => {
    const response = await axios.get(`${API}/notifications`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  markNotificationRead: async (notificationId) => {
    const response = await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  markAllNotificationsRead: async () => {
    const response = await axios.put(`${API}/notifications/mark-all-read`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Dashboard
  getDashboardStats: async () => {
    const response = await axios.get(`${API}/dashboard/stats`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Image Upload
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API}/upload-image`, formData, {
      headers: {
        ...getAuthHeader(),
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // Shopping Cart
  getCart: async () => {
    const response = await axios.get(`${API}/cart`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  addToCart: async (productId, quantity = 1) => {
    const response = await axios.post(`${API}/cart/add?product_id=${productId}&quantity=${quantity}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  updateCartItem: async (productId, quantity) => {
    const response = await axios.put(`${API}/cart/update?product_id=${productId}&quantity=${quantity}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  removeFromCart: async (productId) => {
    const response = await axios.delete(`${API}/cart/remove/${productId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  clearCart: async () => {
    const response = await axios.delete(`${API}/cart/clear`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  checkout: async (deliveryInfo) => {
    const params = new URLSearchParams({
      delivery_address: deliveryInfo.address,
      delivery_phone: deliveryInfo.phone,
      payment_method: deliveryInfo.payment_method || 'cash_on_delivery',
      notes: deliveryInfo.notes || ''
    });
    const response = await axios.post(`${API}/cart/checkout?${params}`, {}, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  // Buyer Orders
  getBuyerOrders: async () => {
    const response = await axios.get(`${API}/buyer/orders`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  getBuyerOrder: async (orderId) => {
    const response = await axios.get(`${API}/buyer/orders/${orderId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  }
};
