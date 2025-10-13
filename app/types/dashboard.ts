
export interface WarrantyItem {
  product: string;
  brand: string;
  expiryDate: string;
  daysLeft: number;
  status: 'critical' | 'warning' | 'safe';
  value: string;
}

export interface NotificationItem {
  id: string;
  type: 'refund' | 'warranty' | 'invoice' | 'success' | 'error' | 'warning' | 'info';
  message: string;
  count?: number;
  actionText?: string;
  timestamp: number;
}
