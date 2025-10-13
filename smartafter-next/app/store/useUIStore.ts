import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Layout
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Loading states
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // Modal states
  chartModalOpen: boolean;
  selectedChart: 'spending' | 'analytics' | null;
  setChartModal: (open: boolean, chart?: 'spending' | 'analytics' | null) => void;
  
  // Notifications
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      // Layout
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      
      // Loading
      isLoading: false,
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Modals
      chartModalOpen: false,
      selectedChart: null,
      setChartModal: (open, chart = null) => set({ 
        chartModalOpen: open, 
        selectedChart: open ? chart : null 
      }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => {
        const newNotification = {
          ...notification,
          id: Date.now().toString(),
          timestamp: Date.now(),
        };
        set(state => ({
          notifications: [...state.notifications, newNotification]
        }));
      },
      removeNotification: (id) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id)
        }));
      },
    }),
    {
      name: 'smartafter-ui-store',
      partialize: (state) => ({ 
        sidebarCollapsed: state.sidebarCollapsed 
      }),
    }
  )
);
