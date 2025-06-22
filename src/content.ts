interface FormData {
  [fieldName: string]: string | boolean;
}

interface StoredFormData {
  url: string;
  data: FormData;
  timestamp: number;
}

class FormMemory {
  private forms: HTMLFormElement[] = [];
  private hasUnsavedChanges = false;
  private debounceTimer: number | null = null;
  private suggestUI: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init() {
    console.log('FormMemory: Initializing...');
    this.detectForms();
    this.loadSavedData();
    this.setupEventListeners();
    console.log('FormMemory: Initialization complete');
  }

  private detectForms() {
    this.forms = Array.from(document.querySelectorAll('form'));
    console.log(`Found ${this.forms.length} forms on page`);
  }

  private setupEventListeners() {
    console.log(`Setting up event listeners for ${this.forms.length} forms`);
    this.forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');
      console.log(`Form ${index}: Found ${inputs.length} input elements`);
      
      inputs.forEach(input => {
        input.addEventListener('input', () => {
          console.log('Input event triggered on:', input);
          this.onInputChange();
        });
        input.addEventListener('change', () => {
          console.log('Change event triggered on:', input);
          this.onInputChange();
        });
      });

      form.addEventListener('submit', () => this.onFormSubmit(form, index));
    });

    // Re-detect forms when DOM changes
    const observer = new MutationObserver(() => {
      const newForms = Array.from(document.querySelectorAll('form'));
      if (newForms.length > this.forms.length) {
        this.forms = newForms;
        this.setupEventListeners();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private onInputChange() {
    console.log('FormMemory: Input changed, setting unsaved flag');
    this.hasUnsavedChanges = true;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      console.log('FormMemory: Debounce timer triggered, hasUnsavedChanges:', this.hasUnsavedChanges);
      if (this.hasUnsavedChanges) {
        this.showSuggestUI();
      }
    }, 2000);
  }

  private onFormSubmit(form: HTMLFormElement, formIndex: number) {
    if (this.hasUnsavedChanges) {
      this.showSuggestUI(form, formIndex);
    }
  }

  private showSuggestUI(form?: HTMLFormElement, formIndex?: number) {
    if (this.suggestUI) {
      return;
    }

    console.log('Showing suggest UI for form:', formIndex);
    
    this.suggestUI = document.createElement('div');
    this.suggestUI.id = 'form-memory-suggest';
    this.suggestUI.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;
    
    this.suggestUI.innerHTML = `
      <div style="
        background: white;
        border: 1px solid #e1e5e9;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 300px;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      ">
        <button style="
          position: absolute;
          top: 8px;
          right: 8px;
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        " id="form-memory-close">×</button>
        <div style="
          margin-bottom: 12px;
          font-weight: 500;
          color: #333;
          line-height: 1.4;
        ">
          このフォームを保存しますか？
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="form-memory-save" style="
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            flex: 1;
            transition: all 0.2s ease;
          ">保存する</button>
          <button id="form-memory-dismiss" style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            flex: 1;
            transition: all 0.2s ease;
          ">今回は保存しない</button>
        </div>
      </div>
    `;

    // Add animation keyframes
    if (!document.getElementById('form-memory-styles')) {
      const style = document.createElement('style');
      style.id = 'form-memory-styles';
      style.textContent = `
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.suggestUI);

    const saveBtn = this.suggestUI.querySelector('#form-memory-save') as HTMLButtonElement;
    const dismissBtn = this.suggestUI.querySelector('#form-memory-dismiss') as HTMLButtonElement;
    const closeBtn = this.suggestUI.querySelector('#form-memory-close') as HTMLButtonElement;

    saveBtn.addEventListener('click', () => {
      this.saveFormData(form, formIndex);
      this.hideSuggestUI();
    });

    dismissBtn.addEventListener('click', () => {
      this.hideSuggestUI();
    });

    closeBtn.addEventListener('click', () => {
      this.hideSuggestUI();
    });

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (this.suggestUI) {
        this.hideSuggestUI();
      }
    }, 10000);
  }

  private hideSuggestUI() {
    if (this.suggestUI) {
      this.suggestUI.remove();
      this.suggestUI = null;
    }
    this.hasUnsavedChanges = false;
  }

  private async saveFormData(targetForm?: HTMLFormElement, targetFormIndex?: number) {
    const forms = targetForm ? [targetForm] : this.forms;
    
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const formIndex = targetForm ? targetFormIndex! : i;
      const formData = this.extractFormData(form);
      
      if (Object.keys(formData).length === 0) {
        continue;
      }

      const key = this.generateStorageKey(formIndex);
      const storedData: StoredFormData = {
        url: window.location.href,
        data: formData,
        timestamp: Date.now()
      };

      try {
        await chrome.runtime.sendMessage({
          action: 'saveFormData',
          key,
          data: storedData
        });
        console.log(`Form ${formIndex} data saved with key: ${key}`);
      } catch (error) {
        console.error('Failed to save form data:', error);
      }
    }
  }

  private extractFormData(form: HTMLFormElement): FormData {
    const data: FormData = {};
    const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = element.name || element.id || `field_${Math.random().toString(36).substr(2, 9)}`;

      // Skip security-sensitive fields
      if (this.shouldSkipField(element, name)) {
        console.log(`Skipping security field: ${name}`);
        return;
      }

      if (element.type === 'checkbox' || element.type === 'radio') {
        data[name] = (element as HTMLInputElement).checked;
      } else if (element.value && element.value.trim() !== '') {
        data[name] = element.value;
      }
    });

    return data;
  }

  private shouldSkipField(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, name: string): boolean {
    // Security-related field patterns to exclude
    const securityPatterns = [
      // CSRF tokens
      /csrf/i,
      /xsrf/i,
      /_token$/i,
      /authenticity_token/i,
      
      // Session and security tokens
      /session/i,
      /nonce/i,
      /security_token/i,
      /verification_token/i,
      
      // API keys and secrets
      /api_key/i,
      /secret/i,
      /private_key/i,
      
      // Passwords (additional patterns)
      /password/i,
      /passwd/i,
      /pwd/i,
      
      // One-time codes
      /otp/i,
      /verification_code/i,
      /auth_code/i,
      /captcha/i,
      
      // Hidden fields that are likely security-related
      /^__/,  // Fields starting with double underscore
      /_id$/i, // ID fields that might be sensitive
    ];

    // Check field name against patterns
    const nameMatches = securityPatterns.some(pattern => pattern.test(name));
    if (nameMatches) {
      return true;
    }

    // Check for password input types
    if (element.type === 'password') {
      return true;
    }

    // Check for hidden fields with security-related values
    if (element.type === 'hidden') {
      const value = element.value || '';
      // Skip hidden fields with token-like values (long random strings)
      if (value.length > 20 && /^[a-zA-Z0-9+/=_-]+$/.test(value)) {
        return true;
      }
    }

    // Check data attributes that might indicate security fields
    const securityDataAttrs = ['csrf', 'token', 'security', 'auth'];
    const hasSecurityAttr = securityDataAttrs.some(attr => 
      element.hasAttribute(`data-${attr}`) || 
      element.getAttribute('data-purpose')?.includes(attr)
    );
    
    if (hasSecurityAttr) {
      return true;
    }

    return false;
  }

  private async loadSavedData() {
    for (let i = 0; i < this.forms.length; i++) {
      const key = this.generateStorageKey(i);
      
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getFormData',
          key
        });

        if (response && response.data) {
          // Clean existing data before restoring
          const cleanedData = this.cleanSecurityFields(response.data.data);
          
          // If data was cleaned, save the cleaned version
          if (Object.keys(cleanedData).length !== Object.keys(response.data.data).length) {
            console.log(`Cleaning security fields from saved data for key: ${key}`);
            const cleanedStoredData = {
              ...response.data,
              data: cleanedData
            };
            
            await chrome.runtime.sendMessage({
              action: 'saveFormData',
              key,
              data: cleanedStoredData
            });
          }
          
          this.restoreFormData(this.forms[i], cleanedData);
          console.log(`Form ${i} data restored from key: ${key}`);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    }
  }

  private cleanSecurityFields(data: FormData): { [fieldName: string]: string | boolean } {
    const cleanedData: { [fieldName: string]: string | boolean } = {};
    
    for (const [fieldName, value] of Object.entries(data)) {
      // Create a mock element to test against shouldSkipField
      const mockElement = {
        name: fieldName,
        type: 'text',
        value: typeof value === 'string' ? value : '',
        hasAttribute: () => false,
        getAttribute: () => null
      } as any;
      
      if (!this.shouldSkipField(mockElement, fieldName)) {
        cleanedData[fieldName] = value;
      } else {
        console.log(`Removed security field from stored data: ${fieldName}`);
      }
    }
    
    return cleanedData;
  }

  private restoreFormData(form: HTMLFormElement, data: { [fieldName: string]: string | boolean }) {
    const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = element.name || element.id;
      
      // Skip security-sensitive fields during restoration too
      if (name && data.hasOwnProperty(name) && !this.shouldSkipField(element, name)) {
        const value = data[name];
        
        if (element.type === 'checkbox' || element.type === 'radio') {
          (element as HTMLInputElement).checked = Boolean(value);
        } else if (typeof value === 'string') {
          element.value = value;
        }
      }
    });
  }

  private generateStorageKey(formIndex: number): string {
    const url = new URL(window.location.href);
    return `${url.origin}${url.pathname}_form_${formIndex}`;
  }
}

console.log('FormMemory content script loaded');

function initFormMemory() {
  console.log('Document ready state:', document.readyState);
  new FormMemory();
}

if (document.readyState === 'loading') {
  console.log('Document still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initFormMemory);
} else {
  console.log('Document already loaded, initializing immediately');
  initFormMemory();
}

// Also try after a short delay to catch dynamic forms
setTimeout(() => {
  console.log('FormMemory: Checking for forms after delay...');
  const forms = document.querySelectorAll('form');
  if (forms.length > 0 && !document.getElementById('form-memory-suggest')) {
    console.log('FormMemory: Found forms after delay, re-initializing...');
    initFormMemory();
  }
}, 1000);