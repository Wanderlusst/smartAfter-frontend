'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Database, 
  Mail, 
  Smartphone,
  Globe,
  Download,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export default function Settings() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!session?.user) {
    redirect('/landing');
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');
    
    // Simulate save operation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setIsSaving(false);
    setSaveStatus('success');
    
    // Reset status after 3 seconds
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'data', label: 'Data & Storage', icon: Database },
    { id: 'integrations', label: 'Integrations', icon: Mail },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue={session.user.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={session.user.email || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Timezone
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white">
                    <option>UTC-8 (Pacific Time)</option>
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC+0 (GMT)</option>
                    <option>UTC+5:30 (IST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {[
                  { label: 'New purchase detected', description: 'Get notified when new receipts are found' },
                  { label: 'Warranty expiry alerts', description: 'Reminders before warranties expire' },
                  { label: 'Refund status updates', description: 'Updates on refund processing' },
                  { label: 'Weekly spending summary', description: 'Weekly overview of your spending' },
                  { label: 'Security alerts', description: 'Important security notifications' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.label}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Privacy Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Data Collection</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Allow collection of usage data to improve the service</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account</div>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                    Enable
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Information</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    <div>
                      <div className="font-medium text-green-900 dark:text-green-100">Pro Plan Active</div>
                      <div className="text-sm text-green-700 dark:text-green-300">$9.99/month - Next billing: Dec 16, 2024</div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
                    Manage
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <div className="flex items-center p-3 border border-gray-300 dark:border-slate-600 rounded-md">
                      <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-gray-900 dark:text-white">•••• •••• •••• 4242</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Billing Address
                    </label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      123 Main St<br />
                      San Francisco, CA 94105
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-blue-500 mr-2" />
                    <div>
                      <div className="font-medium text-blue-900 dark:text-blue-100">Storage Used</div>
                      <div className="text-sm text-blue-700 dark:text-blue-300">2.3 GB of 10 GB used</div>
                    </div>
                  </div>
                  <div className="w-16 h-2 bg-blue-200 dark:bg-blue-800 rounded-full">
                    <div className="w-1/4 h-full bg-blue-500 rounded-full"></div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="flex items-center justify-center p-4 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <Download className="h-5 w-5 text-gray-400 mr-2" />
                    <span className="text-gray-900 dark:text-white">Export Data</span>
                  </button>
                  <button className="flex items-center justify-center p-4 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-red-600 dark:text-red-400">Delete Account</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'integrations':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connected Services</h3>
              <div className="space-y-4">
                {[
                  { name: 'Gmail', status: 'Connected', icon: Mail, color: 'green' },
                  { name: 'Google Drive', status: 'Not Connected', icon: Database, color: 'gray' },
                  { name: 'Dropbox', status: 'Not Connected', icon: Database, color: 'gray' },
                ].map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg bg-${service.color}-100 dark:bg-${service.color}-900/20 mr-3`}>
                        <service.icon className={`h-5 w-5 text-${service.color}-600 dark:text-${service.color}-400`} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{service.name}</div>
                        <div className={`text-sm text-${service.color}-600 dark:text-${service.color}-400`}>{service.status}</div>
                      </div>
                    </div>
                    <button className={`px-4 py-2 rounded-md transition-colors ${
                      service.status === 'Connected' 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40' 
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
                    }`}>
                      {service.status === 'Connected' ? 'Disconnect' : 'Connect'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {renderTabContent()}
            </motion.div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>

            {/* Save Status */}
            {saveStatus === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center text-green-600 dark:text-green-400"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                Settings saved successfully!
              </motion.div>
            )}

            {saveStatus === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center text-red-600 dark:text-red-400"
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to save settings. Please try again.
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}