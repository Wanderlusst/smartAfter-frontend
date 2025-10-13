import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import SmartAlerts from './SmartAlerts';
import GenerateInsights from './GenerateInsights';
import ExportReports from './ExportReports';

interface ProFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: 'insights' | 'alerts' | 'reports' | null;
}

const ProFeaturesModal = ({ isOpen, onClose, feature }: ProFeaturesModalProps) => {
  const getTitle = () => {
    switch (feature) {
      case 'insights':
        return 'Generate Insights';
      case 'alerts':
        return 'Smart Alerts';
      case 'reports':
        return 'Export Reports';
      default:
        return '';
    }
  };

  const renderContent = () => {
    switch (feature) {
      case 'insights':
        return <GenerateInsights />;
      case 'alerts':
        return <SmartAlerts />;
      case 'reports':
        return <ExportReports />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProFeaturesModal;
