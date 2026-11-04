/** Sem JavaScript, os controles nativos do vídeo continuam disponíveis e nada é baixado antes do play. */
export function enableVideoPlayOverlay(): void {
  document.querySelectorAll<HTMLElement>('[data-video]').forEach((root) => {
    const player = root.querySelector('video');
    const play = root.querySelector<HTMLButtonElement>('[data-video-play]');
    if (!player || !play) return;

    play.hidden = false;
    play.addEventListener('click', () => {
      play.hidden = true;
      void player.play();
      player.focus();
    });
    player.addEventListener('play', () => {
      play.hidden = true;
    });
  });
}
