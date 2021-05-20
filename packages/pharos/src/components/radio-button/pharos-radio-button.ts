import { html, property, query } from 'lit-element';
import type { TemplateResult, CSSResultArray } from 'lit-element';
import { radioButtonStyles } from './pharos-radio-button.css';
import { designTokens } from '../../styles/variables.css';
import { customElement } from '../../utils/decorators';

import { FormElement } from '../base/form-element';
import FormMixin from '../../utils/mixins/form';

const LINKS = `a[href],pharos-link[href]`;
const matchesFunc = 'matches' in Element.prototype ? 'matches' : 'msMatchesSelector';

/**
 * Pharos radio button component.
 *
 * @element pharos-radio-button
 *
 * @slot label - Contains the label content.
 *
 * @fires change - Fires when the value has changed
 */
@customElement('pharos-radio-button')
export class PharosRadioButton extends FormMixin(FormElement) {
  /**
   * Indicates if radio is checked.
   * @attr checked
   */
  @property({ type: Boolean, reflect: true })
  public checked = false;

  /**
   * Indicates the value for the input.
   * @attr value
   */
  @property({ type: String, reflect: true })
  public value = '';

  @query('#radio-element')
  private _radio!: HTMLInputElement;

  public static get styles(): CSSResultArray {
    return [designTokens, super.styles, radioButtonStyles];
  }

  protected firstUpdated(): void {
    this._radio.defaultChecked = this.checked;
  }

  public onChange(): void {
    this.checked = this._radio.checked;

    this.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      })
    );
  }

  _handleFormdata(event: CustomEvent): void {
    const { formData } = event;
    if (!this.disabled && this.checked) {
      formData.append(this.name, this.value);
    }
  }

  _handleFormReset(): void {
    this.checked = this._radio.defaultChecked;
  }

  private _handleClick(event: Event): void {
    if (!(event.target as Element)[matchesFunc](LINKS)) {
      event.preventDefault();
      event.stopPropagation();
      this._radio.click();
      this._radio.focus();
    }
  }

  protected render(): TemplateResult {
    return html`
      <input
        id="radio-element"
        name=${this.name}
        type="radio"
        .value=${this.value}
        .checked=${this.checked}
        ?required="${this.required}"
        ?disabled=${this.disabled}
        @change=${this.onChange}
      />
      <div class="input-wrapper">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          version="1.1"
          viewBox="0 0 24 24"
          width="24"
          height="24"
          class="input__icon"
          role="img"
          aria-label="radio button"
          focusable="false"
          @click="${this._handleClick}"
        >
          <circle cx="50%" cy="50%" r="9" class="focus" />
          <circle cx="50%" cy="50%" r="8" class="outer" />
          <circle cx="50%" cy="50%" r="7" class="hover" />
          <circle cx="50%" cy="50%" r="5" class="inner" />
        </svg>
        <label for="radio-element" @click="${this._handleClick}">
          <slot name="label"></slot>
          ${this.requiredIndicator}
        </label>
      </div>
      ${this.messageContent}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pharos-radio-button': PharosRadioButton;
  }
}