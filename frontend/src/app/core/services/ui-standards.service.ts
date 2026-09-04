import { Injectable } from '@angular/core';

type SupportedField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type FieldKind =
  | 'name'
  | 'email'
  | 'documentType'
  | 'document'
  | 'phone'
  | 'address'
  | 'role'
  | 'invitation'
  | 'password'
  | 'confirmPassword';

interface ValidationRule {
  kind: FieldKind;
  hint: string;
}

@Injectable({
  providedIn: 'root'
})
export class UiStandardsService {

  private observer: MutationObserver | null = null;
  private started = false;
  private scanScheduled = false;

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return;
    }

    this.started = true;

    document.addEventListener('input', this.onFieldInteraction, true);
    document.addEventListener('change', this.onFieldInteraction, true);
    document.addEventListener('blur', this.onFieldInteraction, true);
    document.addEventListener('click', this.onActionClick, true);
    document.addEventListener('submit', this.onSubmit, true);
    document.addEventListener('keyup', this.onKeyup, true);

    this.observer = new MutationObserver(() => this.scheduleScan());
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    this.scan();
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;

    document.removeEventListener('input', this.onFieldInteraction, true);
    document.removeEventListener('change', this.onFieldInteraction, true);
    document.removeEventListener('blur', this.onFieldInteraction, true);
    document.removeEventListener('click', this.onActionClick, true);
    document.removeEventListener('submit', this.onSubmit, true);
    document.removeEventListener('keyup', this.onKeyup, true);

    this.started = false;
  }

  private scheduleScan(): void {
    if (this.scanScheduled) {
      return;
    }

    this.scanScheduled = true;

    requestAnimationFrame(() => {
      this.scanScheduled = false;
      this.scan();
    });
  }

  private scan(): void {
    document
      .querySelectorAll<SupportedField>('input, textarea, select')
      .forEach(field => this.configureField(field));

    this.formatDateTimeColumns();
    this.formatExplicitTimeElements();
  }

  // =========================================================
  // VALIDACIÓN DE FORMULARIOS
  // IMPORTANTE: nunca modifica field.value.
  // =========================================================

  private configureField(field: SupportedField): void {
    if (field.dataset['seValidationConfigured'] === 'true') {
      return;
    }

    const rule = this.getRule(field);

    if (!rule) {
      return;
    }

    field.dataset['seValidationConfigured'] = 'true';
    field.dataset['seValidationKind'] = rule.kind;

    const hint = document.createElement('small');
    hint.className = 'se-validation-hint';
    hint.dataset['seValidationFor'] = rule.kind;
    hint.textContent = rule.hint;

    const target = field.closest<HTMLElement>(
      '.input-group, .invitation-input, .password-input, .input-wrapper'
    ) || field;

    const next = target.nextElementSibling;

    if (!next?.classList.contains('se-validation-hint')) {
      target.insertAdjacentElement('afterend', hint);
    }
  }

  private getRule(field: SupportedField): ValidationRule | null {
    if (!this.isFieldEligible(field)) {
      return null;
    }

    const context = this.getFieldContext(field);

    if (/confirmar\s+contrasena|confirm\s*password|repetir\s+contrasena/.test(context)) {
      return {
        kind: 'confirmPassword',
        hint: 'Debe coincidir exactamente con la contraseña.'
      };
    }

    if (
      field instanceof HTMLInputElement && field.type === 'email' ||
      /correo|email|e-mail/.test(context)
    ) {
      return {
        kind: 'email',
        hint: 'Formato válido: usuario@dominio.com. Máximo 120 caracteres.'
      };
    }

    if (/tipo\s+de\s+documento|document\s*type/.test(context)) {
      return {
        kind: 'documentType',
        hint: 'Selecciona un tipo de documento válido (CC o TI).'
      };
    }

    if (
      /numero\s+de\s+documento|numero\s+documento|documento|cedula|identificacion/.test(context) &&
      !(field instanceof HTMLSelectElement)
    ) {
      return {
        kind: 'document',
        hint: 'Solo números. Entre 6 y 15 dígitos.'
      };
    }

    if (/telefono|celular|movil|phone/.test(context)) {
      return {
        kind: 'phone',
        hint: 'Solo números; se permite + al inicio. Entre 7 y 15 dígitos.'
      };
    }

    if (/direccion|address/.test(context)) {
      return {
        kind: 'address',
        hint: 'Letras, números, espacios y los símbolos # . , ° / -. Máximo 120 caracteres.'
      };
    }

    if (/codigo\s+de\s+invitacion|invitacion|invitation\s*code/.test(context)) {
      return {
        kind: 'invitation',
        hint: 'Solo letras, números y guion. Entre 4 y 40 caracteres.'
      };
    }

    if (
      field instanceof HTMLInputElement && field.type === 'password' ||
      /contrasena|password/.test(context)
    ) {
      return {
        kind: 'password',
        hint: 'Entre 6 y 72 caracteres.'
      };
    }

    if (/\brol\b|\brole\b/.test(context) && field instanceof HTMLSelectElement) {
      return {
        kind: 'role',
        hint: 'Selecciona un rol para continuar.'
      };
    }

    if (/nombre\s+completo|\bnombre\b|full\s*name|\bname\b/.test(context)) {
      return {
        kind: 'name',
        hint: 'Solo letras, espacios, guiones y apóstrofes. Entre 2 y 80 caracteres.'
      };
    }

    return null;
  }

  private isFieldEligible(field: SupportedField): boolean {
    if (field.disabled || field.closest('[hidden]')) {
      return false;
    }

    if (field instanceof HTMLInputElement) {
      const excludedTypes = new Set([
        'hidden',
        'file',
        'checkbox',
        'radio',
        'date',
        'time',
        'datetime-local',
        'color',
        'range'
      ]);

      if (excludedTypes.has(field.type)) {
        return false;
      }
    }

    const placeholder = this.normalize(field.getAttribute('placeholder') || '');
    const aria = this.normalize(field.getAttribute('aria-label') || '');

    if (
      placeholder.startsWith('buscar') ||
      placeholder.startsWith('search') ||
      aria.startsWith('buscar') ||
      aria.startsWith('search')
    ) {
      return false;
    }

    if (
      field.closest(
        '.users-search, .admin-report-search, .admin-biometric-search, .notification-search, .search-box, [role="search"]'
      )
    ) {
      return false;
    }

    return true;
  }

  private getFieldContext(field: SupportedField): string {
    const pieces: string[] = [
      field.id,
      field.getAttribute('name') || '',
      field.getAttribute('formcontrolname') || '',
      field.getAttribute('placeholder') || '',
      field.getAttribute('aria-label') || ''
    ];

    const parent = field.closest<HTMLElement>(
      '.form-group, .field, .admin-report-field, .profile-field, .settings-field, .form-field'
    );

    if (parent) {
      const label = parent.querySelector('label');
      if (label?.textContent) {
        pieces.push(label.textContent);
      }
    }

    if (field.id) {
      const safeId = field.id.replace(/"/g, '\\"');
      const externalLabel = document.querySelector<HTMLLabelElement>(
        `label[for="${safeId}"]`
      );

      if (externalLabel?.textContent) {
        pieces.push(externalLabel.textContent);
      }
    }

    return this.normalize(pieces.join(' '));
  }

  private readonly onFieldInteraction = (event: Event): void => {
    const target = event.target;

    if (!this.isSupportedField(target)) {
      return;
    }

    const rule = this.getRule(target);

    if (!rule) {
      return;
    }

    if (
      event.type === 'blur' ||
      event.type === 'change' ||
      String(target.value || '').length > 0
    ) {
      target.dataset['seTouched'] = 'true';
    }

    this.validateField(target, false);
  };

  private readonly onActionClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('button, input[type="submit"]');

    if (!button || button.disabled) {
      return;
    }

    const action = this.normalize(
      button instanceof HTMLInputElement
        ? button.value
        : button.textContent || ''
    );

    if (!this.isValidationAction(action)) {
      return;
    }

    const scope = this.findValidationScope(button);

    if (!scope || !this.scopeHasValidatableFields(scope)) {
      return;
    }

    if (!this.validateScope(scope)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private readonly onSubmit = (event: Event): void => {
    const form = event.target;

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    if (!this.scopeHasValidatableFields(form)) {
      return;
    }

    if (!this.validateScope(form)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private readonly onKeyup = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter') {
      return;
    }

    const target = event.target;

    if (!this.isSupportedField(target)) {
      return;
    }

    const scope = this.findValidationScope(target);

    if (!scope || !this.scopeHasValidatableFields(scope)) {
      return;
    }

    const scopeText = this.normalize(scope.textContent || '');

    if (!/(crear\s+cuenta|iniciar\s+sesion|guardar|actualizar|registrar)/.test(scopeText)) {
      return;
    }

    if (!this.validateScope(scope)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };

  private isValidationAction(action: string): boolean {
    return /(^|\s)(guardar|actualizar|registrar|crear\s+cuenta|crear\s+usuario|iniciar\s+sesion|enviar|confirmar|solicitar)(\s|$)/.test(
      action
    );
  }

  private findValidationScope(element: Element): HTMLElement | null {
    return element.closest<HTMLElement>(
      'form, .modal, .auth-card, .register-card, .setup-card, .profile-card-edit, .settings-card'
    );
  }

  private scopeHasValidatableFields(scope: HTMLElement): boolean {
    return Array.from(
      scope.querySelectorAll<SupportedField>('input, textarea, select')
    ).some(field => !!this.getRule(field));
  }

  private validateScope(scope: HTMLElement): boolean {
    const fields = Array.from(
      scope.querySelectorAll<SupportedField>('input, textarea, select')
    ).filter(field => !!this.getRule(field));

    fields.forEach(field => {
      this.configureField(field);
      field.dataset['seTouched'] = 'true';
    });

    const invalidFields = fields.filter(
      field => !this.validateField(field, true)
    );

    if (!invalidFields.length) {
      this.removeFormAlert(scope);
      return true;
    }

    this.showFormAlert(scope, invalidFields.length);
    invalidFields[0].focus();
    return false;
  }

  private validateField(field: SupportedField, force: boolean): boolean {
    const rule = this.getRule(field);

    if (!rule) {
      return true;
    }

    const scope = this.findValidationScope(field) || field.parentElement || document.body;
    const value = String(field.value ?? '');
    const trimmed = value.trim();
    const required = this.isRequired(field, rule.kind, scope);

    let valid = true;
    let errorMessage = rule.hint;

    if (!trimmed && required) {
      valid = false;
      errorMessage = 'Este campo es obligatorio.';
    } else if (!trimmed) {
      valid = true;
    } else {
      switch (rule.kind) {
        case 'name':
          valid = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,80}$/.test(trimmed);
          break;

        case 'email':
          valid = trimmed.length <= 120 &&
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed);
          break;

        case 'documentType':
          valid = /^(CC|TI)$/i.test(trimmed);
          break;

        case 'document':
          valid = /^\d{6,15}$/.test(trimmed);
          break;

        case 'phone':
          valid = /^\+?\d{7,15}$/.test(trimmed);
          break;

        case 'address':
          valid = trimmed.length >= 3 &&
            trimmed.length <= 120 &&
            /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9#.,°/\- ]+$/.test(trimmed);
          break;

        case 'role':
          valid = trimmed !== '' &&
            !/^(seleccionar|seleccione|todos)$/i.test(trimmed);
          break;

        case 'invitation':
          valid = /^[A-Za-z0-9-]{4,40}$/.test(trimmed);
          break;

        case 'password':
          valid = value.length >= 6 && value.length <= 72;
          break;

        case 'confirmPassword': {
          const passwordField = Array.from(
            scope.querySelectorAll<SupportedField>('input, textarea, select')
          ).find(candidate => this.getRule(candidate)?.kind === 'password');

          valid = value.length >= 6 &&
            value.length <= 72 &&
            !!passwordField &&
            value === passwordField.value;
          break;
        }
      }
    }

    const touched = force || field.dataset['seTouched'] === 'true';
    this.renderFieldState(field, valid, touched, errorMessage, rule.hint);

    return valid;
  }

  private isRequired(
    field: SupportedField,
    kind: FieldKind,
    scope: HTMLElement
  ): boolean {
    if (field.hasAttribute('required')) {
      return true;
    }

    const text = this.normalize(scope.textContent || '');

    const userManagement =
      /registrar\s+usuario|editar\s+usuario|nuevo\s+usuario|crear\s+usuario/.test(text);

    const accountCreation =
      /crear\s+cuenta|completa\s+tu\s+registro|registro\s+protegido/.test(text);

    const login = /iniciar\s+sesion|bienvenido\s+de\s+nuevo/.test(text);

    const superAdminSetup =
      /super\s*admin|super\s+administrador/.test(text) &&
      /crear|configurar|setup|registrar/.test(text);

    if (userManagement) {
      return [
        'name',
        'email',
        'documentType',
        'document',
        'role'
      ].includes(kind);
    }

    if (accountCreation) {
      return [
        'email',
        'invitation',
        'password',
        'confirmPassword'
      ].includes(kind);
    }

    if (login) {
      return ['email', 'password'].includes(kind);
    }

    if (superAdminSetup) {
      return [
        'name',
        'email',
        'documentType',
        'document',
        'password',
        'confirmPassword'
      ].includes(kind);
    }

    return false;
  }

  private renderFieldState(
    field: SupportedField,
    valid: boolean,
    touched: boolean,
    errorMessage: string,
    defaultHint: string
  ): void {
    const target = field.closest<HTMLElement>(
      '.input-group, .invitation-input, .password-input, .input-wrapper'
    ) || field;

    const hint = target.nextElementSibling?.classList.contains('se-validation-hint')
      ? target.nextElementSibling as HTMLElement
      : null;

    const showError = touched && !valid;

    field.classList.toggle('se-field-invalid', showError);
    field.classList.toggle('se-field-valid', touched && valid && !!field.value);
    target.classList.toggle('se-field-invalid-container', showError);

    field.setAttribute('aria-invalid', showError ? 'true' : 'false');

    if (hint) {
      hint.classList.toggle('is-error', showError);
      hint.classList.toggle('is-valid', touched && valid && !!field.value);
      hint.textContent = showError ? errorMessage : defaultHint;
    }
  }

  private showFormAlert(scope: HTMLElement, count: number): void {
    const host = scope instanceof HTMLFormElement
      ? scope
      : scope.querySelector<HTMLElement>('form') || scope;

    let alert = host.querySelector<HTMLElement>(':scope > .se-form-alert');

    if (!alert) {
      alert = document.createElement('div');
      alert.className = 'se-form-alert';
      host.prepend(alert);
    }

    alert.innerHTML = `
      <span class="se-form-alert-icon" aria-hidden="true">!</span>
      <span>
        <strong>Revisa el formulario</strong>
        <small>${count === 1 ? 'Hay 1 campo con un valor inválido.' : `Hay ${count} campos con valores inválidos.`} Corrige lo marcado en rojo para continuar.</small>
      </span>
    `;
  }

  private removeFormAlert(scope: HTMLElement): void {
    const host = scope instanceof HTMLFormElement
      ? scope
      : scope.querySelector<HTMLElement>('form') || scope;

    host.querySelector(':scope > .se-form-alert')?.remove();
  }

  private isSupportedField(value: EventTarget | null): value is SupportedField {
    return value instanceof HTMLInputElement ||
      value instanceof HTMLTextAreaElement ||
      value instanceof HTMLSelectElement;
  }

  // =========================================================
  // FORMATO DE HORA 12 HORAS + AM / PM
  // =========================================================

  private formatDateTimeColumns(): void {
    document.querySelectorAll<HTMLTableElement>('table').forEach(table => {
      const headerRow = table.querySelector('thead tr');

      if (!headerRow) {
        return;
      }

      const indexes = Array.from(headerRow.children)
        .map((header, index) => ({
          index,
          text: this.normalize(header.textContent || '')
        }))
        .filter(item =>
          item.text === 'fecha' ||
          item.text === 'hora' ||
          item.text.includes('fecha y hora') ||
          item.text.includes('ultimo ingreso') ||
          item.text.includes('ultima salida') ||
          item.text.includes('ultimo acceso')
        )
        .map(item => item.index);

      if (!indexes.length) {
        return;
      }

      table.querySelectorAll('tbody tr').forEach(row => {
        const cells = Array.from(row.children);

        indexes.forEach(index => {
          const cell = cells[index];

          if (cell instanceof HTMLElement) {
            this.convertTimeText(cell);
          }
        });
      });
    });
  }

  private formatExplicitTimeElements(): void {
    document.querySelectorAll<HTMLElement>([
      'time',
      '.report-date-cell',
      '.access-time',
      '.access-date',
      '.notification-time',
      '.last-movement',
      '[data-se-time]',
      '[class*="timestamp"]'
    ].join(',')).forEach(element => this.convertTimeText(element));
  }

  private convertTimeText(element: HTMLElement): void {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT
    );

    const nodes: Text[] = [];
    let node = walker.nextNode();

    while (node) {
      if (node instanceof Text) {
        nodes.push(node);
      }
      node = walker.nextNode();
    }

    nodes.forEach(textNode => {
      const current = textNode.textContent || '';
      const next = current.replace(
        /\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b(?!\s*(?:AM|PM|a\.?\s*m\.?|p\.?\s*m\.?))/gi,
        (_match, hourText: string, minute: string, second?: string) => {
          const hour = Number(hourText);
          const period = hour >= 12 ? 'PM' : 'AM';
          const displayHour = hour % 12 || 12;
          const seconds = second ? `:${second}` : '';

          return `${displayHour}:${minute}${seconds} ${period}`;
        }
      );

      if (next !== current) {
        textNode.textContent = next;
      }
    });
  }

  private normalize(value: string): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
}
