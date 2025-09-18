// Astro middleware for early maintenance mode detection
import { defineMiddleware } from 'astro/middleware';
import { getSiteConfig, shouldRedirectToMaintenance } from './utils/siteConfig.js';

export const onRequest = defineMiddleware(async (context, next) => {
  // Skip maintenance check for the maintenance page itself
  if (context.url.pathname === '/maintenance') {
    return next();
  }

  try {
    const siteData = await getSiteConfig();
    
    // If maintenance mode is active, redirect immediately
    if (shouldRedirectToMaintenance(siteData)) {
      console.warn('Maintenance mode active - redirecting to /maintenance');
      return context.redirect('/maintenance', 302);
    }

    // Store siteData in locals for use by components
    context.locals.siteData = siteData;
    
  } catch (error) {
    // If configuration fails completely, activate maintenance mode
    console.error('Middleware: Critical failure, redirecting to maintenance:', error);
    return context.redirect('/maintenance', 302);
  }

  return next();
});