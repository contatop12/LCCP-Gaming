/**
 * Sanfonas nativas (<details data-acc>): fechadas no celular, abertas de 760 px para cima (o CSS já mostra tudo no
 * computador; aqui abrimos de fato, para navegadores sem ::details-content). Âncoras que apontam para a sanfona, ou para
 * algo dentro dela, a abrem: o link de /servicos/#placas precisa mostrar a lista, não só o título.
 */
export function openAccordions(): void {
  const all = () => document.querySelectorAll<HTMLDetailsElement>('details[data-acc]');
  if (!all().length) return;
  const wide = matchMedia('(min-width: 760px)');
  const sync = () => {
    if (wide.matches) all().forEach((details) => (details.open = true));
  };
  const reveal = () => {
    const id = decodeURIComponent(location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    const inside = target.closest<HTMLDetailsElement>('details[data-acc]');
    const own = target.querySelector<HTMLDetailsElement>('details[data-acc]');
    const details = inside ?? own;
    if (details && !details.open) {
      details.open = true;
      // O alvo dentro de uma sanfona só ganha posição depois de abrir: rola de novo até ele.
      if (inside) target.scrollIntoView();
    }
  };
  sync();
  reveal();
  wide.addEventListener('change', sync);
  addEventListener('hashchange', reveal);
}
