export interface CreditCardSettings {
  id?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // YYYY-MM-DD format
  created_at?: string;
  updated_at?: string;
}

export class CreditCardSettingsService {
  /**
   * Save credit card settings via API
   */
  static async saveSettings(settings: Omit<CreditCardSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/credit-card-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: settings.first_name,
          lastName: settings.last_name,
          dateOfBirth: settings.date_of_birth,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to save settings' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in saveSettings:', error);
      return { success: false, error: 'Failed to save settings' };
    }
  }

  /**
   * Load credit card settings via API
   */
  static async loadSettings(): Promise<{ success: boolean; data?: CreditCardSettings; error?: string }> {
    try {
      const response = await fetch('/api/credit-card-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No settings found
          return { success: true, data: undefined };
        }
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to load settings' };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error in loadSettings:', error);
      return { success: false, error: 'Failed to load settings' };
    }
  }

  /**
   * Delete credit card settings via API
   */
  static async deleteSettings(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/credit-card-settings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to delete settings' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteSettings:', error);
      return { success: false, error: 'Failed to delete settings' };
    }
  }

  /**
   * Check if user has settings
   */
  static async hasSettings(): Promise<boolean> {
    try {
      const { data, error } = await this.loadSettings();
      return data !== undefined && data !== null;
    } catch (error) {
      console.error('Error in hasSettings:', error);
      return false;
    }
  }
}