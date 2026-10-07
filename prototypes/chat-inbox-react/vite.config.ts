import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// One self-contained HTML file in dist/, so the prototype can be opened or shared without a server
export default defineConfig({
  plugins: [react(), viteSingleFile()],
});
