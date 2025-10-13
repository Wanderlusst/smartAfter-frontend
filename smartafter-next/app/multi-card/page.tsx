// COMMENTED OUT - Multi-card functionality disabled
// Focus is now on email parsing only

// Placeholder component - Multi-card functionality disabled
export default function MultiCardPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="text-gray-400 text-2xl">💳</div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Multi-Card Analysis Temporarily Disabled
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            We're currently focusing on email parsing functionality. 
            Multi-card analysis will be re-enabled in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}