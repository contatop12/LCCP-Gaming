/**
 * Vídeo sob demanda. A página só traz uma capa leve (imagem AVIF/WebP, carregada quando chega perto da tela).
 * O <video> é criado depois do clique, então nem o arquivo nem a capa em JPEG são baixados antes disso.
 * Sem JavaScript, o <noscript> da página mostra o player nativo com controles.
 */
export function enableVideoPlayOverlay(): void {
  document.querySelectorAll<HTMLElement>('[data-video]').forEach((root) => {
    const facade = root.querySelector<HTMLButtonElement>('[data-video-open]');
    const sources = (root.dataset.sources ?? '').split(';').filter(Boolean);
    if (!facade || !sources.length) return;

    facade.hidden = false;
    facade.addEventListener('click', () => {
      const player = document.createElement('video');
      player.controls = true;
      player.playsInline = true;
      player.preload = 'auto';
      player.width = Number(root.dataset.width) || 464;
      player.height = Number(root.dataset.height) || 832;
      player.setAttribute('aria-label', root.dataset.title ?? 'Vídeo');
      for (const entry of sources) {
        const [src, type] = entry.split('|');
        const source = document.createElement('source');
        source.src = src!;
        if (type) source.type = type;
        player.append(source);
      }
      facade.replaceWith(player);
      void player.play().catch(() => {
        // Se o navegador bloquear a reprodução automática, os controles já estão na tela.
      });
      player.focus();
    });
  });
}
