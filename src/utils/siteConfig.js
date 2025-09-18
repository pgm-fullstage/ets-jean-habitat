// Utility for consistent site configuration across all pages
// Centralizes maintenance mode detection and error handling

const CONFIG_URL = import.meta.env.PUBLIC_CONFIG_URL || '/ets-jean-habitat-content.json';

function getMaintenanceConfig() {
  return {
    _maintenanceMode: true,
    business: {
      name: "Buscail Habitat",
      owner_name: "BUSCAIL Jérôme",
      contact: {
        phone: "0644089391",
        phone_formatted: "06.44.08.93.91",
        email: "contact@buscailhabitat.fr"
      },
      domain: "buscailhabitat.fr",
      google_rating: { has_reviews: false },
      company_logo: "/images/logo.png",
      favicon: "/favicon.svg"
    },
    seo: {
      title_template: "Maintenance - Buscail Habitat",
      description_template: "Service temporairement indisponible. Pour toute urgence 24h/24 : 06.44.08.93.91",
      keywords: ["maintenance", "urgence", "couverture", "Bretagne"],
      meta_tags: { robots: "noindex, follow" }
    },
    ui_sections: {
      header: {
        navigation: { services: [], links: [] }
      },
      theme: {
        primary: "#DC2626",
        title: "#1A1A1A", 
        text: "#666666",
        input: "#8C8C8C",
        bordered: "#E6E6E6",
        fill: "#F5F5F5"
      }
    }
  };
}

function getDefaultFallback() {
  // Fallback for 404 - site works with generic content
  return {
    business: {
      name: "Buscail Habitat",
      owner_name: "BUSCAIL Jérôme",
      contact: {
        phone: "0644089391",
        phone_formatted: "06.44.08.93.91",
        email: "contact@buscailhabitat.fr"
      },
      domain: "buscailhabitat.fr",
      google_rating: { 
        has_reviews: true,
        average_rating: "4.9",
        total_reviews: 47
      },
      company_logo: "/images/logo.png",
      favicon: "/favicon.svg",
      adress: "22700 LOUANNEC"
    },
    seo: {
      title_template: "Buscail Habitat - Couverture & Isolation en Bretagne",
      description_template: "Expert en couverture, isolation et rénovation en Bretagne. Devis gratuit.",
      keywords: ["couverture", "isolation", "rénovation", "Bretagne"],
      meta_tags: { robots: "index, follow" }
    },
    ui_sections: {
      header: {
        navigation: {
          services: [
            { title: "Couverture", url: "#services" },
            { title: "Isolation", url: "#services" }
          ],
          links: [
            { text: "À propos", url: "#about" },
            { text: "Contact", url: "#contact" }
          ]
        }
      },
      theme: {
        primary: "#DC2626",
        title: "#1A1A1A",
        text: "#666666", 
        input: "#8C8C8C",
        bordered: "#E6E6E6",
        fill: "#F5F5F5"
      },
      hero: {
        subtitle: "Experts en Couverture & Isolation",
        video: "/videos/hero.mp4",
        images: ["/images/hero.jpg"]
      }
    }
  };
}

export async function getSiteConfig() {
  // For SSR context, resolve relative URLs properly
  const fetchUrl = CONFIG_URL.startsWith('/') 
    ? (import.meta.env.DEV ? `http://localhost:4322${CONFIG_URL}` : `https://localhost${CONFIG_URL}`)
    : CONFIG_URL;
  
  try {
    const response = await fetch(fetchUrl, {
      headers: { 'Cache-Control': 'max-age=300' },
      signal: AbortSignal.timeout(5000)
    });
    
    // Error classification for deciding the mode
    if (response.status === 404) {
      console.warn('Config not found (404) - using default fallback');
      // 404 = normal fallback with default content (not maintenance)
      return getDefaultFallback();
    }
    
    if (response.status >= 500) {
      console.error(`Server error ${response.status} - entering maintenance mode`);
      return getMaintenanceConfig();
    }
    
    if (!response.ok) {
      console.error(`HTTP ${response.status}: ${response.statusText} - entering maintenance mode`);
      return getMaintenanceConfig();
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Invalid content-type - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    const data = await response.json();
    
    // Complete JSON structure validation
    if (!data || typeof data !== 'object') {
      console.error('Invalid JSON data - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    if (!data.business) {
      console.error('Missing business data - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    if (!data.ui_sections) {
      console.error('Missing ui_sections data - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    // Critical elements validation
    if (!data.business.name || !data.business.contact || !data.business.contact.phone) {
      console.error('Missing critical business info - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    if (!data.ui_sections.theme || !data.ui_sections.header) {
      console.error('Missing critical UI sections - entering maintenance mode');
      return getMaintenanceConfig();
    }
    
    return data;
    
  } catch (error) {
    console.error('Failed to fetch site config:', error.name, error.message);
    
    // Timeout, network, parsing = maintenance
    if (error.name === 'AbortError') {
      console.error('Request timeout - entering maintenance mode');
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('Network error - entering maintenance mode');
    } else {
      console.error('Parse/unknown error - entering maintenance mode');
    }
    
    return getMaintenanceConfig();
  }
}

// Check if maintenance mode should be active
export function shouldRedirectToMaintenance(siteData) {
  return siteData && siteData._maintenanceMode === true;
}