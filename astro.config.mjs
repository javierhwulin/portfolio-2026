// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

import vue from "@astrojs/vue";
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'three': ['three'],
          },
        },
      },
    },
  },

  integrations: [
    vue(),
    compress({
      html: true,
      css: true,
      js: true,
      svg: true,
      img: true,
    }),
  ],
});