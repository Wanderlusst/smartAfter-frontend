
export const APP_CONFIG = {
  name: 'SmartAfter',
  version: '1.0.0',
  description: 'Your Intelligent After-Purchase Assistant',
  
  // Feature flags
  features: {
    darkMode: true,
    notifications: true,
    exports: true,
    smartInsights: false, // Coming soon
    businessMode: false, // Coming soon
    familyAccounts: false, // Coming soon
  },
  
  // API endpoints
  api: {
    baseUrl: process.env.REACT_APP_API_URL || '/api',
    timeout: 10000,
  },
  
  // UI constants
  ui: {
    sidebarWidth: 256,
    sidebarCollapsedWidth: 64,
    headerHeight: 80,
    maxNotifications: 5,
  },
  
  // Theme colors
  colors: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
} as const;

export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  inbox: '/inbox',
  purchases: '/purchases',
  refunds: '/refunds',
  warranties: '/warranties',
  documents: '/documents',
  settings: '/settings',
} as const;

export const STORAGE_KEYS = {
  authToken: 'auth_token',
  userPreferences: 'user_preferences',
  dashboardCache: 'dashboard_cache',
} as const;
