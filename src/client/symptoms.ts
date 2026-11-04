/**
 * Seletor de sintomas. O HTML já traz todas as respostas em sequência (sem JavaScript tudo continua legível);
 * aqui a lista de links vira um conjunto de abas (padrão WAI-ARIA tabs, ativação ao focar) e só o painel
 * escolhido fica visível. O link #id de outras páginas (ex.: /conserto-de-computador/#sem-video) abre o painel certo.
 */
export function enableSymptomTabs(): void {
  document.querySelectorAll<HTMLElement>('[data-symptoms]').forEach((root) => {
    const links = [...root.querySelectorAll<HTMLAnchorElement>('[data-tab]')];
    const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
    const list = root.querySelector('.sx__choices ul');
    if (!links.length || links.length !== panels.length || !list) return;

    list.setAttribute('role', 'tablist');
    const tabs = links.map((link, index) => {
      const id = link.dataset.tab!;
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.id = `tab-${id}`;
      tab.className = 'sx__tab';
      tab.textContent = link.textContent;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', id);
      tab.setAttribute('aria-selected', 'false');
      tab.tabIndex = -1;
      link.parentElement!.setAttribute('role', 'presentation');
      link.replaceWith(tab);
      panels[index]!.setAttribute('role', 'tabpanel');
      panels[index]!.setAttribute('aria-labelledby', tab.id);
      return tab;
    });
    root.setAttribute('data-enhanced', '');

    const select = (index: number, focus: boolean) => {
      tabs.forEach((tab, i) => {
        const on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        panels[i]!.hidden = !on;
      });
      if (focus) tabs[index]!.focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(index, false));
      tab.addEventListener('keydown', (event) => {
        const last = tabs.length - 1;
        const next =
          event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index === last ? 0 : index + 1)
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index === 0 ? last : index - 1)
          : event.key === 'Home' ? 0
          : event.key === 'End' ? last
          : -1;
        if (next < 0) return;
        event.preventDefault();
        select(next, true);
      });
    });

    const fromHash = () => {
      const index = panels.findIndex((panel) => `#${panel.id}` === window.location.hash);
      if (index >= 0) {
        select(index, false);
        // O painel estava oculto quando o navegador procurou a âncora; leva a tela até ele.
        panels[index]!.scrollIntoView();
      }
      return index >= 0;
    };
    if (!fromHash()) select(0, false);
    window.addEventListener('hashchange', fromHash);
  });
}
