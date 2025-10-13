import React, { useState } from 'react';
import { Scan, Bell, Download, FileText, Lock, TrendingUp } from 'lucide-react';
import { usePro } from '../contexts/ProContext';
import ProFeaturesModal from './ProFeaturesModal';

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isComingSoon?: boolean;
  onClick?: () => void;
}

const ActionCard = ({ icon, title, description, isComingSoon, onClick }: ActionCardProps) => {
  return (
    <button
      onClick={onClick}
      disabled={isComingSoon}
      className={`relative p-4 rounded-xl border text-left transition-all duration-300 group ${
        isComingSoon
          ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-700/50 cursor-not-allowed'
          : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xl hover:shadow-slate-200/20 dark:hover:shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98]'
      }`}
    >
      {isComingSoon && (
        <div className="absolute top-3 right-3">
          <Lock className="w-3 h-3 text-slate-400" />
        </div>
      )}
      
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 ${
        isComingSoon
          ? 'bg-slate-100 dark:bg-slate-700/50'
          : 'bg-gradient-to-br from-indigo-500/10 to-purple-600/10 dark:from-indigo-400/20 dark:to-purple-500/20 group-hover:from-indigo-500/20 group-hover:to-purple-600/20'
      }`}>
        {icon}
      </div>
      
      <h3 className={`font-bold text-sm mb-2 ${
        isComingSoon ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'
      }`}>
        {title}
        {isComingSoon && <span className="text-xs ml-2 font-normal">(Soon)</span>}
      </h3>
      
      <p className={`text-xs leading-relaxed ${
        isComingSoon ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-400'
      }`}>
        {description}
      </p>
    </button>
  );
};

const QuickActionsPanel = () => {
  const { isPro } = usePro();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<'insights' | 'alerts' | 'reports' | null>(null);

  const handleScanEmails = () => {
  };

  const handleProFeatureClick = (featureName: string, featureType: 'insights' | 'alerts' | 'reports') => {
    if (!isPro) {
    } else {
      setSelectedFeature(featureType);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedFeature(null);
  };

  return (
    <>
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Quick Actions</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Streamline your workflow</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-slate-600 dark:text-slate-400 font-medium">Ready</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          <ActionCard
            icon={<Scan className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
            title="Scan New Emails"
            description="AI-powered receipt detection and analysis"
            onClick={handleScanEmails}
          />
          
          <ActionCard
            icon={<TrendingUp className={`w-5 h-5 ${isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />}
            title="Generate Insights"
            description="Advanced spending analytics and trends"
            isComingSoon={!isPro}
            onClick={() => handleProFeatureClick('Generate Insights', 'insights')}
          />
          
          <ActionCard
            icon={<Bell className={`w-5 h-5 ${isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />}
            title="Smart Alerts"
            description="Proactive notifications for opportunities"
            isComingSoon={!isPro}
            onClick={() => handleProFeatureClick('Smart Alerts', 'alerts')}
          />
          
          <ActionCard
            icon={<Download className={`w-5 h-5 ${isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />}
            title="Export Reports"
            description="Professional financial summaries"
            isComingSoon={!isPro}
            onClick={() => handleProFeatureClick('Export Reports', 'reports')}
          />
        </div>
      </div>

      <ProFeaturesModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        feature={selectedFeature}
      />
    </>
  );
};

export default QuickActionsPanel;
