/** Evento whatsapp_click. Não chama preventDefault, então a abertura do WhatsApp não espera o analytics. */
interface AnalyticsWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (command: string, name: string, params: Record<string, unknown>) => void;
}

export function trackWhatsappClicks(): void {
  const w = window as AnalyticsWindow;
  // Envia só o caminho da página e os rótulos do botão: nenhum dado pessoal nem o texto da mensagem.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      const link = target?.closest?.<HTMLAnchorElement>('a[data-wa-cta]');
      if (!link) return;
      const payload = {
        page_path: window.location.pathname,
        service_category: link.dataset.serviceCategory,
        cta_location: link.dataset.ctaLocation,
      };
      if (typeof w.gtag === 'function') {
        w.gtag('event', 'whatsapp_click', payload);
      } else {
        w.dataLayer = w.dataLayer || [];
        w.dataLayer.push({ event: 'whatsapp_click', ...payload });
      }
    },
    true,
  );
}
