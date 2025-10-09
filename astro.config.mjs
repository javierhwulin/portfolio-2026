// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

import vue from "@astrojs/vue";
import compress from "astro-compress";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
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