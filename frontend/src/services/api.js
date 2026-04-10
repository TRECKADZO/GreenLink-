import axios from 'axios';
import logger from './logger';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const api = {
  // Features
  getFeatures: async () => {
    try {
      const response = await axios.get(`${API}/features`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching features:', error);
      return null;
    }
  },

  // Steps
  getSteps: async () => {
    try {
      const response = await axios.get(`${API}/steps`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching steps:', error);
      return null;
    }
  },

  // Crops
  getCrops: async () => {
    try {
      const response = await axios.get(`${API}/crops`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching crops:', error);
      return null;
    }
  },

  // Producers
  getProducers: async (limit = null) => {
    try {
      const url = limit ? `${API}/producers?limit=${limit}` : `${API}/producers`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      logger.error('Error fetching producers:', error);
      return null;
    }
  },

  // Testimonials
  getTestimonials: async () => {
    try {
      const response = await axios.get(`${API}/testimonials`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching testimonials:', error);
      return null;
    }
  },

  // Pricing Plans
  getPricingPlans: async () => {
    try {
      const response = await axios.get(`${API}/pricing-plans`);
      return response.data;
    } catch (error) {
      logger.error('Error fetching pricing plans:', error);
      return null;
    }
  },

  // Contact Form
  submitContact: async (data) => {
    try {
      const response = await axios.post(`${API}/contact`, data);
      return response.data;
    } catch (error) {
      logger.error('Error submitting contact form:', error);
      throw error;
    }
  }
};