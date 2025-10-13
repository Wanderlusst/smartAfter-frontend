
import React from 'react';

interface SmartNotificationProps {
  type: 'refund' | 'warranty' | 'invoice' | 'general';
  message: string;
  count?: number;
  actionText?: string;
  onAction?: () => void;
}

const SmartNotification = ({ type, message, count, actionText, onAction }: SmartNotificationProps) => {
  const getNotificationStyle = () => {
    switch (type) {
      case 'refund':
        return 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 text-emerald-800';
      case 'warranty':
        return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-800';
      case 'invoice':
        return 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 text-purple-800';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'refund': return '💰';
      case 'warranty': return '⚠️';
      case 'invoice': return '📄';
      default: return '🔔';
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${getNotificationStyle()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">{getIcon()}</span>
          <div>
            <p className="font-medium">{message}</p>
            {count && (
              <p className="text-sm opacity-75 mt-1">{count} items need attention</p>
            )}
          </div>
        </div>
        
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg font-medium text-sm hover:bg-white transition-colors shadow-sm"
          >
            {actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default SmartNotification;
