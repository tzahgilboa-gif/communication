import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `npm run build` makes dist/chat-inbox.js: one script that a page loads with <script src>,
// exposing window.ChatInbox.mount(element, options). React and the CSS are inside it.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    lib: { entry: 'src/embed.tsx', name: 'ChatInbox', formats: ['iife'], fileName: () => 'chat-inbox.js' },
    target: 'es2020',
  },
});
