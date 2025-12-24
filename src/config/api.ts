import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  verify: () => api.get('/auth/verify'),
  getProfile: () => api.get('/auth/profile'),
};

export interface ShopData {
  name?: string;
  type?: string;
  shopCategories?: string[];
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tagline?: string;
  logo?: string;
  ninea?: string;
  rccm?: string;
  legalName?: string;
  taxId?: string;
  bankName?: string;
  bankAccount?: string;
  iban?: string;
  currency?: string;
  invoicePrefix?: string;
  invoiceFooter?: string;
}

export const shopApi = {
  getAll: () => api.get('/shops'),
  getOne: (id: string) => api.get(`/shops/${id}`),
  create: (data: ShopData & { name: string; type: string }) => 
    api.post('/shops', data),
  update: (id: string, data: ShopData) => 
    api.patch(`/shops/${id}`, data),
  delete: (id: string, confirmName: string) => 
    api.delete(`/shops/${id}`, { data: { confirmName } }),
  getMembers: (id: string) => api.get(`/shops/${id}/members`),
  updateMember: (shopId: string, memberId: string, data: { role?: string; isActive?: boolean }) => 
    api.patch(`/shops/${shopId}/members/${memberId}`, data),
  removeMember: (shopId: string, memberId: string) => 
    api.delete(`/shops/${shopId}/members/${memberId}`),
  regenerateInvite: (id: string) => api.post(`/shops/${id}/regenerate-invite`),
};

export const inventoryApi = {
  // Dashboard
  getDashboard: (shopId: string) => api.get(`/shops/${shopId}/inventory/dashboard`),
  
  // Categories
  getCategories: (shopId: string) => api.get(`/shops/${shopId}/inventory/categories`),
  createCategory: (shopId: string, data: { name: string; description?: string; color?: string }) =>
    api.post(`/shops/${shopId}/inventory/categories`, data),
  updateCategory: (shopId: string, categoryId: string, data: { name?: string; description?: string; color?: string }) =>
    api.patch(`/shops/${shopId}/inventory/categories/${categoryId}`, data),
  deleteCategory: (shopId: string, categoryId: string) =>
    api.delete(`/shops/${shopId}/inventory/categories/${categoryId}`),
  
  // Products
  getProducts: (shopId: string, filters?: { categoryId?: string; search?: string; lowStock?: boolean; limit?: number; offset?: number }) =>
    api.get(`/shops/${shopId}/inventory/products`, { params: filters }),
  getProduct: (shopId: string, productId: string) =>
    api.get(`/shops/${shopId}/inventory/products/${productId}`),
  createProduct: (shopId: string, data: any) =>
    api.post(`/shops/${shopId}/inventory/products`, data),
  updateProduct: (shopId: string, productId: string, data: any) =>
    api.patch(`/shops/${shopId}/inventory/products/${productId}`, data),
  deleteProduct: (shopId: string, productId: string) =>
    api.delete(`/shops/${shopId}/inventory/products/${productId}`),
  
  // Stock Movements
  getMovements: (shopId: string, filters?: { type?: string; productId?: string; startDate?: string; endDate?: string }) =>
    api.get(`/shops/${shopId}/inventory/movements`, { params: filters }),
  createMovement: (shopId: string, data: {
    type: 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RETURN' | 'LOSS';
    productId: string;
    quantity: number;
    unitPrice?: number;
    reference?: string;
    notes?: string;
  }) => api.post(`/shops/${shopId}/inventory/movements`, data),

  // Receptions (multi-product purchases)
  getReceptions: (shopId: string, filters?: { startDate?: string; endDate?: string }) =>
    api.get(`/shops/${shopId}/inventory/receptions`, { params: filters }),
  getReception: (shopId: string, receptionId: string) =>
    api.get(`/shops/${shopId}/inventory/receptions/${receptionId}`),
  createReception: (shopId: string, data: {
    reference?: string;
    supplier?: string;
    notes?: string;
    taxAmount?: number;
    deliveryFee?: number;
    otherFees?: number;
    discount?: number;
    lines: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => api.post(`/shops/${shopId}/inventory/receptions`, data),
  updateReception: (shopId: string, receptionId: string, data: {
    reference?: string;
    supplier?: string;
    notes?: string;
    taxAmount?: number;
    deliveryFee?: number;
    otherFees?: number;
    discount?: number;
    lines?: Array<{
      id?: string;
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
  }) => api.put(`/shops/${shopId}/inventory/receptions/${receptionId}`, data),
  deleteReception: (shopId: string, receptionId: string) =>
    api.delete(`/shops/${shopId}/inventory/receptions/${receptionId}`),

  // Suppliers
  getSuppliers: (shopId: string) =>
    api.get(`/shops/${shopId}/inventory/suppliers`),
  createSupplier: (shopId: string, data: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }) => api.post(`/shops/${shopId}/inventory/suppliers`, data),
  updateSupplier: (shopId: string, supplierId: string, data: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
  }) => api.patch(`/shops/${shopId}/inventory/suppliers/${supplierId}`, data),
  deleteSupplier: (shopId: string, supplierId: string) =>
    api.delete(`/shops/${shopId}/inventory/suppliers/${supplierId}`),
};

export default api;
