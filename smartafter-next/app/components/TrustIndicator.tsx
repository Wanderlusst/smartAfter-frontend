
import React from 'react';
import { Lock } from 'lucide-react';

const TrustIndicator = () => {
  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
          <Lock className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-emerald-800">
            Your email data is never stored
          </p>
          <p className="text-xs text-emerald-600 mt-1">
            We only scan receipts with your permission • <a href="#" className="underline hover:no-underline">Learn more</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TrustIndicator;
