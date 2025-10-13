// Unified Gmail Search Helper - Fixes all search issues across the codebase
export class GmailSearchHelper {
  
  // Generate a comprehensive, effective search query that actually works
  static generateSearchQuery(days: number = 7, includeDateFilter: boolean = true): string {
    // ENHANCED: More comprehensive base query to catch all invoice types
    const baseQuery = '(subject:(invoice OR receipt OR bill OR order OR purchase OR payment OR confirmation OR transaction OR delivery OR booking OR subscription OR renewal OR charge OR debit OR credit OR refund OR cancellation OR ticket OR voucher OR coupon OR discount OR statement OR summary OR notification OR alert OR reminder OR due OR outstanding) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR hotstar.com OR spotify.com OR google.com OR apple.com OR microsoft.com OR adobe.com OR salesforce.com OR shopify.com OR stripe.com))';
    
    if (!includeDateFilter) {
      return baseQuery;
    }
    
    // Calculate date in Gmail format (YYYY/MM/DD)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    
    const year = pastDate.getFullYear();
    const month = String(pastDate.getMonth() + 1).padStart(2, '0');
    const day = String(pastDate.getDate()).padStart(2, '0');
    const dateFilter = `${year}/${month}/${day}`;

    return `${baseQuery} after:${dateFilter}`;
  }
  
  // Generate search query without date filter (for broader searches)
  static generateBroadSearchQuery(): string {
    return 'in:primary (subject:(invoice OR receipt OR bill OR order OR purchase OR payment OR confirmation) OR from:(amazon.in OR flipkart.com OR zomato.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR hotstar.com))';
  }
  
  // NEW: Generate a fallback search query that works around Gmail date issues
  static generateFallbackSearchQuery(): string {
    // Search without date filter first, then filter results in code
    const baseQuery = 'in:primary (subject:(invoice OR receipt OR bill OR order OR purchase OR payment OR confirmation) OR from:(amazon.in OR flipkart.com OR swiggy.com OR zomato.com OR myntra.com OR paytm.com OR razorpay.com OR uber.com OR ola.com OR bookmyshow.com OR netflix.com OR hotstar.com))';

    return baseQuery;
  }
  
  // NEW: Generate a working search query that tries multiple approaches
  static generateWorkingSearchQuery(days: number = 7): string {
    // Try to generate a working date-based query first
    try {
      const dateQuery = this.generateSearchQuery(days, true);
      
      // Validate the query
      if (this.validateSearchQuery(dateQuery)) {
        
        return dateQuery;
      }
    } catch (error) {
      
    }
    
    // Fallback to no date filter
    
    return this.generateFallbackSearchQuery();
  }
  
  // Generate search query for specific domains
  static generateDomainSearchQuery(domains: string[]): string {
    const domainList = domains.join(' OR ');
    return `in:primary from:(${domainList})`;
  }
  
  // Generate search query for specific subjects
  static generateSubjectSearchQuery(subjects: string[]): string {
    const subjectList = subjects.join(' OR ');
    return `in:primary subject:(${subjectList})`;
  }
  
  // Test if a search query is valid
  static validateSearchQuery(query: string): boolean {
    // Basic validation - check for common issues
    if (!query.includes('in:primary')) {
      
    }
    
    if (query.includes('after:2025') || query.includes('after:2026')) {
      
      return false;
    }
    
    if (query.length < 10) {
      
      return false;
    }
    
    return true;
  }
  
  // Get debug info for a search query
  static getDebugInfo(query: string): any {
    const hasDateFilter = query.includes('after:');
    const hasSubjectFilter = query.includes('subject:');
    const hasFromFilter = query.includes('from:');
    const hasPrimaryFilter = query.includes('in:primary');
    
    // Extract date if present
    let dateFilter = null;
    if (hasDateFilter) {
      const dateMatch = query.match(/after:([0-9\/]+)/);
      if (dateMatch) {
        dateFilter = dateMatch[1];
      }
    }
    
    return {
      query,
      hasDateFilter,
      hasSubjectFilter,
      hasFromFilter,
      hasPrimaryFilter,
      dateFilter,
      queryLength: query.length,
      isValid: this.validateSearchQuery(query),
      timestamp: new Date().toISOString()
    };
  }
}

// Export commonly used search queries
export const COMMON_SEARCH_QUERIES = {
  // Last 7 days with comprehensive search
  last7Days: () => GmailSearchHelper.generateSearchQuery(7, true),
  
  // Last 30 days with comprehensive search
  last30Days: () => GmailSearchHelper.generateSearchQuery(30, true),
  
  // No date filter - broader search
  noDateFilter: () => GmailSearchHelper.generateSearchQuery(7, false),
  
  // Specific domains only
  amazonOnly: () => GmailSearchHelper.generateDomainSearchQuery(['amazon.in']),
  
  // Food delivery only
  foodDelivery: () => GmailSearchHelper.generateDomainSearchQuery(['swiggy.com', 'zomato.com']),
  
  // Shopping only
  shopping: () => GmailSearchHelper.generateDomainSearchQuery(['amazon.in', 'flipkart.com', 'myntra.com']),
  
  // Payment only
  payments: () => GmailSearchHelper.generateDomainSearchQuery(['paytm.com', 'razorpay.com']),
  
  // Simple subject search
  simpleSubjects: () => GmailSearchHelper.generateSubjectSearchQuery(['invoice', 'receipt', 'bill', 'order', 'purchase', 'payment']),
};
