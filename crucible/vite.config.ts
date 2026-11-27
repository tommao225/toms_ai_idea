import { defineConfig } from 'vite';

export default defineConfig({
  // itch 的静态托管在子路径下，必须用相对路径
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5273,
    // 编辑器原子写入会在源码目录里留下临时目录，监听它们会让 watcher 崩掉
    watch: { ignored: ['**/.*.tmpdir/**', '**/*.tmp', '**/.git/**'] },
  },
  build: { target: 'es2022', outDir: 'web', emptyOutDir: true },
});
