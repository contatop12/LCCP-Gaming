import type { WhatsappContext } from './whatsapp.ts';

/**
 * Seletor de sintomas ("O que está acontecendo com seu equipamento?").
 * Todo o conteúdo sai em HTML (sem JavaScript todas as respostas ficam legíveis em sequência);
 * o JavaScript só transforma a lista em abas. Só descreve avaliações que existem no catálogo publicado.
 */
export interface SymptomLink {
  href: string;
  label: string;
}

export interface Symptom {
  /** Id do painel. Em /conserto-de-computador/ os ids são âncoras já linkadas de outras páginas. */
  id: string;
  /** Texto curto do botão. */
  label: string;
  /** Título do painel. */
  title: string;
  evaluated: string[];
  send: string[];
  links: SymptomLink[];
  context: WhatsappContext;
  ctaLabel: string;
}

const enviar = 'Enviar o sintoma pelo WhatsApp';
const gamerCta = 'Pedir diagnóstico do meu PC gamer';

export const symptomSets = {
  geral: [
    {
      id: 'sintoma-nao-liga',
      label: 'Não liga',
      title: 'Equipamento que não liga',
      evaluated: ['Fonte, botão e conectores frontais', 'Placa-mãe e memória', 'Bateria e carregador, em notebooks'],
      send: ['Marca e modelo, ou a configuração do desktop', 'Se acende alguma luz e se as ventoinhas giram', 'Se houve queda de energia, queda do equipamento ou contato com líquido'],
      links: [
        { href: '/conserto-de-computador/#nao-liga', label: 'Computador que não liga: o que é avaliado' },
        { href: '/servicos/#diagnostico', label: 'Diagnóstico técnico' },
      ],
      context: 'naoLiga',
      ctaLabel: enviar,
    },
    {
      id: 'sintoma-sem-video',
      label: 'Sem vídeo',
      title: 'Liga, mas não aparece imagem',
      evaluated: ['Memória e placa de vídeo', 'Fonte e placa-mãe', 'Configuração de BIOS'],
      send: ['Se o monitor mostra alguma mensagem', 'Se o computador emite aviso sonoro ao ligar', 'O modelo do equipamento ou a configuração do desktop'],
      links: [
        { href: '/conserto-de-computador/#sem-video', label: 'Liga, mas não dá vídeo: o que é avaliado' },
        { href: '/pc-gamer/#falta-de-video', label: 'Falta de vídeo em PC gamer' },
      ],
      context: 'semVideo',
      ctaLabel: enviar,
    },
    {
      id: 'sintoma-esquentando',
      label: 'Esquentando',
      title: 'Equipamento esquentando ou barulhento',
      evaluated: ['Poeira em ventoinhas, dissipadores e filtros', 'Pasta térmica e thermal pads', 'Fluxo de ar do gabinete e sistema de refrigeração'],
      send: ['Modelo do notebook ou configuração do desktop', 'Em que situação esquenta: jogo, uso leve ou logo ao ligar', 'Desde quando o ruído começou'],
      links: [
        { href: '/servicos/#limpeza', label: 'Limpeza e manutenção preventiva' },
        { href: '/conserto-de-notebook/#superaquecimento', label: 'Notebook com superaquecimento' },
      ],
      context: 'esquentando',
      ctaLabel: enviar,
    },
    {
      id: 'sintoma-travando',
      label: 'Travando',
      title: 'Equipamento travando ou lento',
      evaluated: ['Memória RAM e armazenamento (HD ou SSD)', 'Temperatura e estabilidade', 'Estado do sistema operacional'],
      send: ['Quando acontece e se aparece tela azul', 'Há quanto tempo o sistema foi instalado', 'Modelo ou configuração do equipamento'],
      links: [
        { href: '/conserto-de-computador/#trava', label: 'Trava ou fica lento: o que é avaliado' },
        { href: '/servicos/#formatacao', label: 'Formatação, sistemas e programas' },
      ],
      context: 'travando',
      ctaLabel: enviar,
    },
    {
      id: 'sintoma-tela-quebrada',
      label: 'Tela quebrada',
      title: 'Tela quebrada ou com falhas de imagem',
      evaluated: ['Painel da tela e cabo flat', 'Touchscreen, conforme o modelo', 'Dobradiças e tampa da tela, se houve queda'],
      send: ['Marca e modelo do notebook', 'Uma foto da tela com o equipamento ligado', 'Se houve queda ou contato com líquido'],
      links: [{ href: '/conserto-de-notebook/#tela', label: 'Troca de tela de notebook: o que é avaliado' }],
      context: 'telaQuebrada',
      ctaLabel: enviar,
    },
    {
      id: 'sintoma-nao-carrega',
      label: 'Não carrega',
      title: 'Notebook que não carrega',
      evaluated: ['Carregador e conector de carga (convencional ou USB-C)', 'Bateria', 'Circuito de carga da placa, quando o diagnóstico indicar'],
      send: ['Marca e modelo do notebook', 'Se acende alguma luz ao ligar o carregador', 'Se o cabo só carrega em certa posição'],
      links: [
        { href: '/conserto-de-notebook/#carregamento', label: 'Notebook que não carrega: o que é avaliado' },
        { href: '/servicos/#placas', label: 'Reparo eletrônico de placas' },
      ],
      context: 'naoCarrega',
      ctaLabel: enviar,
    },
  ],
  computador: [
    {
      id: 'nao-liga',
      label: 'Não liga',
      title: 'Computador que não liga',
      evaluated: ['Fonte de alimentação', 'Botão e conectores frontais do gabinete', 'Placa-mãe e memória'],
      send: ['Se aparece alguma luz', 'Se as ventoinhas giram', 'Se houve queda de energia antes do problema'],
      links: [{ href: '/servicos/#desktops', label: 'Reparo de desktops e all-in-one' }],
      context: 'naoLiga',
      ctaLabel: enviar,
    },
    {
      id: 'sem-video',
      label: 'Liga, mas não dá vídeo',
      title: 'Liga, mas não dá vídeo',
      evaluated: ['Memória e placa de vídeo', 'Fonte e placa-mãe'],
      send: ['Se o monitor mostra alguma mensagem', 'Se o computador emite aviso sonoro ao ligar'],
      links: [{ href: '/servicos/#diagnostico', label: 'Diagnóstico técnico' }],
      context: 'semVideo',
      ctaLabel: enviar,
    },
    {
      id: 'trava',
      label: 'Trava ou fica lento',
      title: 'Trava ou fica lento',
      evaluated: ['Memória, HD ou SSD', 'Temperatura', 'Estado do sistema operacional'],
      send: ['Quando acontece e se aparece tela azul', 'Há quanto tempo o sistema foi instalado'],
      links: [
        { href: '/servicos/#formatacao', label: 'Formatação, sistemas e programas' },
        { href: '/servicos/#virus', label: 'Remoção de vírus' },
      ],
      context: 'travando',
      ctaLabel: enviar,
    },
    {
      id: 'reinicia',
      label: 'Reinicia ou desliga',
      title: 'Reinicia ou desliga sozinho',
      evaluated: ['Temperatura', 'Fonte e memória', 'Sistema operacional'],
      send: ['Se o problema aparece em uso pesado', 'Se também acontece com o computador parado'],
      links: [{ href: '/servicos/#limpeza', label: 'Limpeza e manutenção preventiva' }],
      context: 'reiniciando',
      ctaLabel: enviar,
    },
  ],
  gamer: [
    {
      id: 'aquecimento',
      label: 'Aquecimento',
      title: 'PC gamer esquentando',
      evaluated: ['Poeira e pasta térmica', 'Thermal pads e ventoinhas', 'Water cooler e fluxo de ar do gabinete'],
      send: ['A configuração do PC', 'Em que jogo ou situação a temperatura sobe', 'Se o ruído das ventoinhas mudou'],
      links: [{ href: '/servicos/#limpeza', label: 'Limpeza e manutenção do sistema de refrigeração' }],
      context: 'manutencaoGamer',
      ctaLabel: gamerCta,
    },
    {
      id: 'ruido',
      label: 'Ruído',
      title: 'PC gamer barulhento',
      evaluated: ['Ventoinhas e cooler', 'Poeira acumulada no sistema de refrigeração'],
      send: ['A configuração do PC', 'De onde parece vir o ruído', 'Se aparece só sob carga'],
      links: [{ href: '/servicos/#limpeza', label: 'Remoção de poeira de ventoinhas e filtros' }],
      context: 'manutencaoGamer',
      ctaLabel: gamerCta,
    },
    {
      id: 'travamentos',
      label: 'Travamentos',
      title: 'Travamentos em jogos e no sistema',
      evaluated: ['Memória e armazenamento', 'Temperatura e drivers', 'Estabilidade sob carga'],
      send: ['A configuração do PC', 'Em quais jogos acontece', 'Se aparece tela azul ou o jogo fecha sozinho'],
      links: [{ href: '/servicos/#diagnostico', label: 'Diagnóstico de lentidão, travamentos e tela azul' }],
      context: 'manutencaoGamer',
      ctaLabel: gamerCta,
    },
    {
      id: 'desligamentos',
      label: 'Desligamentos',
      title: 'PC que desliga durante o jogo',
      evaluated: ['Fonte de alimentação', 'Temperatura do processador e da placa de vídeo', 'Testes sob carga'],
      send: ['A configuração do PC, com o modelo da fonte', 'Em que situação o PC desliga', 'Se desliga de uma vez ou reinicia'],
      links: [{ href: '/servicos/#diagnostico', label: 'Diagnóstico de desligamentos e reinicializações' }],
      context: 'manutencaoGamer',
      ctaLabel: gamerCta,
    },
    {
      id: 'falta-de-video',
      label: 'Falta de vídeo',
      title: 'PC gamer sem imagem',
      evaluated: ['Placa de vídeo e memória', 'Placa-mãe e fonte', 'Configuração de BIOS'],
      send: ['A configuração do PC', 'Em qual saída o monitor está ligado', 'Se houve troca de peça antes do problema'],
      links: [{ href: '/conserto-de-computador/#sem-video', label: 'Liga, mas não dá vídeo em computadores' }],
      context: 'manutencaoGamer',
      ctaLabel: gamerCta,
    },
  ],
} satisfies Record<string, Symptom[]>;

export type SymptomSetName = keyof typeof symptomSets;
