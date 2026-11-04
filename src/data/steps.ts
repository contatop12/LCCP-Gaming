/**
 * Como funciona o atendimento. A lista alimenta a seção visível da home (<lcpc-steps>) e o HowTo do JSON-LD,
 * então os dois sempre dizem a mesma coisa. Só descreve etapas já presentes no catálogo (diagnóstico com testes
 * e laudo técnico com orçamento de reparo) e no brief (contato pelo WhatsApp). Não promete prazo, preço nem garantia.
 */
export interface Step {
  name: string;
  text: string;
}

export const steps = {
  atendimento: [
    {
      name: 'Você envia os dados pelo WhatsApp',
      text: 'Informe o tipo de equipamento, a marca e o modelo (ou a configuração do desktop) e conte o que está acontecendo. Fotos ajudam.',
    },
    {
      name: 'O diagnóstico testa as peças',
      text: 'Os testes de memória, armazenamento, fonte, bateria e placa de vídeo apontam a causa do defeito.',
    },
    {
      name: 'O laudo traz o orçamento',
      text: 'O laudo técnico chega com o orçamento de reparo, antes de qualquer troca de peça.',
    },
  ],
} satisfies Record<string, Step[]>;

export type StepSetName = keyof typeof steps;
