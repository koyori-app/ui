import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { emojiDataAsset } from '../../scripts/emoji-data-asset.mjs';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue(), emojiDataAsset()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'style',
    },
    rolldownOptions: { external: ['vue'] },
  },
});
