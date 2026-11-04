/**
 * Mapa sob demanda: a página só mostra uma arte local e o botão. O iframe do Google é criado depois do clique,
 * então nenhuma requisição a terceiros acontece antes disso. Sem JavaScript, fica o link "Abrir no Google Maps".
 */
export function enableMapFacade(): void {
  document.querySelectorAll<HTMLElement>('[data-map]').forEach((root) => {
    const button = root.querySelector<HTMLButtonElement>('[data-map-load]');
    const note = root.querySelector<HTMLElement>('[data-map-note]');
    const src = root.dataset.src;
    if (!button || !src) return;
    button.hidden = false;
    if (note) note.hidden = false;
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.className = 'map__frame';
      frame.src = src;
      frame.title = root.dataset.title ?? 'Mapa do Google';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.allowFullscreen = true;
      root.append(frame);
      root.classList.add('map--loaded');
      frame.focus();
    });
  });
}
