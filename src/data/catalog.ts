import type { WhatsappContext } from './whatsapp.ts';

/**
 * Catálogo central, classificado item a item a partir do PDF
 * "Lista de Serviços - LCPC Gaming (2).pdf" (marcações coloridas inspecionadas na página renderizada).
 *
 * - `source` e `color` reproduzem o PDF, sem edição. O teste `npm run verify` compara com
 *   materiais/lcpc-gaming/catalogo-extraido.json.
 * - `status` decide o que vai ao ar. Somente "publicado" e "publicado-adaptado" chegam às páginas.
 * - `label` é o texto público quando difere do PDF. Itens excluídos nunca são renderizados.
 */
export type SourceColor = 'verde' | 'amarelo' | 'vermelho';
export type PublicationStatus = 'publicado' | 'publicado-adaptado' | 'pendente' | 'excluido';
export type Priority = 'foco' | 'complementar' | 'digital' | 'fora';

export type CategoryId =
  | 'diagnostico'
  | 'notebooks'
  | 'desktops'
  | 'limpeza'
  | 'montagem-upgrade'
  | 'formatacao'
  | 'virus'
  | 'atendimento'
  | 'placas'
  | 'dados'
  | 'perifericos'
  | 'avaliacao'
  | 'digital';

export interface CatalogItem {
  pdfSection: number;
  source: string;
  color: SourceColor;
  status: PublicationStatus;
  category: CategoryId | null;
  label?: string;
  /** Motivo de adaptação, exclusão ou dúvida. Repetido no README quando precisa de validação. */
  note?: string;
}

export interface CatalogCategory {
  id: CategoryId;
  title: string;
  priority: Exclude<Priority, 'fora'>;
  summary: string;
  whatsapp?: WhatsappContext;
  ctaLabel?: string;
  relatedPage?: { href: string; label: string };
}

