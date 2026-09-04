import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ReportBrandingService {

  private observer: MutationObserver | null = null;
  private started = false;
  private readonly logoPath = '/logo-segurentry.png';

  start(): void {
    if (this.started || typeof document === 'undefined') {
      return;
    }

    this.started = true;

    this.installStyles();
    this.decorateVisibleReports();

    this.observer = new MutationObserver(() => {
      this.decorateVisibleReports();
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener(
      'click',
      this.handleReportClick,
      true
    );
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;

    document.removeEventListener(
      'click',
      this.handleReportClick,
      true
    );

    this.started = false;
  }

  private installStyles(): void {
    if (document.getElementById('segurentry-report-branding-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'segurentry-report-branding-styles';
    style.textContent = `
      .segurentry-admin-report-brand {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
        padding: 18px 20px;
        margin-bottom: 18px;
        border: 1px solid rgba(16, 185, 129, .24);
        border-radius: 18px;
        background:
          radial-gradient(circle at 95% 15%, rgba(34, 197, 94, .13), transparent 34%),
          linear-gradient(135deg, rgba(9, 20, 38, .98), rgba(13, 31, 54, .96));
        box-shadow: 0 14px 34px rgba(0, 0, 0, .14);
      }

      .segurentry-admin-report-brand-main {
        display: flex;
        align-items: center;
        gap: 15px;
        min-width: 0;
      }

      .segurentry-admin-report-brand-logo {
        width: 64px;
        height: 64px;
        flex: 0 0 64px;
        object-fit: contain;
        border-radius: 15px;
        padding: 7px;
        background: rgba(255, 255, 255, .06);
        border: 1px solid rgba(34, 197, 94, .25);
      }

      .segurentry-admin-report-brand-copy {
        display: grid;
        gap: 3px;
        min-width: 0;
      }

      .segurentry-admin-report-brand-copy strong {
        color: #f8fafc;
        font-size: 1.08rem;
        line-height: 1.2;
      }

      .segurentry-admin-report-brand-copy span {
        color: #94a3b8;
        font-size: .8rem;
        line-height: 1.35;
      }

      .segurentry-admin-report-brand-badge {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        flex: 0 0 auto;
        padding: 8px 11px;
        border-radius: 999px;
        color: #86efac;
        background: rgba(34, 197, 94, .1);
        border: 1px solid rgba(34, 197, 94, .2);
        font-size: .72rem;
        font-weight: 800;
        letter-spacing: .04em;
        text-transform: uppercase;
      }

      .segurentry-admin-report-brand-badge::before {
        content: '';
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #22c55e;
        box-shadow: 0 0 0 4px rgba(34, 197, 94, .1);
      }

      @media (max-width: 640px) {
        .segurentry-admin-report-brand {
          align-items: flex-start;
          flex-direction: column;
        }

        .segurentry-admin-report-brand-logo {
          width: 54px;
          height: 54px;
          flex-basis: 54px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private decorateVisibleReports(): void {
    const sections = document.querySelectorAll<HTMLElement>(
      '.admin-reports-section'
    );

    sections.forEach(section => {
      if (section.querySelector('.segurentry-admin-report-brand')) {
        return;
      }

      const brand = document.createElement('div');
      brand.className = 'segurentry-admin-report-brand';
      brand.setAttribute('aria-label', 'Reporte oficial SegurEntry');

      const main = document.createElement('div');
      main.className = 'segurentry-admin-report-brand-main';

      const logo = document.createElement('img');
      logo.className = 'segurentry-admin-report-brand-logo';
      logo.src = this.logoPath;
      logo.alt = 'Logo SegurEntry';

      const copy = document.createElement('div');
      copy.className = 'segurentry-admin-report-brand-copy';

      const title = document.createElement('strong');
      title.textContent = 'SegurEntry';

      const subtitle = document.createElement('span');
      subtitle.textContent = 'Reporte oficial de control y trazabilidad de accesos';

      copy.append(title, subtitle);
      main.append(logo, copy);

      const badge = document.createElement('span');
      badge.className = 'segurentry-admin-report-brand-badge';
      badge.textContent = 'Reporte del sistema';

      brand.append(main, badge);

      const header = section.querySelector('.admin-report-header');
      section.insertBefore(brand, header || section.firstChild);
    });
  }

  private readonly handleReportClick = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const button = target.closest<HTMLButtonElement>('button');

    if (!button) {
      return;
    }

    const section = button.closest('.admin-reports-section');

    if (!section) {
      return;
    }

    const text = String(button.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (!text.includes('generar pdf')) {
      return;
    }

    this.brandNextPrintWindow();
  };

  private brandNextPrintWindow(): void {
    const originalOpen = window.open;
    let restored = false;

    const restore = (): void => {
      if (restored) {
        return;
      }

      restored = true;
      window.open = originalOpen;
    };

    window.open = ((...args: Parameters<typeof window.open>) => {
      const printWindow = originalOpen.apply(window, args);

      if (printWindow) {
        this.waitAndBrandPrintWindow(printWindow);
      }

      restore();
      return printWindow;
    }) as typeof window.open;

    window.setTimeout(restore, 0);
  }

  private waitAndBrandPrintWindow(printWindow: Window): void {
    let attempts = 0;

    const timer = window.setInterval(() => {
      attempts += 1;

      try {
        const header = printWindow.document.querySelector<HTMLElement>(
          '.header'
        );

        if (header) {
          window.clearInterval(timer);
          this.decoratePrintWindow(printWindow, header);
          return;
        }
      } catch {
        window.clearInterval(timer);
        return;
      }

      if (attempts >= 20) {
        window.clearInterval(timer);
      }
    }, 10);
  }

  private decoratePrintWindow(
    printWindow: Window,
    header: HTMLElement
  ): void {
    if (header.querySelector('.segurentry-pdf-brand')) {
      return;
    }

    const doc = printWindow.document;

    const style = doc.createElement('style');
    style.textContent = `
      .segurentry-pdf-brand {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 16px;
      }

      .segurentry-pdf-brand img {
        width: 68px;
        height: 68px;
        object-fit: contain;
      }

      .segurentry-pdf-brand-copy {
        display: grid;
        gap: 2px;
      }

      .segurentry-pdf-brand-copy strong {
        color: #0f172a;
        font-size: 22px;
      }

      .segurentry-pdf-brand-copy span {
        color: #64748b;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      @media print {
        .segurentry-pdf-brand img {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
      }
    `;

    doc.head.appendChild(style);

    const brand = doc.createElement('div');
    brand.className = 'segurentry-pdf-brand';

    const logo = doc.createElement('img');
    logo.src = `${window.location.origin}${this.logoPath}`;
    logo.alt = 'Logo SegurEntry';

    const copy = doc.createElement('div');
    copy.className = 'segurentry-pdf-brand-copy';

    const title = doc.createElement('strong');
    title.textContent = 'SegurEntry';

    const subtitle = doc.createElement('span');
    subtitle.textContent = 'Control de accesos · Reporte oficial';

    copy.append(title, subtitle);
    brand.append(logo, copy);
    header.prepend(brand);
  }
}
