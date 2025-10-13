import React from 'react';
import { Crown, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePro } from '../contexts/ProContext';

const ProBadge = () => {
  const router = useRouter();
  const { isPro } = usePro();

  const handleUpgradeClick = () => {
    router.push('/pricing');
  };

  if (isPro) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">SmartAfter Pro</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">All features unlocked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Crown className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">SmartAfter Pro</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Unlock advanced features</p>
          </div>
        </div>
        
        <button 
          onClick={handleUpgradeClick}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          Upgrade
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default ProBadge;
