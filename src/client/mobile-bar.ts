/** Evita dois botões iguais na tela: a barra do celular some enquanto um CTA principal da página está visível. */
export function idleMobileBar(): void {
  const bar = document.querySelector('.mobile-cta');
  const buttons = document.querySelectorAll('main a.btn--primary, main a.btn--dark');
  if (!bar || !buttons.length || !('IntersectionObserver' in window)) return;
  const visible = new Set<Element>();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      bar.classList.toggle('mobile-cta--idle', visible.size > 0);
    },
    { threshold: 1 },
  );
  buttons.forEach((button) => observer.observe(button));
}
