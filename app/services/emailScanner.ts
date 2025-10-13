
import { purchaseStore } from '../stores/purchaseStore';

interface ScannedPurchase {
  productName: string;
  store: string;
  price: string;
  purchaseDate: string;
  returnDeadline: string;
  warrantyStatus: string;
  hasInvoice: boolean;
}

export const scanEmails = async (): Promise<ScannedPurchase[]> => {

  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Remove all mock or dummy purchase data and related logic

  return [];
};

export const exportPurchaseData = () => {
  
  const purchases = purchaseStore.getPurchases();
  
  // Convert to CSV format
  const headers = ['Product Name', 'Store', 'Price', 'Purchase Date', 'Return Deadline', 'Warranty Status', 'Has Invoice'];
  const csvContent = [
    headers.join(','),
    ...purchases.map(p => [
      `"${p.productName}"`,
      `"${p.store}"`,
      `"${p.price}"`,
      `"${p.purchaseDate}"`,
      `"${p.returnDeadline}"`,
      `"${p.warrantyStatus}"`,
      p.hasInvoice ? 'Yes' : 'No'
    ].join(','))
  ].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartafter_purchases_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

};

export const exportInvoices = () => {
  
  const purchases = purchaseStore.getPurchases().filter(p => p.hasInvoice);
  
  // Simulate creating a ZIP file with invoices
  const invoiceData = purchases.map(p => ({
    filename: `${p.store}_${p.productName.replace(/[^a-zA-Z0-9]/g, '_')}_invoice.pdf`,
    store: p.store,
    product: p.productName,
    date: p.purchaseDate
  }));
  
  // Create a mock ZIP content
  const zipContent = JSON.stringify(invoiceData, null, 2);
  const blob = new Blob([zipContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `smartafter_invoices_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

};
