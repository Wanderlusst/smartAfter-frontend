'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function DebugContent() {
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const info = {
      callbackUrl: urlParams.get('callbackUrl'),
      currentUrl: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    
    setDebugInfo(info);
    console.log('🐛 Debug Redirect Info:', info);
  }, []);

  const handleForceRedirect = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const callbackUrl = urlParams.get('callbackUrl') || '/dashboard';
    console.log('🚀 Force redirecting to:', callbackUrl);
    router.push(callbackUrl);
  };

  const handleClearCache = () => {
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
        console.log('🧹 Cleared all caches');
      });
    }
    
    // Clear localStorage
    localStorage.clear();
    console.log('🧹 Cleared localStorage');
    
    // Reload page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Debug Redirect Page</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="space-y-4">
            <button
              onClick={handleForceRedirect}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Force Redirect to Dashboard
            </button>
            
            <button
              onClick={handleClearCache}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Clear All Caches & Reload
            </button>
            
            <button
              onClick={() => window.location.href = '/landing?callbackUrl=%2Fdashboard'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Test Landing Page with Callback
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Check the debug information above</li>
            <li>If session is true but you're still looping, try "Force Redirect"</li>
            <li>If that doesn't work, try "Clear All Caches & Reload"</li>
            <li>Then test the landing page again</li>
            <li>Check browser console for the debug logs we added</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function DebugRedirect() {
  return (
    <Suspense fallback={<div>Loading debug page...</div>}>
      <DebugContent />
    </Suspense>
  );
}

