import React from 'react';
import { Calendar, FileText } from 'lucide-react';

interface PurchaseItemProps {
  item: {
    productName: string;
    store: string;
    price: string;
    purchaseDate: string;
    returnDeadline?: string;
    warrantyStatus?: string;
    hasInvoice: boolean;
  };
}

const PurchaseItem = ({ item }: PurchaseItemProps) => {
  const { 
    productName, 
    store, 
    price, 
    purchaseDate, 
    returnDeadline, 
    warrantyStatus, 
    hasInvoice 
  } = item;

  const getStoreColor = (store: string) => {
    const colors: { [key: string]: string } = {
      'Amazon': 'bg-orange-100 text-orange-700',
      'Flipkart': 'bg-blue-100 text-blue-700',
      'Myntra': 'bg-pink-100 text-pink-700',
      'Zomato': 'bg-red-100 text-red-700',
    };
    return colors[store] || 'bg-gray-100 text-gray-700';
  };

  const getReturnUrgency = (deadline: string) => {
    const days = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (days <= 3) return 'text-red-600 font-medium';
    if (days <= 7) return 'text-orange-600 font-medium';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-2">{productName}</h3>
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStoreColor(store)}`}>
              {store}
            </span>
            <span className="text-lg font-bold text-gray-900">{price}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {hasInvoice ? (
            <button className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200 transition-colors">
              <FileText size={14} />
              View Invoice
            </button>
          ) : (
            <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              <FileText size={14} />
              Fetch Invoice
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <Calendar size={14} />
          <span>Purchased: {purchaseDate}</span>
        </div>
        
        {returnDeadline && (
          <div className={`flex items-center gap-2 ${getReturnUrgency(returnDeadline)}`}>
            <span>⏰ Return by: {returnDeadline}</span>
          </div>
        )}
        
        {warrantyStatus && (
          <div className="text-gray-600">
            <span>🛡️ Warranty: {warrantyStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseItem;
