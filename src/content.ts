import { showFormMemorySuggest, FormMemorySuggest } from './suggest-ui.js';

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
  private suggestUI: FormMemorySuggest | null = null;

  constructor() {
    this.init();
  }

  private init() {
    this.detectForms();
    this.loadSavedData();
    this.setupEventListeners();
  }

  private detectForms() {
    this.forms = Array.from(document.querySelectorAll('form'));
    console.log(`Found ${this.forms.length} forms on page`);
  }

  private setupEventListeners() {
    this.forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');
      
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
    this.hasUnsavedChanges = true;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
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

    const targetFormIndex = formIndex ?? 0;
    this.suggestUI = showFormMemorySuggest(targetFormIndex);

    this.suggestUI.addEventListener('save-form', (event: any) => {
      const { formIndex: eventFormIndex } = event.detail;
      this.saveFormData(form, eventFormIndex);
      this.hideSuggestUI();
    });

    this.suggestUI.addEventListener('dismiss-suggest', () => {
      this.hideSuggestUI();
    });
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

      if (element.type === 'checkbox' || element.type === 'radio') {
        data[name] = (element as HTMLInputElement).checked;
      } else if (element.value && element.value.trim() !== '') {
        data[name] = element.value;
      }
    });

    return data;
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
          this.restoreFormData(this.forms[i], response.data.data);
          console.log(`Form ${i} data restored from key: ${key}`);
        }
      } catch (error) {
        console.error('Failed to load form data:', error);
      }
    }
  }

  private restoreFormData(form: HTMLFormElement, data: FormData) {
    const inputs = form.querySelectorAll('input:not([type="file"]), textarea, select');

    inputs.forEach(input => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const name = element.name || element.id;
      
      if (name && data.hasOwnProperty(name)) {
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new FormMemory();
  });
} else {
  new FormMemory();
}