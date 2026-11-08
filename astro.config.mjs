// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // L’adresse du site en production : elle sert aux adresses canoniques, puis au sitemap et à robots.txt.
  // Provisoire : à remplacer par le .com en phase 3, et c’est la seule ligne à changer.
  site: "https://frise-chronologique---art-moderne.tjimblet.workers.dev",
});