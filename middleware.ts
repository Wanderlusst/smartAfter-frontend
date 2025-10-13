import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {

    const protectedRoutes = ['/dashboard', '/purchases', '/refunds', '/warranties', '/documents', '/settings'];
    const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));
    
    // Allow access to public routes
    const publicRoutes = ['/', '/landing', '/pricing', '/api/auth'];
    const isPublicRoute = publicRoutes.some(route => req.nextUrl.pathname.startsWith(route));
    
    if (isPublicRoute) {
      return NextResponse.next();
    }
    
    // For protected routes, ensure user has valid authentication
    if (isProtectedRoute) {
      if (!req.nextauth.token || !req.nextauth.token.email) {
        return NextResponse.redirect(new URL('/landing', req.url));
      }
    }
    
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const protectedRoutes = ['/dashboard', '/purchases', '/refunds', '/warranties', '/documents', '/settings'];
        const isProtectedRoute = protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route));
        
        if (isProtectedRoute) {
          return !!token && !!token.email;
        }
        
        return true;
      },
    },
  }
);

// Configure which routes to run middleware on
export const config = {
  matcher: [
    // Protected routes
    '/dashboard/:path*',
    '/purchases/:path*',
    '/refunds/:path*',
    '/warranties/:path*',
    '/documents/:path*',
    '/settings/:path*',
    // Also run on root to handle redirects
    '/',
  ],
};
