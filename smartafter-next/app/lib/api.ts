import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiClient {
  private client: AxiosInstance;

constructor() {
  this.client = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  this.setupInterceptors();
}

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {

        // Add auth token if available (only on client side)
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        
        return config;
      },
      (error) => {
        
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        
        return response;
      },
      (error) => {

        // Handle common errors (only on client side)
        if (error.response?.status === 401 && typeof window !== 'undefined') {
          // Redirect to login or refresh token
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  // Dashboard specific methods
  async fetchDashboardMetrics() {
    // For now, return mock data - replace with real API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          totalPurchases: '₹2,47,680',
          refundOpportunities: '₹18,420',
          activeWarranties: 23,
          documentsManaged: 231,
          totalSpent: '₹2.98L',
        });
      }, 1000);
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
