interface StoredFormData {
  url: string;
  data: { [fieldName: string]: string | boolean };
  timestamp: number;
}

class OptionsPage {
  private allFormData: { [key: string]: StoredFormData } = {};
  private filteredData: { [key: string]: StoredFormData } = {};
  
  constructor() {
    this.init();
  }

  private async init() {
    await this.loadFormData();
    this.setupEventListeners();
    this.renderStats();
    this.renderFormsList();
  }

  private async loadFormData() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAllFormData' });
      this.allFormData = response.data || {};
      this.filteredData = { ...this.allFormData };
      console.log('Loaded form data:', this.allFormData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  }

  private setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    searchInput.addEventListener('input', (e) => {
      const query = (e.target as HTMLInputElement).value.toLowerCase();
      this.filterFormData(query);
    });

    // Export button
    const exportBtn = document.getElementById('export-btn');
    exportBtn?.addEventListener('click', () => this.exportData());

    // Clear all button
    const clearAllBtn = document.getElementById('clear-all-btn');
    clearAllBtn?.addEventListener('click', () => this.showConfirmDialog(
      '全ての保存済みフォームデータを削除しますか？この操作は元に戻せません。',
      () => this.clearAllData()
    ));

    // Confirm dialog
    const confirmNo = document.getElementById('confirm-no');
    confirmNo?.addEventListener('click', () => this.hideConfirmDialog());
  }

  private filterFormData(query: string) {
    if (!query) {
      this.filteredData = { ...this.allFormData };
    } else {
      this.filteredData = {};
      for (const [key, data] of Object.entries(this.allFormData)) {
        if (data.url.toLowerCase().includes(query)) {
          this.filteredData[key] = data;
        }
      }
    }
    this.renderFormsList();
  }

  private renderStats() {
    const totalForms = Object.keys(this.allFormData).length;
    const totalFormsEl = document.getElementById('total-forms');
    if (totalFormsEl) {
      totalFormsEl.textContent = totalForms.toString();
    }

    // Calculate storage usage (approximate)
    const dataSize = JSON.stringify(this.allFormData).length;
    const maxSize = 102400; // 100KB limit for chrome.storage.sync
    const usagePercent = Math.round((dataSize / maxSize) * 100);
    
    const storageUsedEl = document.getElementById('storage-used');
    if (storageUsedEl) {
      storageUsedEl.textContent = usagePercent.toString();
      storageUsedEl.className = `stat-number ${usagePercent > 80 ? 'text-red-600' : 'text-blue-600'}`;
    }
  }

  private renderFormsList() {
    const formsListEl = document.getElementById('forms-list');
    if (!formsListEl) return;

    const entries = Object.entries(this.filteredData);
    
    if (entries.length === 0) {
      formsListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3 class="empty-state-title">保存済みフォームがありません</h3>
          <p class="empty-state-description">
            Webページでフォームに入力すると、ここに表示されます。
          </p>
        </div>
      `;
      return;
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => b[1].timestamp - a[1].timestamp);

    const formsHtml = entries.map(([key, data]) => {
      const url = new URL(data.url);
      const domain = url.hostname;
      const timestamp = new Date(data.timestamp).toLocaleString('ja-JP');
      
      const fieldsHtml = Object.entries(data.data)
        .slice(0, 3) // Show only first 3 fields
        .map(([fieldName, value]) => `
          <div class="field-item">
            <span class="field-name">${this.escapeHtml(fieldName)}</span>
            <span class="field-value">${this.escapeHtml(this.formatValue(value))}</span>
          </div>
        `).join('');

      const moreFieldsCount = Object.keys(data.data).length - 3;
      const moreFieldsHtml = moreFieldsCount > 0 ? 
        `<div class="field-item"><span class="field-name text-gray-400">...他 ${moreFieldsCount} 項目</span></div>` : '';

      return `
        <div class="form-item">
          <div class="form-header">
            <div>
              <div class="form-url">${this.escapeHtml(domain)}</div>
              <div class="text-sm text-gray-500">${this.escapeHtml(url.pathname)}</div>
            </div>
            <div class="form-timestamp">${timestamp}</div>
          </div>
          <div class="form-fields">
            ${fieldsHtml}
            ${moreFieldsHtml}
          </div>
          <div class="form-actions">
            <button class="btn btn-sm btn-secondary" onclick="optionsPage.viewForm('${key}')">
              詳細を見る
            </button>
            <button class="btn btn-sm btn-danger" onclick="optionsPage.deleteForm('${key}')">
              削除
            </button>
          </div>
        </div>
      `;
    }).join('');

    formsListEl.innerHTML = formsHtml;
  }

  private formatValue(value: string | boolean): string {
    if (typeof value === 'boolean') {
      return value ? 'チェック済み' : 'チェックなし';
    }
    return value.length > 50 ? value.substring(0, 50) + '...' : value;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  public async deleteForm(key: string) {
    this.showConfirmDialog(
      'このフォームデータを削除しますか？',
      async () => {
        try {
          await chrome.runtime.sendMessage({
            action: 'deleteFormData',
            key
          });
          delete this.allFormData[key];
          delete this.filteredData[key];
          this.renderStats();
          this.renderFormsList();
          console.log(`Deleted form data: ${key}`);
        } catch (error) {
          console.error('Failed to delete form data:', error);
          alert('削除に失敗しました。');
        }
      }
    );
  }

  public viewForm(key: string) {
    const data = this.allFormData[key];
    if (!data) return;

    const fieldsHtml = Object.entries(data.data)
      .map(([fieldName, value]) => `
        <div class="field-item">
          <span class="field-name">${this.escapeHtml(fieldName)}</span>
          <span class="field-value">${this.escapeHtml(this.formatValue(value))}</span>
        </div>
      `).join('');

    const modalHtml = `
      <div class="modal-overlay" id="view-form-modal">
        <div class="modal max-w-2xl">
          <h3>フォーム詳細</h3>
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">URL:</p>
            <p class="break-all">${this.escapeHtml(data.url)}</p>
          </div>
          <div class="mb-4">
            <p class="text-sm text-gray-600 mb-2">保存日時:</p>
            <p>${new Date(data.timestamp).toLocaleString('ja-JP')}</p>
          </div>
          <div class="mb-6">
            <p class="text-sm text-gray-600 mb-2">フィールド:</p>
            <div class="form-fields max-h-64 overflow-y-auto">
              ${fieldsHtml}
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" onclick="optionsPage.closeViewModal()">
              閉じる
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  public closeViewModal() {
    const modal = document.getElementById('view-form-modal');
    modal?.remove();
  }

  private async clearAllData() {
    try {
      await chrome.runtime.sendMessage({ action: 'clearAllData' });
      this.allFormData = {};
      this.filteredData = {};
      this.renderStats();
      this.renderFormsList();
      console.log('All form data cleared');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      alert('削除に失敗しました。');
    }
  }

  private exportData() {
    const dataStr = JSON.stringify(this.allFormData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-memory-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private showConfirmDialog(message: string, onConfirm: () => void) {
    const messageEl = document.getElementById('confirm-message');
    const dialogEl = document.getElementById('confirm-dialog');
    const confirmYesEl = document.getElementById('confirm-yes');
    
    if (messageEl && dialogEl && confirmYesEl) {
      messageEl.textContent = message;
      dialogEl.style.display = 'flex';
      
      // Remove any existing click listeners
      const newConfirmYes = confirmYesEl.cloneNode(true) as HTMLElement;
      confirmYesEl.parentNode?.replaceChild(newConfirmYes, confirmYesEl);
      
      newConfirmYes.addEventListener('click', () => {
        onConfirm();
        this.hideConfirmDialog();
      });
    }
  }

  private hideConfirmDialog() {
    const dialogEl = document.getElementById('confirm-dialog');
    if (dialogEl) {
      dialogEl.style.display = 'none';
    }
  }
}

// Global instance for onclick handlers
const optionsPage = new OptionsPage();
(window as any).optionsPage = optionsPage;