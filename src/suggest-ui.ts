import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('form-memory-suggest')
export class FormMemorySuggest extends LitElement {
  @property({ type: Boolean })
  visible = false;

  @property({ type: Number })
  formIndex = 0;

  @state()
  private isClosing = false;

  static styles = css`
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .suggest-container {
      background: white;
      border: 1px solid #e1e5e9;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      max-width: 300px;
      animation: slideIn 0.3s ease-out;
    }

    .suggest-container.closing {
      animation: slideOut 0.2s ease-in forwards;
    }

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

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }

    .message {
      margin-bottom: 12px;
      font-weight: 500;
      font-size: 14px;
      color: #333;
      line-height: 1.4;
    }

    .buttons {
      display: flex;
      gap: 8px;
    }

    .btn {
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s ease;
      flex: 1;
    }

    .btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #545b62;
    }

    .close-btn {
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
    }

    .close-btn:hover {
      color: #666;
    }
  `;

  render() {
    if (!this.visible) {
      return html``;
    }

    return html`
      <div class="suggest-container ${this.isClosing ? 'closing' : ''}">
        <button class="close-btn" @click="${this.handleDismiss}">×</button>
        <div class="message">
          このフォームを保存しますか？
        </div>
        <div class="buttons">
          <button class="btn btn-primary" @click="${this.handleSave}">
            保存する
          </button>
          <button class="btn btn-secondary" @click="${this.handleDismiss}">
            今回は保存しない
          </button>
        </div>
      </div>
    `;
  }

  private handleSave() {
    this.dispatchEvent(new CustomEvent('save-form', {
      detail: { formIndex: this.formIndex },
      bubbles: true,
      composed: true
    }));
    this.close();
  }

  private handleDismiss() {
    this.dispatchEvent(new CustomEvent('dismiss-suggest', {
      bubbles: true,
      composed: true
    }));
    this.close();
  }

  private close() {
    this.isClosing = true;
    setTimeout(() => {
      this.visible = false;
      this.isClosing = false;
      this.remove();
    }, 200);
  }

  show(formIndex: number = 0) {
    this.formIndex = formIndex;
    this.visible = true;
    this.isClosing = false;

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (this.visible && !this.isClosing) {
        this.close();
      }
    }, 10000);
  }
}

// Factory function to create and show suggest UI
export function showFormMemorySuggest(formIndex: number = 0): FormMemorySuggest {
  // Remove any existing suggest UI
  const existing = document.querySelector('form-memory-suggest');
  if (existing) {
    existing.remove();
  }

  const suggestUI = new FormMemorySuggest();
  document.body.appendChild(suggestUI);
  
  // Show after a brief delay to ensure it's in the DOM
  requestAnimationFrame(() => {
    suggestUI.show(formIndex);
  });

  return suggestUI;
}

declare global {
  interface HTMLElementTagNameMap {
    'form-memory-suggest': FormMemorySuggest;
  }
}