import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://etsjeanhabitat.fr';
  const CONFIG_URL = import.meta.env.PUBLIC_CONFIG_URL || `${baseUrl}/ets-jean-habitat-content.json`;
  
  // Routes statiques
  const staticRoutes = [
    '/',
    '/villes'
  ];
  
  // Charger les villes dynamiques
  let cityRoutes: string[] = [];
  try {
    const response = await fetch(CONFIG_URL);
    if (response.ok) {
      const data = await response.json();
      const cities = data.cities?.available || {};
      cityRoutes = Object.keys(cities).map(citySlug => `/villes/${citySlug}`);
    }
  } catch (error) {
    console.warn('Could not load cities for sitemap:', error);
  }
  
  // Combiner toutes les routes
  const allRoutes = [...staticRoutes, ...cityRoutes];
  
  // Générer le XML du sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allRoutes.map(route => `  <url>
    <loc>${baseUrl}${route}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${route === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};