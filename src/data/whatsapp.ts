import { business } from './business.ts';

/**
 * Mensagens pré-preenchidas por contexto. `serviceCategory` alimenta o evento whatsapp_click.
 * As mensagens de notebook, montagem, upgrade, manutenção gamer e serviços digitais são as definidas no brief.
 */
export const whatsappContexts = {
  geral: {
    serviceCategory: 'geral',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de pedir um orçamento. Posso informar o equipamento e explicar o problema?',
  },
  notebook: {
    serviceCategory: 'notebook',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com meu notebook. Posso enviar a marca, o modelo e explicar o problema?',
  },
  computador: {
    serviceCategory: 'computador',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com meu computador. Posso informar o modelo ou a configuração e explicar o problema?',
  },
  montagem: {
    serviceCategory: 'pc_gamer_montagem',
    message: 'Olá! Vim pelo site e quero montar um PC gamer. Posso informar meu orçamento, os jogos que quero rodar e se já tenho alguma peça?',
  },
  upgrade: {
    serviceCategory: 'pc_gamer_upgrade',
    message: 'Olá! Quero avaliar um upgrade no meu PC gamer. Posso enviar minha configuração atual e explicar o que quero melhorar?',
  },
  pcGamer: {
    serviceCategory: 'pc_gamer',
    message: 'Olá! Vim pelo site da LCPC Gaming e quero falar sobre um PC gamer. Posso explicar se é montagem, upgrade ou algum problema?',
  },
  manutencaoGamer: {
    serviceCategory: 'pc_gamer_manutencao',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com meu PC gamer. Posso enviar a configuração e descrever o problema?',
  },
  diagnostico: {
    serviceCategory: 'diagnostico',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de um diagnóstico do meu equipamento. Posso informar o modelo e descrever o que está acontecendo?',
  },
  limpeza: {
    serviceCategory: 'limpeza',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de orçar uma limpeza preventiva. Posso informar o modelo do equipamento?',
  },
  formatacao: {
    serviceCategory: 'formatacao',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso formatar ou configurar meu computador. Posso explicar o que preciso e se há arquivos para guardar?',
  },
  virus: {
    serviceCategory: 'remocao_virus',
    message: 'Olá! Vim pelo site da LCPC Gaming e acho que meu computador está com vírus. Posso explicar o que está acontecendo?',
  },
  placas: {
    serviceCategory: 'reparo_placas',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de avaliar um reparo de placa. Posso informar o modelo e o que aconteceu com o equipamento?',
  },
  dados: {
    serviceCategory: 'dados',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso de ajuda com backup, migração ou recuperação de dados. Posso explicar a situação?',
  },
  perifericos: {
    serviceCategory: 'perifericos',
    message: 'Olá! Vim pelo site da LCPC Gaming e preciso configurar um periférico. Posso informar o equipamento e o que quero configurar?',
  },
  avaliacao: {
    serviceCategory: 'avaliacao_compra',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de uma avaliação ou orientação de compra. Posso explicar o que estou avaliando?',
  },
  digital: {
    serviceCategory: 'servicos_digitais',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de conversar sobre um projeto de site, landing page ou identidade visual.',
  },
  contato: {
    serviceCategory: 'contato',
    message: 'Olá! Vim pelo site da LCPC Gaming e gostaria de tirar uma dúvida sobre horários, retirada ou entrega.',
  },
  // Sintomas: usadas pelo seletor "O que está acontecendo com seu equipamento?". Textos novos, para o cliente validar.
  naoLiga: {
    serviceCategory: 'sintoma_nao_liga',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu equipamento não liga. Posso informar o modelo e explicar o que acontece ao apertar o botão de ligar?',
  },
  semVideo: {
    serviceCategory: 'sintoma_sem_video',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu equipamento liga, mas não dá vídeo. Posso informar o modelo ou a configuração e explicar o que aparece na tela?',
  },
  esquentando: {
    serviceCategory: 'sintoma_esquentando',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu equipamento está esquentando e fazendo barulho. Posso informar o modelo e descrever quando isso acontece?',
  },
  travando: {
    serviceCategory: 'sintoma_travando',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu equipamento está travando ou lento. Posso informar o modelo e explicar quando isso acontece?',
  },
  reiniciando: {
    serviceCategory: 'sintoma_reiniciando',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu computador reinicia ou desliga sozinho. Posso informar a configuração e dizer quando isso acontece?',
  },
  telaQuebrada: {
    serviceCategory: 'sintoma_tela_quebrada',
    message: 'Olá! Vim pelo site da LCPC Gaming e a tela do meu notebook está quebrada ou com falhas. Posso enviar a marca, o modelo e uma foto?',
  },
  naoCarrega: {
    serviceCategory: 'sintoma_nao_carrega',
    message: 'Olá! Vim pelo site da LCPC Gaming e meu notebook não carrega. Posso enviar a marca, o modelo e explicar o que acontece ao ligar o carregador?',
  },
} as const;

export type WhatsappContext = keyof typeof whatsappContexts;

export function whatsappUrl(context: WhatsappContext): string {
  const text = encodeURIComponent(whatsappContexts[context].message);
  return `https://wa.me/${business.phone.whatsappNumber}?text=${text}`;
}