export const categories: CatalogCategory[] = [
  {
    id: 'diagnostico',
    title: 'Diagnóstico técnico',
    priority: 'foco',
    summary: 'Para quando você ainda não sabe qual é o defeito. Os testes apontam a causa e dão base ao orçamento de reparo.',
    whatsapp: 'diagnostico',
    ctaLabel: 'Pedir diagnóstico no WhatsApp',
  },
  {
    id: 'notebooks',
    title: 'Conserto de notebooks',
    priority: 'foco',
    summary: 'Troca e reparo das partes físicas: tela, teclado, bateria, conector de carga, dobradiças e carcaça.',
    whatsapp: 'notebook',
    ctaLabel: 'Enviar dados do notebook no WhatsApp',
    relatedPage: { href: '/conserto-de-notebook/', label: 'Ver problemas comuns em notebooks' },
  },
  {
    id: 'desktops',
    title: 'Reparo de desktops e all-in-one',
    priority: 'foco',
    summary: 'Troca de componentes e reparo do gabinete em computadores de mesa, e de tela e fonte interna em all-in-one.',
    whatsapp: 'computador',
    ctaLabel: 'Enviar dados do computador no WhatsApp',
    relatedPage: { href: '/conserto-de-computador/', label: 'Ver problemas comuns em computadores' },
  },
  {
    id: 'limpeza',
    title: 'Limpeza e manutenção preventiva',
    priority: 'foco',
    summary: 'Poeira, pasta térmica e fluxo de ar influenciam temperatura e ruído. A manutenção termina com testes.',
    whatsapp: 'limpeza',
    ctaLabel: 'Orçar limpeza no WhatsApp',
  },
  {
    id: 'montagem-upgrade',
    title: 'Montagem e upgrades',
    priority: 'foco',
    summary: 'Montagem com seleção de peças por compatibilidade, orçamento e uso, e upgrades em equipamentos compatíveis.',
    whatsapp: 'montagem',
    ctaLabel: 'Pedir orçamento de montagem no WhatsApp',
    relatedPage: { href: '/pc-gamer/', label: 'Ver montagem e upgrade de PC gamer' },
  },
  {
    id: 'formatacao',
    title: 'Formatação, sistemas e programas',
    priority: 'foco',
    summary: 'Do computador novo ao sistema que não inicia: formatação, instalação, drivers e configuração.',
    whatsapp: 'formatacao',
    ctaLabel: 'Pedir formatação no WhatsApp',
  },
  {
    id: 'virus',
    title: 'Remoção de vírus',
    priority: 'foco',
    summary: 'Limpeza de programas maliciosos e correção do que eles alteraram no sistema e no navegador.',
    whatsapp: 'virus',
    ctaLabel: 'Pedir remoção de vírus no WhatsApp',
  },
  {
    id: 'atendimento',
    title: 'Formas de atendimento',
    priority: 'foco',
    summary: 'Estas opções dependem de consulta de condições e disponibilidade. Confirme pelo WhatsApp antes de contar com elas.',
    whatsapp: 'contato',
    ctaLabel: 'Consultar condições no WhatsApp',
  },
  {
    id: 'placas',
    title: 'Reparo eletrônico de placas',
    priority: 'complementar',
    summary: 'Avaliação e reparo em nível de componente, quando o diagnóstico indica defeito na placa.',
    whatsapp: 'placas',
    ctaLabel: 'Avaliar reparo de placa no WhatsApp',
  },
  {
    id: 'dados',
    title: 'Backup, migração e recuperação de dados',
    priority: 'complementar',
    summary: 'Para guardar arquivos, mudar de disco ou de computador e recuperar dados por via lógica. Em falha física, a avaliação indica se é preciso encaminhar a um laboratório.',
    whatsapp: 'dados',
    ctaLabel: 'Falar sobre meus dados no WhatsApp',
  },
  {
    id: 'perifericos',
    title: 'Configuração de periféricos e acesso remoto',
    priority: 'complementar',
    summary: 'Configuração para o equipamento funcionar com o seu computador. Esta linha não inclui conserto de periféricos.',
    whatsapp: 'perifericos',
    ctaLabel: 'Configurar periférico pelo WhatsApp',
  },
  {
    id: 'avaliacao',
    title: 'Avaliação, revenda e orientação de compra',
    priority: 'complementar',
    summary: 'Uma opinião técnica antes de comprar um usado, de vender o seu ou de escolher um equipamento novo.',
    whatsapp: 'avaliacao',
    ctaLabel: 'Pedir avaliação no WhatsApp',
  },
  {
    id: 'digital',
    title: 'Sites, landing pages e identidade visual',
    priority: 'digital',
    summary: 'Além da assistência técnica, a LCPC Gaming desenvolve projetos digitais para quem precisa de presença on-line.',
    whatsapp: 'digital',
    ctaLabel: 'Conversar sobre um projeto no WhatsApp',
  },
];

const pub = (pdfSection: number, category: CategoryId, color: SourceColor, sources: string[]): CatalogItem[] =>
  sources.map((source) => ({ pdfSection, source, color, status: 'publicado', category }));

const excluded = (pdfSection: number, sources: string[], note?: string): CatalogItem[] =>
  sources.map((source) => ({ pdfSection, source, color: 'vermelho', status: 'excluido', category: null, note }));

