/**
 * Route Renderer Component
 * Handles route rendering with lazy loading, authentication, and error boundaries
 */

import React, { Suspense, useEffect, useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { routes, routeGroups } from './routes';
import { PageLoadingFallback } from '../utils/lazyLoader';
import { preloadRouteComponents } from '../utils/lazyLoader';
import RouteErrorBoundary from './RouteErrorBoundary';
import RouteGuard from './RouteGuard';
import { useStore } from '../store';

// Page metadata manager
const usePageMeta = (route) => {
  useEffect(() => {
    if (route?.title) {
      document.title = `${route.title} | Troupe`;
    }

    if (route?.description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', route.description);
      }
    }

    if (route?.meta) {
      Object.entries(route.meta).forEach(([name, content]) => {
        const meta = document.querySelector(`meta[name="${name}"]`);
        if (meta) {
          meta.setAttribute('content', content);
        }
      });
    }
  }, [route]);
};

// Route component wrapper
const RouteWrapper = ({ route, element: Element, ...props }) => {
  usePageMeta(route);

  return (
    <RouteErrorBoundary route={route}>
      <RouteGuard route={route}>
        <Suspense fallback={<PageLoadingFallback title={`Loading ${route.title}...`} />}>
          <Element {...props} />
        </Suspense>
      </RouteGuard>
    </RouteErrorBoundary>
  );
};

// Main route renderer
const RouteRenderer = () => {
  const location = useLocation();
  const [preloadingStatus, setPreloadingStatus] = useState({
    critical: false,
    auth: false,
    triggered: new Set()
  });

  // Preload critical routes on mount
  useEffect(() => {
    const preloadCritical = async () => {
      try {
        await preloadRouteComponents(routeGroups.critical);
        setPreloadingStatus(prev => ({ ...prev, critical: true }));
      } catch (error) {
        console.warn('Failed to preload critical routes:', error);
      }
    };

    preloadCritical();
  }, []);

  // Preload auth routes when on public pages
  useEffect(() => {
    const currentRoute = routes.find(route => {
      if (route.path.includes(':')) {
        // Handle dynamic routes
        const pathPattern = route.path.replace(/:[^/]+/g, '[^/]+');
        const regex = new RegExp(`^${pathPattern}$`);
        return regex.test(location.pathname);
      }
      return route.path === location.pathname;
    });

    if (currentRoute?.isPublic && !preloadingStatus.auth) {
      const preloadAuth = async () => {
        try {
          await preloadRouteComponents(routeGroups.auth);
          setPreloadingStatus(prev => ({ ...prev, auth: true }));
        } catch (error) {
          console.warn('Failed to preload auth routes:', error);
        }
      };

      // Delay auth preloading to not interfere with current page
      setTimeout(preloadAuth, 2000);
    }
  }, [location.pathname, preloadingStatus.auth]);

  // Progressive preloading based on route patterns
  useEffect(() => {
    const currentPath = location.pathname;

    // Preload related routes based on current path
    const getRelatedRoutes = () => {
      if (currentPath.includes('/courses')) {
        return routeGroups.courses;
      }
      if (currentPath.includes('/dashboard')) {
        return routeGroups.dashboard;
      }
      if (currentPath.includes('/admin')) {
        return routeGroups.admin;
      }
      return [];
    };

    const relatedRoutes = getRelatedRoutes();
    const preloadKey = currentPath.split('/')[1]; // Get first path segment

    if (relatedRoutes.length > 0 && !preloadingStatus.triggered.has(preloadKey)) {
      const preloadRelated = async () => {
        try {
          await preloadRouteComponents(relatedRoutes);
          setPreloadingStatus(prev => ({
            ...prev,
            triggered: new Set([...prev.triggered, preloadKey])
          }));
        } catch (error) {
          console.warn(`Failed to preload ${preloadKey} routes:`, error);
        }
      };

      // Delay preloading to not interfere with current page
      setTimeout(preloadRelated, 1000);
    }
  }, [location.pathname, preloadingStatus.triggered]);

  return (
    <Routes>
      {routes.map((route) => {
        // Skip development routes in production
        if (route.isDevelopment && process.env.NODE_ENV === 'production') {
          return null;
        }

        return (
          <Route
            key={route.path}
            path={route.path}
            element={
              <RouteWrapper
                route={route}
                element={route.element}
              />
            }
          />
        );
      })}

      {/* 404 Route */}
      <Route
        path="*"
        element={
          <RouteErrorBoundary>
            <NotFoundPage />
          </RouteErrorBoundary>
        }
      />
    </Routes>
  );
};

// 404 Page Component
const NotFoundPage = () => {
  const navigate = useStore((state) => state.router?.navigate);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <div style={{
        fontSize: '6rem',
        fontWeight: 'bold',
        color: 'var(--color-text-tertiary, #9ca3af)',
        marginBottom: '1rem'
      }}>
        404
      </div>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '600',
        color: 'var(--color-text-primary, #1a1a1a)',
        marginBottom: '1rem'
      }}>
        Page Not Found
      </h1>
      <p style={{
        fontSize: '1.125rem',
        color: 'var(--color-text-secondary, #6b7280)',
        marginBottom: '2rem',
        maxWidth: '500px'
      }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={() => window.history.back()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary, #6b7280)',
            border: '1px solid var(--color-border-primary, #d1d5db)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
        >
          Go Back
        </button>
        <a
          href="/"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'var(--color-interactive-primary, #0066cc)',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            textDecoration: 'none',
            fontSize: '1rem'
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
};

export default RouteRenderer;