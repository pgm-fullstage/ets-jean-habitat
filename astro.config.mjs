// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },
  site:"https://buscailhabitat.fr/",
  integrations: [],
  output:"server",
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  })
});