export const catalogItems: CatalogItem[] = [
  // 1. Diagnóstico técnico
  ...pub(1, 'diagnostico', 'verde', [
    'Diagnóstico de computador ou notebook que não liga',
    'Diagnóstico de equipamento que liga, mas não dá vídeo',
    'Diagnóstico de lentidão, travamentos e tela azul',
    'Diagnóstico de desligamentos e reinicializações espontâneas',
    'Diagnóstico de superaquecimento e ruído excessivo',
    'Diagnóstico de falhas de carregamento e baixa autonomia',
    'Testes de memória RAM, HD, SSD, fonte, bateria e placa de vídeo',
    'Diagnóstico após queda, contato com líquido ou surto elétrico',
    'Emissão de laudo técnico e orçamento de reparo',
  ]),

  // 2. Conserto físico de notebooks
  ...pub(2, 'notebooks', 'verde', [
    'Troca de tela quebrada ou com linhas, manchas e falhas de imagem',
    'Troca de cabo flat da tela',
    'Troca ou reparo do touchscreen, conforme o modelo',
    'Troca de teclado e reparo de falhas na retroiluminação',
    'Troca de touchpad e botões',
    'Troca de bateria interna ou removível',
    'Troca de conector de carga convencional ou USB-C',
    'Troca de botão de ligar',
    'Troca de webcam, microfone e alto-falantes internos',
    'Troca de ventoinha e dissipador',
    'Reparo ou troca de dobradiças',
    'Recuperação de pontos de fixação das dobradiças',
    'Reparo ou troca de carcaça, tampa da tela, base e apoio das mãos',
  ]),

  // 3. Conserto físico de computadores desktop e all-in-one
  ...pub(3, 'desktops', 'verde', [
    'Troca de fonte de alimentação',
    'Troca de placa-mãe, processador e memória RAM',
    'Troca de HD, SSD e placa de vídeo',
    'Troca de cooler, ventoinhas e water cooler',
    'Troca de gabinete e reorganização da montagem',
    'Reparo ou troca dos botões e conectores frontais do gabinete',
  ]),
  {
    pdfSection: 3,
    source: 'Instalação ou troca de placa de rede, adaptador Wi-Fi e Bluetooth',
    color: 'verde',
    status: 'pendente',
    category: null,
    note: 'Conflito: verde na seção 3, mas "Instalação de placas e adaptadores de rede" e o diagnóstico de Wi-Fi e Bluetooth estão em vermelho na seção 10. A exclusão específica prevalece até validação.',
  },
  ...pub(3, 'desktops', 'verde', ['Troca de tela, fonte interna e outros componentes de all-in-one']),

  // 4. Reparo eletrônico de placas
  ...pub(4, 'placas', 'amarelo', [
    'Reparo de placa-mãe em nível de componente',
    'Localização de curto-circuito e falhas nas linhas de alimentação',
    'Reparo do circuito de carga e alimentação da bateria',
    'Reparo de equipamento após contato com líquido, com descontaminação da placa',
    'Reparo de placas afetadas por surto elétrico',
    'Microssolda e substituição de componentes SMD',
    'Recuperação de trilhas e pontos de solda',
    'Reparo ou troca de portas USB, USB-C, HDMI, áudio e rede soldadas à placa',
    'Regravação de BIOS/UEFI e firmware, conforme o modelo',
    'Reparo de placa de vídeo dedicada',
    'Retrabalho BGA e reballing, quando indicados pelo diagnóstico',
  ]),

  // 5. Limpeza e manutenção preventiva
  ...pub(5, 'limpeza', 'verde', [
    'Limpeza interna e externa de computadores e notebooks',
    'Remoção de poeira das ventoinhas, dissipadores e filtros',
    'Troca de pasta térmica do processador e da placa de vídeo',
    'Troca de thermal pads, quando aplicável',
    'Limpeza e manutenção do sistema de refrigeração',
    'Organização de cabos e ajuste do fluxo de ar do gabinete',
    'Limpeza de teclado, tela e conectores',
    'Testes de temperatura e estabilidade após a manutenção',
  ]),

  // 6. Upgrade, montagem e desempenho
  ...pub(6, 'montagem-upgrade', 'verde', [
    'Upgrade de HD para SSD SATA ou NVMe',
    'Ampliação de memória RAM',
    'Instalação de armazenamento adicional',
    'Upgrade de processador, placa de vídeo e fonte em desktops compatíveis',
    'Upgrade do sistema de refrigeração',
  ]),
  {
    pdfSection: 6,
    source: 'Montagem de PC gamer, computador de escritório ou workstation',
    label: 'Montagem de PC gamer ou computador de escritório',
    color: 'verde',
    status: 'publicado-adaptado',
    category: 'montagem-upgrade',
    note: 'Conflito: verde na seção 6, mas a oferta específica de workstation está em vermelho na seção 11. "Workstation" fica fora do texto público até validação.',
  },
  ...pub(6, 'montagem-upgrade', 'verde', [
    'Seleção de peças conforme compatibilidade, orçamento e uso',
    'Instalação e configuração de componentes comprados pelo cliente',
    'Configuração de BIOS e perfis de memória compatíveis',
    'Testes de desempenho, temperatura e estabilidade sob carga',
  ]),

  // 7. Formatação, sistemas e programas
  ...pub(7, 'formatacao', 'verde', ['Formatação com ou sem backup prévio']),
  {
    pdfSection: 7,
    source: 'Instalação, reinstalação e configuração de Windows, macOS ou Linux',
    label: 'Instalação, reinstalação e configuração de Windows ou Linux',
    color: 'verde',
    status: 'publicado-adaptado',
    category: 'formatacao',
    note: 'Conflito: verde na seção 7, mas "reinstalação de macOS" está na oferta de MacBook e iMac, em vermelho na seção 11. macOS fica fora do texto público até definir o escopo Apple.',
  },
  ...pub(7, 'formatacao', 'verde', [
    'Atualização de sistema operacional',
    'Correção de falhas de inicialização e de atualização',
    'Recuperação do sistema e do carregador de inicialização',
    'Instalação e atualização de drivers',
    'Instalação e configuração de programas de escritório e outros aplicativos licenciados',
    'Configuração de contas de usuário, e-mail e sincronização em nuvem',
    'Configuração de dual boot e particionamento de discos',
    'Otimização da inicialização e remoção de programas desnecessários',
    'Configuração inicial de computador ou notebook novo',
  ]),

  // 8. Backup, migração e recuperação de dados
  ...pub(8, 'dados', 'amarelo', [
    'Backup de documentos, fotos, vídeos e outros arquivos',
    'Configuração de backup automático local ou em nuvem',
    'Clonagem de HD ou SSD',
    'Migração de sistema e arquivos para SSD',
    'Transferência de arquivos, perfis e configurações para outro computador',
    'Recuperação lógica de arquivos excluídos ou de partições danificadas',
    'Recuperação de arquivos de equipamento que não liga, quando a unidade está acessível',
  ]),
  {
    pdfSection: 8,
    source: 'Diagnóstico e encaminhamento para laboratório em caso de falha física do armazenamento',
    label: 'Avaliação de falha física do armazenamento, com eventual encaminhamento a laboratório',
    color: 'amarelo',
    status: 'publicado-adaptado',
    category: 'dados',
    note: 'Redação pedida no brief: falar em avaliação e eventual encaminhamento.',
  },
  ...pub(8, 'dados', 'amarelo', [
    'Restauração de backups e verificação dos arquivos recuperados',
    'Apagamento seguro de dados antes de venda, doação ou descarte',
  ]),

  // 9. Segurança e remoção de vírus
  ...pub(9, 'virus', 'verde', [
    'Remoção de vírus, malware, spyware e adware',
    'Limpeza de extensões maliciosas e redirecionamentos do navegador',
    'Correção de alterações feitas por programas maliciosos',
    'Instalação e configuração de antivírus e firewall',
  ]),
  ...excluded(9, [
    'Configuração de criptografia de disco e proteção de contas',
    'Recuperação de acesso ao sistema por meios autorizados, mediante comprovação de propriedade',
  ]),
  ...pub(9, 'dados', 'amarelo', ['Diagnóstico de incidentes de ransomware e avaliação das opções de recuperação']),

  // 10. Internet, redes e periféricos
  ...excluded(10, [
    'Diagnóstico de falhas de Wi-Fi, Bluetooth e conexão cabeada',
    'Instalação de placas e adaptadores de rede',
    'Configuração de roteadores, repetidores e sistemas mesh',
    'Configuração de rede doméstica ou de pequeno escritório',
    'Compartilhamento de arquivos, pastas e impressoras',
  ]),
  ...pub(10, 'perifericos', 'amarelo', [
    'Instalação e configuração de impressoras e scanners',
    'Configuração de monitores externos, docks e adaptadores',
    'Configuração de webcams, microfones, headsets e equipamentos para videoconferência',
  ]),
  {
    pdfSection: 10,
    source: 'Configuração de acesso remoto e VPN',
    color: 'amarelo',
    status: 'publicado',
    category: 'perifericos',
    note: 'Marcado em amarelo no PDF, mas ausente da lista resumida do brief. Publicado como complementar. Validar se deve continuar.',
  },

  // 11. Serviços especializados por tipo de equipamento
  ...excluded(11, [
    'MacBook e iMac — diagnóstico, reinstalação de macOS, troca de tela, bateria e teclado, além de reparo de placa lógica conforme o modelo',
    'Notebook gamer — manutenção térmica, diagnóstico de perda de desempenho, falhas gráficas e desligamentos durante jogos',
    'Ultrabook — reparo de carregamento via USB-C, dobradiças, telas finas e componentes soldados, conforme o modelo',
    'Workstation — montagem, upgrade e testes para edição de vídeo, renderização, projetos 3D e engenharia',
    'Chromebook — recuperação do ChromeOS, diagnóstico de carregamento e troca de tela, bateria ou teclado, conforme o modelo',
  ]),

  // 12. Atendimento para empresas
  ...excluded(12, [
    'Suporte técnico remoto e presencial',
    'Contratos de manutenção preventiva e corretiva',
    'Gestão de chamados e inventário de equipamentos',
    'Preparação e padronização de computadores para novos funcionários',
    'Instalação e atualização de sistemas e aplicativos em vários equipamentos',
    'Configuração de contas, permissões, pastas compartilhadas e impressoras',
    'Implantação e monitoramento de rotinas de backup',
    'Configuração e suporte a NAS e servidores de arquivos de pequeno porte',
    'Migração ou substituição de computadores do escritório',
  ]),

  // 13. Serviços complementares
  ...pub(13, 'atendimento', 'verde', [
    'Atendimento em domicílio, no escritório ou na bancada',
    'Retirada e entrega de equipamentos',
  ]),
  ...excluded(13, ['Fornecimento de peças, carregadores, baterias e acessórios compatíveis'], 'Venda avulsa de peças. A troca de peça dentro de um reparo continua nas seções 2 e 3.'),
  ...excluded(13, ['Diagnóstico ou troca de monitores, nobreaks e periféricos'], 'Conserto de periféricos. A configuração de periféricos segue como complementar.'),
  ...pub(13, 'avaliacao', 'amarelo', [
    'Avaliação técnica de computador usado antes da compra',
    'Revisão e preparação de equipamento para revenda',
    'Orientação para compra de notebook, desktop ou componentes',
  ]),
  ...excluded(13, ['Encaminhamento para descarte eletrônico ou reciclagem']),

  // 14. Outros serviços
  ...pub(14, 'digital', 'amarelo', [
    'Desenvolvimento de Site Institucional',
    'Desenvolvimento de Landing Page',
    'Criação de Logotipo / Manual de Identidade',
  ]),
];

const isPublished = (item: CatalogItem) => item.status === 'publicado' || item.status === 'publicado-adaptado';

export const publicLabel = (item: CatalogItem) => item.label ?? item.source;

export function publishedItems(category: CategoryId): string[] {
  return catalogItems.filter((item) => item.category === category && isPublished(item)).map(publicLabel);
}

export function categoriesByPriority(priority: CatalogCategory['priority']): CatalogCategory[] {
  return categories.filter((category) => category.priority === priority);
}

export const allPublishedLabels = (): string[] => catalogItems.filter(isPublished).map(publicLabel);
