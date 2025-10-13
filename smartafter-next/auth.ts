import NextAuth, { type DefaultSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scope?: string;
    needsReauth?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    scope?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Debug environment variables in development
    ...(process.env.NODE_ENV === 'development' ? [{
      id: 'debug',
      name: 'Debug',
      type: 'credentials' as const,
      credentials: {},
      async authorize() {
        console.log('🔐 AUTH DEBUG - Environment variables:', {
          hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
          hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
          hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
          nextAuthUrl: process.env.NEXTAUTH_URL
        });
        return null;
      }
    }] : []),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
      authorization: {
        params: {
          prompt: "consent", // Force consent to ensure proper scopes
          access_type: "offline", // Need offline access for Gmail API
          response_type: "code",
          scope: [
            'openid',
            'email',
            'profile',
            'https://www.googleapis.com/auth/gmail.readonly'
          ].join(' ')
        }
      },
      httpOptions: {
        timeout: 30000
      }
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      
      // Force re-authentication if Gmail scope is missing
      if (account && !account.scope?.includes('gmail.readonly')) {
        return false; // This will force re-authentication
      }
      
      return true;
    },
    async jwt({ token, account, user }) {
      
      // If user changed, clear old tokens
      if (user && user.email !== token.email) {
        token = { ...token, email: user.email };
        delete token.accessToken;
        delete token.refreshToken;
        delete token.expiresAt;
        delete token.scope;
      }
      
      if (account) {
        // Initial sign-in - set tokens from account
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.scope = account.scope;
      } else if (token.refreshToken) {
        // Token refresh - try to refresh the token
        try {
          // Only import googleapis on server side
          if (typeof window === 'undefined') {
            const { google } = await import('googleapis');
            const oauth2Client = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET
            );
            
            oauth2Client.setCredentials({
              refresh_token: token.refreshToken
            });
            
            const { credentials } = await oauth2Client.refreshAccessToken();
            
            if (credentials.access_token) {
              token.accessToken = credentials.access_token;
              token.expiresAt = credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : undefined;
            }
          } else {
          }
        } catch (refreshError) {
          // Clear invalid tokens
          delete token.accessToken;
          delete token.refreshToken;
          delete token.expiresAt;
        }
      } else {
      }
      return token;
    },
    async session({ session, token }) {
      
      if (session.user) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.expiresAt = token.expiresAt;
        session.scope = token.scope;
        
        // Check if we have proper Gmail permissions
        if (!token.scope?.includes('gmail.readonly')) {
          session.needsReauth = true;
        }
        
      }
      return session;
    },
    // Add redirect callback to handle post-auth flow
    async redirect({ url, baseUrl }) {
      // After successful auth, redirect to dashboard instead of landing
      if (url.startsWith(baseUrl)) {
        return `${baseUrl}/dashboard`;
      }
      return url;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "your-secret-key-here-change-in-production",
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/landing',
  },
  debug: process.env.NODE_ENV === 'development',
};

// For more auth details, check out the docs: https://next-auth.js.org/getting-started/example#api-route-configuration
const handler = NextAuth(authOptions);

// Export the handler for the API route
export { handler as GET, handler as POST };

// Export auth functions for client components
export const auth = handler.auth;
export const signIn = handler.signIn;
export const signOut = handler.signOut;
