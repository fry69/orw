/**
 * Shared route manifest for both React Router and HTTP server
 * This ensures both frontend and backend know about the same routes
 */

export interface RouteDefinition {
  path: string;
  exact?: boolean;
  description?: string;
}

export const ROUTE_MANIFEST: RouteDefinition[] = [
  { path: "/", exact: true, description: "Home page" },
  { path: "/list", description: "Model list" },
  { path: "/model/:id", description: "Model detail" },
  { path: "/changes", description: "Change history" },
  { path: "/changes/:id", description: "Change detail" },
  { path: "/about", exact: true, description: "About page" },
  { path: "/settings", exact: true, description: "Settings page" },
];

/**
 * Helper to check if a pathname matches any defined route
 */
export function isValidRoute(pathname: string): boolean {
  return ROUTE_MANIFEST.some(route => {
    if (route.exact) {
      return route.path === pathname;
    }
    
    // Convert React Router path to regex (basic implementation)
    const routeRegex = route.path
      .replace(/:[^/]+/g, '[^/]+') // Replace :param with regex
      .replace(/\*/g, '.*');       // Replace * with regex
    
    return new RegExp(`^${routeRegex}/?$`).test(pathname);
  });
}

/**
 * Get all static route paths (no parameters)
 */
export function getStaticRoutes(): string[] {
  return ROUTE_MANIFEST
    .filter(route => !route.path.includes(':') && !route.path.includes('*'))
    .map(route => route.path);
}
