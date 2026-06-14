import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { execSync } from 'child_process';
import packageJson from './package.json';

function getGitVersion() {
  try {
    return execSync('git describe --tags --abbrev=0', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().replace(/^v/, '');
  } catch {
    return packageJson.version;
  }
}

function getGitBuildId() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return `build-${new Date().toISOString()}`;
  }
}

const APP_NAME = process.env.VITE_APP_NAME || 'Workspace Navigator';
const APP_VERSION = process.env.VITE_APP_VERSION || getGitVersion();
const APP_BUILD_ID = process.env.APP_BUILD_ID || getGitBuildId();
const RELEASE_NOTES_URL =
  process.env.VITE_RELEASE_NOTES_URL || 'https://github.com/MiseHinoha/Workspace-Navigator/releases';

const versionMetadata = {
  appName: APP_NAME,
  version: APP_VERSION,
  buildId: APP_BUILD_ID,
  releaseNotesUrl: RELEASE_NOTES_URL,
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'emit-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify(versionMetadata, null, 2),
        });
      },
    },
  ],
  define: {
    __APP_NAME__: JSON.stringify(APP_NAME),
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __APP_BUILD_ID__: JSON.stringify(APP_BUILD_ID),
    __APP_RELEASE_NOTES_URL__: JSON.stringify(RELEASE_NOTES_URL),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
