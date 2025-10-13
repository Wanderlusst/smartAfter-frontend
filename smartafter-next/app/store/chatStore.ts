import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  activeTab: 'assistant' | 'manual';
  
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  toggleChat: () => void;
  setActiveTab: (tab: 'assistant' | 'manual') => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isOpen: false,
      isLoading: false,
      isStreaming: false,
      activeTab: 'assistant',

      addMessage: (message) => {
        const newMessage: ChatMessage = {
          ...message,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
        };
        
        set((state) => ({
          messages: [...state.messages, newMessage],
        }));
      },

      updateMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content, isStreaming: false } : msg
          ),
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      
      toggleChat: () => {
        const currentState = get();
        set({ isOpen: !currentState.isOpen });
        
        // Add welcome message if opening for the first time
        if (!currentState.isOpen && currentState.messages.length === 0) {
          setTimeout(() => {
            get().addMessage({
              role: 'assistant',
              content: 'Welcome to SmartBot 🤖\n\nAsk me anything about your purchases, invoices, returns, or delivery issues. I have access to your Gmail data and can help you track orders, find receipts, and manage returns!',
            });
          }, 300);
        }
      },

      setActiveTab: (tab) => set({ activeTab: tab }),
      
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'smartbot-chat',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
); 