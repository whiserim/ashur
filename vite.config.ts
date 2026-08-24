import { sites } from '@openai/sites-vite-plugin';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
 
export default defineConfig({
  base: './',
  plugins: [sites()],
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        desktop: fileURLToPath(new URL('./index.html', import.meta.url)),
        mobile: fileURLToPath(new URL('./mobile.html', import.meta.url)),
      },
    },
  },
});
