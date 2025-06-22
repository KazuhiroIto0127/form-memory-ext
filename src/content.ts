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
        input.addEventListener('input', () => this.onInputChange());
        input.addEventListener('change', () => this.onInputChange());
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

    // Check if this is a login/authentication/signup form and skip if so
    const targetForm = form || (formIndex !== undefined ? this.forms[formIndex] : this.forms[0]);
    if (targetForm && this.isAuthenticationForm(targetForm)) {
      console.log('Skipping suggest UI for authentication form');
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
    const processedRadioGroups = new Set<string>();
    const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = element.name || element.id || `field_${Math.random().toString(36).substring(2, 11)}`;

      // Skip security-sensitive fields
      if (this.shouldSkipField(element, name)) {
        console.log(`Skipping security field: ${name}`);
        return;
      }

      if (element.type === 'radio') {
        // Handle radio buttons as groups - only save the selected value
        if (!processedRadioGroups.has(name)) {
          processedRadioGroups.add(name);
          // Use more specific selector to avoid hidden fields with same name
          const checkedRadio = form.querySelector(`input[type="radio"][name="${this.escapeSelector(name)}"]:checked`) as HTMLInputElement;
          if (checkedRadio) {
            data[name] = checkedRadio.value;
          }
        }
      } else if (element.type === 'checkbox') {
        // Handle checkboxes individually
        if ((element as HTMLInputElement).checked) {
          // For checked checkboxes, save the value or true
          data[name] = element.value || true;
        }
      } else if (element.value && element.value.trim() !== '') {
        // Handle other input types
        data[name] = element.value;
      }
    });

    return data;
  }

  private escapeSelector(selector: string): string {
    // Escape special characters in CSS selectors
    return selector.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&');
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

  private isAuthenticationForm(form: HTMLFormElement): boolean {
    // Check for password fields - strong indicator of authentication form
    const passwordFields = form.querySelectorAll('input[type="password"]');
    if (passwordFields.length > 0) {
      console.log('Found password field(s), treating as authentication form');
      return true;
    }

    // Check form attributes and classes for authentication indicators
    const authPatterns = [
      // Login patterns
      /login/i,
      /signin/i,
      /sign-in/i,
      
      // Registration/signup patterns
      /signup/i,
      /sign-up/i,
      /register/i,
      /registration/i,
      /create.*account/i,
      /new.*account/i,
      /join/i,
      
      // General auth patterns
      /auth/i,
      /authenticate/i,
      /credential/i,
      /password/i,
      /user-login/i,
      /account-login/i,
      /member-login/i,
      /user-register/i,
      /account-register/i,
      /member-register/i
    ];

    // Check form id, class, name, and action
    const formIdentifiers = [
      form.id,
      form.className,
      form.getAttribute('name') || '',
      form.getAttribute('action') || ''
    ].join(' ').toLowerCase();

    const isAuthByIdentifier = authPatterns.some(pattern => pattern.test(formIdentifiers));
    if (isAuthByIdentifier) {
      console.log('Form identified as authentication form by identifier patterns');
      return true;
    }

    // Check for common authentication field patterns
    const inputs = form.querySelectorAll('input');
    const fieldNames = Array.from(inputs).map(input => 
      (input.name || input.id || input.placeholder || '').toLowerCase()
    ).join(' ');

    const authFieldPatterns = [
      // Login patterns
      /username.*password/,
      /email.*password/,
      /user.*pass/,
      /login.*pass/,
      /signin.*pass/,
      
      // Registration patterns
      /email.*confirm/,
      /password.*confirm/,
      /confirm.*password/,
      /repeat.*password/,
      /first.*name.*last.*name/,
      /firstname.*lastname/,
      /terms.*conditions/,
      /terms.*service/,
      /privacy.*policy/,
      /agree.*terms/
    ];

    const hasAuthFieldPattern = authFieldPatterns.some(pattern => pattern.test(fieldNames));
    if (hasAuthFieldPattern) {
      console.log('Form identified as authentication form by field patterns');
      return true;
    }

    // Check for buttons/submits with authentication text
    const buttons = form.querySelectorAll('button, input[type="submit"], input[type="button"]');
    const buttonTexts = Array.from(buttons).map(button => 
      (button.textContent || button.getAttribute('value') || '').toLowerCase()
    ).join(' ');

    const authButtonPatterns = [
      // Login patterns
      /login/i,
      /sign\s*in/i,
      /log\s*in/i,
      /ログイン/,
      /サインイン/,
      
      // Registration patterns
      /sign\s*up/i,
      /register/i,
      /create.*account/i,
      /join.*now/i,
      /get.*started/i,
      /会員登録/,
      /登録/,
      /アカウント作成/,
      /新規登録/
    ];

    const hasAuthButton = authButtonPatterns.some(pattern => pattern.test(buttonTexts));
    if (hasAuthButton) {
      console.log('Form identified as authentication form by button text');
      return true;
    }

    // Check surrounding text for authentication context
    const formContainer = form.closest('div, section, main, article') || form;
    const contextText = (formContainer.textContent || '').toLowerCase();
    
    const contextPatterns = [
      // Login patterns
      /sign\s+in/i,
      /log\s+in/i,
      /ログイン/,
      
      // Registration patterns
      /sign\s+up/i,
      /register/i,
      /create.*account/i,
      /new.*account/i,
      /join.*us/i,
      /get.*started/i,
      /会員登録/,
      /新規登録/,
      /アカウント作成/,
      
      // Common patterns
      /パスワード/,
      /terms.*conditions/i,
      /privacy.*policy/i
    ];

    const hasAuthContext = contextPatterns.some(pattern => pattern.test(contextText));
    if (hasAuthContext && inputs.length <= 8) { // Allow more fields for registration
      console.log('Form identified as authentication form by context');
      return true;
    }

    // Check for multiple password fields (registration forms often have password confirmation)
    if (passwordFields.length >= 2) {
      console.log('Multiple password fields found, likely registration form');
      return true;
    }

    // Check for email verification patterns in registration forms
    const emailFields = form.querySelectorAll('input[type="email"]');
    if (emailFields.length > 0 && inputs.length >= 3) {
      const hasRegistrationIndicators = [
        /confirm/i,
        /verify/i,
        /agree/i,
        /terms/i,
        /newsletter/i,
        /firstname/i,
        /lastname/i,
        /full.*name/i
      ].some(pattern => pattern.test(fieldNames));
      
      if (hasRegistrationIndicators) {
        console.log('Email field with registration indicators found');
        return true;
      }
    }

    return false;
  }

  private async loadSavedData() {
    for (let i = 0; i < this.forms.length; i++) {
      const form = this.forms[i];
      
      // Skip authentication forms for data restoration too
      if (this.isAuthenticationForm(form)) {
        console.log(`Skipping data restoration for authentication form ${i}`);
        continue;
      }
      
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
          
          this.restoreFormData(form, cleanedData);
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
    const processedRadioGroups = new Set<string>();

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = element.name || element.id;
      
      // Skip security-sensitive fields during restoration too
      if (name && data.hasOwnProperty(name) && !this.shouldSkipField(element, name)) {
        const value = data[name];
        
        if (element.type === 'radio') {
          // Handle radio buttons as groups to avoid setting multiple radios
          if (!processedRadioGroups.has(name)) {
            processedRadioGroups.add(name);
            
            // First, uncheck all radio buttons in this group
            const allRadios = form.querySelectorAll(`input[type="radio"][name="${this.escapeSelector(name)}"]`);
            allRadios.forEach(radio => {
              (radio as HTMLInputElement).checked = false;
            });
            
            // Then check the radio button with matching value
            if (typeof value === 'string') {
              const targetRadio = form.querySelector(`input[type="radio"][name="${this.escapeSelector(name)}"][value="${this.escapeSelector(value)}"]`) as HTMLInputElement;
              if (targetRadio) {
                targetRadio.checked = true;
                // Trigger change event to notify other scripts
                targetRadio.dispatchEvent(new Event('change', { bubbles: true }));
              }
            }
          }
        } else if (element.type === 'checkbox') {
          // For checkboxes, handle both boolean and value-based storage
          const inputElement = element as HTMLInputElement;
          if (typeof value === 'boolean') {
            inputElement.checked = value;
          } else if (typeof value === 'string') {
            // If we stored the checkbox value, check if it matches
            inputElement.checked = (inputElement.value === value) || (value === 'true');
          }
          
          // Trigger change event
          inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (typeof value === 'string') {
          // Handle other input types
          element.value = value;
          // Trigger input event
          element.dispatchEvent(new Event('input', { bubbles: true }));
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