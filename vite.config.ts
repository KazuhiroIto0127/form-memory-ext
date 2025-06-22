import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background.ts'),
        content: resolve(__dirname, 'src/content.ts'),
        options: resolve(__dirname, 'src/options.ts'),
        'suggest-ui': resolve(__dirname, 'src/suggest-ui.ts'),
        styles: resolve(__dirname, 'src/styles.css')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    target: 'esnext',
    minify: false,
    copyPublicDir: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  plugins: [
    {
      name: 'copy-files',
      generateBundle() {
        // Copy manifest.json and other static files
        this.emitFile({
          type: 'asset',
          fileName: 'manifest.json',
          source: JSON.stringify({
            "manifest_version": 3,
            "name": "Form Memory",
            "version": "1.0.0",
            "description": "Save your keystrokes, focus on your work. Automatically save and restore form data.",
            "permissions": [
              "storage",
              "activeTab"
            ],
            "host_permissions": [
              "<all_urls>"
            ],
            "background": {
              "service_worker": "background.js"
            },
            "content_scripts": [
              {
                "matches": ["<all_urls>"],
                "js": ["content.js"],
                "run_at": "document_end"
              }
            ],
            "options_page": "options.html"
          }, null, 2)
        });

        // Copy options.html
        this.emitFile({
          type: 'asset',
          fileName: 'options.html',
          source: `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Form Memory - オプション</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>Form Memory</h1>
      <p class="subtitle">保存済みフォームデータの管理</p>
    </header>

    <main class="main">
      <div class="stats-section">
        <div class="stat-card">
          <span class="stat-number" id="total-forms">0</span>
          <span class="stat-label">保存済みフォーム</span>
        </div>
        <div class="stat-card">
          <span class="stat-number" id="storage-used">0</span>
          <span class="stat-label">使用容量 (%)</span>
        </div>
      </div>

      <div class="actions-section">
        <button id="export-btn" class="btn btn-secondary">
          データをエクスポート
        </button>
        <button id="clear-all-btn" class="btn btn-danger">
          全データを削除
        </button>
      </div>

      <div class="forms-section">
        <h2>保存済みフォーム一覧</h2>
        <div class="search-box">
          <input type="text" id="search-input" placeholder="URL または サイト名で検索...">
        </div>
        
        <div id="forms-list" class="forms-list">
          <div class="loading">データを読み込み中...</div>
        </div>
      </div>
    </main>
  </div>

  <div id="confirm-dialog" class="modal-overlay" style="display: none;">
    <div class="modal">
      <h3>確認</h3>
      <p id="confirm-message"></p>
      <div class="modal-actions">
        <button id="confirm-yes" class="btn btn-danger">はい</button>
        <button id="confirm-no" class="btn btn-secondary">キャンセル</button>
      </div>
    </div>
  </div>

  <script type="module" src="options.js"></script>
</body>
</html>`
        });
      }
    }
  ]
});