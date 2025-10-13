
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'user' | 'admin' | 'team_lead';
  preferences: UserPreferences;
  subscription: {
    plan: 'free' | 'pro' | 'team';
    status: 'active' | 'inactive' | 'trial';
    expiresAt?: string;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    push: boolean;
    refundAlerts: boolean;
    warrantyAlerts: boolean;
  };
  dashboard: {
    defaultView: 'overview' | 'analytics';
    showWelcomeMessage: boolean;
  };
}

export interface TeamMember extends User {
  joinedAt: string;
  permissions: string[];
}
