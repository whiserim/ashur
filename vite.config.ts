import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { galleryMarkup, heroWallMarkup, newsMarkup } from './scripts/renewal-markup.mjs';

const projectFile = (path: string) => fileURLToPath(new URL(path, import.meta.url));
 
export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'shared-renewal-home',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (!html.includes('<!-- renewal-home -->')) return html;
          const news = JSON.parse(readFileSync(projectFile('./public/steam-news.json'), 'utf8'));
          const home = readFileSync(projectFile('./src/home.html'), 'utf8')
            .replace('<!-- renewal-hero-wall -->', heroWallMarkup())
            .replace('<!-- renewal-gallery -->', galleryMarkup())
            .replace('<!-- renewal-news -->', newsMarkup(news));
          return html.replace('<!-- renewal-home -->', home);
        },
      },
      handleHotUpdate({ file, server }) {
        if (file.endsWith('/home.html') || file.endsWith('/steam-news.json')) {
          server.ws.send({ type: 'full-reload' });
        }
      },
    },
    sites(),
  ],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        desktop: fileURLToPath(new URL('./index.html', import.meta.url)),
        mobile: fileURLToPath(new URL('./mobile.html', import.meta.url)),
        privacy: fileURLToPath(new URL('./privacy/index.html', import.meta.url)),
      },
    },
  },
});
