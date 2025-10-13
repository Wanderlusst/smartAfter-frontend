import { clsx, ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}

// Clear all stored data and session information
export function clearAllStoredData() {
  try {
    // Clear localStorage
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear specific keys that might persist
      localStorage.removeItem('next-auth.session-token');
      localStorage.removeItem('next-auth.csrf-token');
      localStorage.removeItem('next-auth.callback-url');
      
      // Clear any custom app data
      localStorage.removeItem('smartafter-data');
      localStorage.removeItem('smartafter-cache');

    }
  } catch (error) {
    
  }
}

// Force clear session and redirect to landing
export async function forceClearSession() {
  try {

    // Clear stored data
    clearAllStoredData();
    
    // Clear cookies (if possible)
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=.${window.location.hostname}`;
      });
    }
    
    // Clear any remaining NextAuth data
    if (typeof window !== 'undefined') {
      // Clear all possible NextAuth storage keys
      const nextAuthKeys = [
        'next-auth.session-token',
        'next-auth.csrf-token', 
        'next-auth.callback-url',
        'next-auth.state',
        'next-auth.pkce.code_verifier'
      ];
      
      nextAuthKeys.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear any SWR cache (if exists)
      if ('__SWR_CACHE__' in window && (window as any).__SWR_CACHE__) {
        (window as any).__SWR_CACHE__.clear();
      }
      
      // Clear any React Query cache (if exists)
      if ('__REACT_QUERY_CACHE__' in window && (window as any).__REACT_QUERY_CACHE__) {
        (window as any).__REACT_QUERY_CACHE__.clear();
      }
    }

    // Force page reload to ensure clean state
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
  } catch (error) {
    
    // Even if there's an error, try to redirect
    if (typeof window !== 'undefined') {
      window.location.href = '/landing';
    }
  }
}
