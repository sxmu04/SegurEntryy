(() => {
  'use strict';

  const LOGO_URL = '/logo-segurentry.png';
  const APPLIED = 'data-segurentry-guard';

  const normalize = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  const fieldKey = (field) => normalize([
    field.name,
    field.id,
    field.getAttribute('formcontrolname'),
    field.getAttribute('aria-label'),
    field.placeholder
  ].filter(Boolean).join(' '));

  const rules = [
    {
      matches: (key) => /(^|\s)(name|nombre|fullname|full name|nombres|apellidos)(\s|$)/.test(key),
      pattern: "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{2,80}",
      min: 2,
      max: 80,
      help: 'Solo letras, espacios, guiones y apóstrofes. Entre 2 y 80 caracteres.',
      sanitize: (value) => value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]/g, '')
    },
    {
      matches: (key) => /(document|documento|identificacion|identificación|cedula|cédula)/.test(key) && !/(type|tipo)/.test(key),
      pattern: '[0-9]{6,15}',
      min: 6,
      max: 15,
      inputMode: 'numeric',
      help: 'Solo números. Entre 6 y 15 dígitos.',
      sanitize: (value) => value.replace(/\D/g, '').slice(0, 15)
    },
    {
      matches: (key) => /(phone|telefono|teléfono|celular|movil|móvil)/.test(key),
      pattern: '\\+?[0-9]{7,15}',
      min: 7,
      max: 16,
      inputMode: 'tel',
      help: 'Usa únicamente números; se permite + al inicio. Entre 7 y 15 dígitos.',
      sanitize: (value) => {
        const startsWithPlus = value.trim().startsWith('+');
        const digits = value.replace(/\D/g, '').slice(0, 15);
        return `${startsWithPlus ? '+' : ''}${digits}`;
      }
    },
    {
      matches: (key, field) => field.type === 'email' || /(email|correo)/.test(key),
      max: 120,
      inputMode: 'email',
      help: 'Ingresa un correo válido, por ejemplo usuario@dominio.com.',
      transform: (value) => value.replace(/\s/g, '').toLowerCase()
    },
    {
      matches: (key) => /(address|direccion|dirección)/.test(key),
      pattern: "[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9#.,°/\\ -]{3,120}",
      min: 3,
      max: 120,
      help: 'Se permiten letras, números, espacios y los símbolos # . , ° / -.',
      sanitize: (value) => value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9#.,°/\- ]/g, '')
    },
    {
      matches: (key) => /(invitation|invitacion|invitación|codigo|código|code)/.test(key),
      pattern: '[A-Za-z0-9-]{4,32}',
      min: 4,
      max: 32,
      help: 'Solo letras, números y guion. No uses espacios ni símbolos especiales.',
      sanitize: (value) => value.replace(/[^A-Za-z0-9-]/g, '').toUpperCase()
    },
    {
      matches: (key, field) => field.type === 'password' || /(password|contrasena|contraseña)/.test(key),
      min: 6,
      max: 72,
      help: 'Mínimo 6 caracteres. Puedes usar letras, números y símbolos.',
      transform: (value) => value.slice(0, 72)
    }
  ];

  const getRule = (field) => {
    const key = fieldKey(field);
    return rules.find((rule) => rule.matches(key, field)) || null;
  };

  const ensureHelp = (field, rule) => {
    if (!field.id) {
      field.id = `segurentry-field-${Math.random().toString(36).slice(2)}`;
    }

    const helpId = `${field.id}-segurentry-help`;
    let help = document.getElementById(helpId);

    if (!help) {
      help = document.createElement('small');
      help.id = helpId;
      help.className = 'segurentry-field-help';
      help.textContent = rule.help;
      field.insertAdjacentElement('afterend', help);
    }

    field.setAttribute('aria-describedby', helpId);
    field.title = rule.help;
  };

  const showFieldState = (field) => {
    const help = document.getElementById(`${field.id}-segurentry-help`);
    if (!help) return;
    const invalid = Boolean(field.value && !field.checkValidity());
    help.classList.toggle('is-error', invalid);
    field.classList.toggle('segurentry-invalid', invalid);
  };

  const configureField = (field) => {
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
    if (field.hasAttribute(APPLIED)) return;
    if (['hidden', 'file', 'checkbox', 'radio', 'date', 'datetime-local', 'time'].includes(field.type)) return;

    const rule = getRule(field);
    if (!rule) return;

    field.setAttribute(APPLIED, 'true');
    if (rule.pattern && field instanceof HTMLInputElement) field.pattern = rule.pattern;
    if (rule.min) field.minLength = rule.min;
    if (rule.max) field.maxLength = rule.max;
    if (rule.inputMode) field.inputMode = rule.inputMode;
    ensureHelp(field, rule);

    field.addEventListener('input', () => {
      const original = field.value;
      const nextValue = rule.sanitize
        ? rule.sanitize(original)
        : rule.transform
          ? rule.transform(original)
          : original;

      if (nextValue !== original) {
        field.value = nextValue;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
      showFieldState(field);
    });

    field.addEventListener('blur', () => showFieldState(field));
    field.addEventListener('invalid', () => showFieldState(field));
  };

  const ensureFormValidation = (form) => {
    if (!(form instanceof HTMLFormElement) || form.dataset.segurentryFormGuard === 'true') return;
    form.dataset.segurentryFormGuard = 'true';

    form.addEventListener('submit', (event) => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopImmediatePropagation();

        let alert = form.querySelector('.segurentry-form-alert');
        if (!alert) {
          alert = document.createElement('div');
          alert.className = 'segurentry-form-alert';
          form.prepend(alert);
        }

        alert.innerHTML = '<strong>Revisa el formulario.</strong><span>Hay campos con caracteres o formatos no permitidos. Consulta la indicación debajo de cada campo.</span>';
        form.querySelector(':invalid')?.focus();
      } else {
        form.querySelector('.segurentry-form-alert')?.remove();
      }
    }, true);
  };

  const format12HourToken = (hourText, minute, suffix = '') => {
    if (suffix && /am|pm/i.test(suffix)) return `${hourText}:${minute} ${suffix.toUpperCase()}`;
    const hour = Number(hourText);
    if (Number.isNaN(hour) || hour > 23) return `${hourText}:${minute}`;
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${hour % 12 || 12}:${minute} ${period}`;
  };

  const convertTimeText = (element) => {
    if (!(element instanceof HTMLElement)) return;
    Array.from(element.childNodes).forEach((node) => {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent) return;
      const current = node.textContent;
      const next = current.replace(
        /\b([01]?\d|2[0-3]):([0-5]\d)(?:\s*(AM|PM))?\b/gi,
        (_, hour, minute, suffix) => format12HourToken(hour, minute, suffix || '')
      );
      if (next !== current) node.textContent = next;
    });
  };

  const formatVisibleTimes = (root = document) => {
    root.querySelectorAll?.([
      'time',
      '.last-movement strong',
      '.stat-card.last-movement strong',
      '.access-row .access-user span',
      '.access-time',
      '.notification-time',
      '.report time',
      '[data-segurentry-time]'
    ].join(',')).forEach(convertTimeText);
  };

  const parseMovementCell = (cell) => {
    const text = cell?.textContent?.replace(/\s+/g, ' ').trim() || '';
    if (!text || /sin registro/i.test(text)) return null;

    const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!dateMatch || !timeMatch) return null;

    let hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    const period = (timeMatch[3] || '').toUpperCase();
    if (period === 'PM' && hour < 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;

    return new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]), hour, minute).getTime();
  };

  const updateInstructorPresence = () => {
    document.querySelectorAll('.students-table').forEach((table) => {
      const headerRow = table.querySelector('thead tr');
      if (!headerRow) return;

      const headers = Array.from(headerRow.children);
      if (!headers.some((header) => normalize(header.textContent) === 'presencia')) {
        const accountHeader = headers.find((header) => normalize(header.textContent) === 'estado');
        const th = document.createElement('th');
        th.className = 'segurentry-presence-header';
        th.textContent = 'Presencia';
        if (accountHeader) {
          headerRow.insertBefore(th, accountHeader);
          accountHeader.textContent = 'Cuenta';
        } else {
          headerRow.appendChild(th);
        }
      }

      table.querySelectorAll('tbody tr').forEach((row) => {
        const cells = Array.from(row.children);
        const lastEntry = parseMovementCell(cells[4]);
        const lastExit = parseMovementCell(cells[5]);
        const presence = lastEntry !== null && (lastExit === null || lastEntry > lastExit)
          ? 'inside'
          : 'outside';

        let presenceCell = row.querySelector('.segurentry-presence-cell');
        if (!presenceCell) {
          presenceCell = document.createElement('td');
          presenceCell.className = 'segurentry-presence-cell';
          const currentCells = Array.from(row.children);
          row.insertBefore(presenceCell, currentCells[currentCells.length - 1] || null);
        }

        if (presenceCell.dataset.presence !== presence) {
          presenceCell.dataset.presence = presence;
          const isInside = presence === 'inside';
          presenceCell.innerHTML = `<span class="segurentry-presence-badge ${isInside ? 'is-inside' : 'is-outside'}"><span class="segurentry-presence-dot"></span>${isInside ? 'Dentro' : 'Fuera'}</span>`;
          presenceCell.setAttribute('aria-label', isInside ? 'El aprendiz está dentro' : 'El aprendiz está fuera');
        }
      });
    });
  };

  const ensurePrintBrand = () => {
    if (document.querySelector('.segurentry-print-brand')) return;
    const brand = document.createElement('header');
    brand.className = 'segurentry-print-brand';
    brand.innerHTML = `<img src="${LOGO_URL}" alt="Logo SegurEntry"><div><strong>SegurEntry</strong><span>Reporte generado por el sistema</span></div>`;
    document.body.prepend(brand);
  };

  const scan = (root = document) => {
    root.querySelectorAll?.('input, textarea').forEach(configureField);
    root.querySelectorAll?.('form').forEach(ensureFormValidation);
    formatVisibleTimes(root);
    updateInstructorPresence();
  };

  let scheduled = false;
  const scheduleScan = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan(document);
    });
  };

  document.addEventListener('DOMContentLoaded', () => {
    ensurePrintBrand();
    scan(document);
    new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true, characterData: true });
  });

  window.addEventListener('beforeprint', () => {
    ensurePrintBrand();
    formatVisibleTimes(document);
  });
})();
