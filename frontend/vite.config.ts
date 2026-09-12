import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/project_toturials/app/' : '/',
  plugins: [react()],
  server: { port: 5173 },
  build: { target: 'es2022' },
}));
