import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { purchaseStore, type Purchase } from '../stores/purchaseStore';

const PurchasesList = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    const unsubscribe = purchaseStore.subscribe((newPurchases) => {
      setPurchases(newPurchases);
    });

    return unsubscribe;
  }, []);

  const handleClearAll = () => {
    purchaseStore.clearAllPurchases();
  };

  return (
    <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Purchase History ({purchases.length})
          </div>
          {purchases.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearAll}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              No purchases added yet. Try scanning an invoice!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map((purchase) => (
              <div key={purchase.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                    {purchase.productName}
                  </h4>
                  <span className="text-sm font-medium text-indigo-600">
                    {purchase.price}
                  </span>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <p><strong>Store:</strong> {purchase.store}</p>
                  <p><strong>Purchase Date:</strong> {purchase.purchaseDate}</p>
                  {purchase.returnDeadline && (
                    <p><strong>Return Deadline:</strong> {purchase.returnDeadline}</p>
                  )}
                  <p><strong>Has Invoice:</strong> {purchase.hasInvoice ? 'Yes' : 'No'}</p>
                  {purchase.extractedData && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-indigo-600 hover:text-indigo-700">
                        View Extracted Data
                      </summary>
                      <div className="mt-2 p-2 bg-slate-100 dark:bg-slate-700 rounded text-xs">
                        <pre>{JSON.stringify(purchase.extractedData, null, 2)}</pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PurchasesList;
