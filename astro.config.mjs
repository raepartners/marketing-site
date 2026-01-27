// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// puma-dev local development: PUMA_DEV_SUBDOMAIN is set by scripts/puma-dev-register.mjs
const localHostname = process.env.PUMA_DEV_SUBDOMAIN
  ? `${process.env.PUMA_DEV_SUBDOMAIN}.mktg.rae.test`
  : null;

// https://astro.build/config
export default defineConfig({
  site: 'https://rae.partners',
  output: 'static',

  server: {
    host: '127.0.0.1',
    // Allow puma-dev subdomain through Vite's host validation
    allowedHosts: localHostname ? [localHostname, 'localhost', '127.0.0.1'] : true,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      strictPort: true,
      // Configure HMR to work through puma-dev's HTTPS proxy
      hmr: localHostname
        ? {
            host: localHostname,
            clientPort: 443,
            protocol: 'wss',
          }
        : true,
    },
  },

  integrations: [
    react(),
    sitemap({
      filter: (page) => !page.includes('/internal/'),
      changefreq: 'weekly',
      priority: 0.7,
    }),
    mdx()
  ]
});
