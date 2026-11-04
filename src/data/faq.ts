export interface FaqItem {
  question: string;
  answer: string;
}

/** O FAQ visível e o JSON-LD FAQPage saem desta mesma lista, então nunca divergem. */
export const faq = {
  home: [
    {
      question: 'Que equipamentos a LCPC Gaming atende?',
      answer:
        'Computadores de mesa, all-in-one e notebooks, além de PCs gamer desktop para montagem, upgrade e manutenção. Envie a marca e o modelo pelo WhatsApp para confirmar se o seu caso está dentro do atendimento.',
    },
    {
      question: 'O que informar para pedir um orçamento?',
      answer:
        'Informe o tipo de equipamento, a marca e o modelo ou, em desktops, a configuração. Depois descreva o sintoma, desde quando ele acontece e se houve queda, contato com líquido ou surto elétrico. Fotos ou um vídeo curto do problema também ajudam.',
    },
    {
      question: 'Meu computador não liga. Dá para avaliar?',
      answer:
        'Sim. O diagnóstico cobre equipamentos que não ligam e os que ligam sem dar vídeo, com testes de memória, HD, SSD, fonte, bateria e placa de vídeo. O resultado é um laudo técnico com o orçamento de reparo.',
    },
    {
      question: 'Vocês atendem em domicílio ou fazem retirada e entrega?',
      answer:
        'Atendimento em domicílio ou no escritório e retirada e entrega dependem de consulta de condições e disponibilidade. Pergunte pelo WhatsApp informando sua região e o equipamento.',
    },
    {
      question: 'Quanto custa e quanto tempo leva?',
      answer:
        'Valor e prazo dependem do defeito, do modelo e das peças envolvidas, por isso eles não são publicados aqui. Envie os dados do equipamento pelo WhatsApp para pedir o orçamento do seu caso.',
    },
  ],
  pcGamer: [
    {
      question: 'Posso levar as peças para montar meu PC?',
      answer:
        'Sim. A instalação e a configuração de componentes comprados pelo cliente fazem parte do catálogo. Envie a lista de peças pelo WhatsApp, de preferência antes de comprar, para conferir a compatibilidade entre processador, placa-mãe, memória, placa de vídeo, fonte e gabinete.',
    },
    {
      question: 'Quando vale fazer upgrade em vez de trocar o computador?',
      answer:
        'Costuma valer quando a limitação está em uma ou duas peças e o resto da máquina aguenta a mudança: a placa-mãe aceita o novo componente, a fonte tem potência e conectores suficientes e há espaço no gabinete. Se o upgrade exigir placa-mãe, processador e memória novos ao mesmo tempo, vale comparar com o custo de uma montagem nova.',
    },
    {
      question: 'Um upgrade garante mais FPS?',
      answer:
        'Não dá para prometer um número antes de avaliar a máquina. O resultado depende do jogo, da resolução e de qual peça está limitando o PC. Depois do serviço, os testes de desempenho, temperatura e estabilidade mostram como o conjunto se comporta sob carga.',
    },
    {
      question: 'O que informar para pedir orçamento de montagem?',
      answer:
        'Os jogos que você quer rodar, a resolução e a taxa de atualização do monitor, o valor disponível e as peças que já tem. Com isso é possível indicar uma configuração compatível com o seu uso.',
    },
    {
      question: 'Meu PC gamer desliga durante o jogo. O que pode ser?',
      answer:
        'Entre as causas mais comuns estão temperatura alta no processador ou na placa de vídeo e fonte que não sustenta a carga. Só os testes confirmam o motivo. Ao pedir o diagnóstico, informe a configuração e em que jogo ou situação o desligamento acontece.',
    },
  ],
  notebook: [
    {
      question: 'O que informar para pedir orçamento de conserto de notebook?',
      answer:
        'Envie a marca, o modelo e o sintoma. O modelo costuma estar em uma etiqueta embaixo do notebook. Conte desde quando o problema acontece e se houve queda, contato com líquido ou surto elétrico. Uma foto da tela ou da parte danificada ajuda.',
    },
    {
      question: 'Vale a pena consertar um notebook antigo?',
      answer:
        'Depende do defeito, do custo das peças e do uso que você pretende fazer do equipamento. Por isso o diagnóstico vem antes da decisão: com o laudo e o orçamento de reparo em mãos, você compara o custo do conserto com o valor de continuar usando o notebook.',
    },
    {
      question: 'Meu notebook caiu ou molhou. O que devo fazer?',
      answer:
        'Desligue o notebook, retire o carregador e evite ligá-lo de novo até a avaliação. O diagnóstico após queda, contato com líquido ou surto elétrico mostra quais partes foram afetadas. Se a placa foi atingida, o reparo eletrônico é avaliado como serviço complementar.',
    },
    {
      question: 'Notebook esquentando muito tem conserto?',
      answer:
        'A avaliação começa por poeira, pasta térmica, thermal pads e pela ventoinha. A limpeza e a manutenção terminam com testes de temperatura e estabilidade. Se a ventoinha ou o dissipador estiverem com defeito, a troca entra no orçamento.',
    },
    {
      question: 'Preciso levar o notebook até a Vila Marari?',
      answer:
        'O endereço da LCPC Gaming é Rua Maria Pais de Barros, 329. Atendimento em domicílio ou no escritório e retirada e entrega dependem de consulta de condições e disponibilidade. Combine pelo WhatsApp.',
    },
  ],
  computador: [
    {
      question: 'Meu computador liga, mas não dá vídeo. O que pode ser?',
      answer:
        'As causas mais comuns envolvem memória, placa de vídeo, fonte ou placa-mãe. Antes de pedir o orçamento, confira se o cabo do monitor está firme e conectado à saída certa. Se continuar sem imagem, o diagnóstico testa os componentes para encontrar a causa.',
    },
    {
      question: 'Computador reiniciando sozinho é vírus?',
      answer:
        'Pode ser, mas a causa também pode estar na temperatura, na memória, na fonte ou no próprio sistema. O diagnóstico separa defeito de hardware de problema de software, e isso define se a solução é trocar uma peça, fazer manutenção, formatar ou remover programas maliciosos.',
    },
    {
      question: 'O que informar para pedir orçamento de conserto de computador?',
      answer:
        'Conte o que acontece ao apertar o botão de ligar, se aparece alguma mensagem na tela e desde quando o problema começou. Se souber a configuração, informe a placa-mãe, o processador, a memória, a placa de vídeo e a fonte. Em computadores de marca, envie o modelo.',
    },
    {
      question: 'Vocês consertam computador all-in-one?',
      answer:
        'Sim. O catálogo inclui a troca de tela, fonte interna e outros componentes de all-in-one. Envie a marca e o modelo pelo WhatsApp e descreva o defeito.',
    },
  ],
  servicos: [
    {
      question: 'Como saber qual serviço eu preciso?',
      answer:
        'Se você ainda não sabe qual é o defeito, comece pelo diagnóstico técnico: os testes apontam a causa e o resultado é um laudo técnico com o orçamento de reparo. Se já sabe o que quer, como limpeza, formatação ou upgrade, envie o modelo e o pedido pelo WhatsApp.',
    },
    {
      question: 'Qual a diferença entre serviços principais e complementares?',
      answer:
        'Os principais são o foco da LCPC Gaming: diagnóstico, conserto, limpeza, montagem e upgrade, formatação e remoção de vírus. Os complementares, como reparo eletrônico de placas e recuperação de dados, são feitos sob avaliação de cada caso.',
    },
    {
      question: 'Dá para fazer mais de um serviço de uma vez?',
      answer:
        'Dá. É comum combinar, por exemplo, limpeza com troca de pasta térmica e upgrade de SSD. Descreva tudo na mesma mensagem e informe o modelo do equipamento para que o orçamento reúna os itens.',
    },
    {
      question: 'Quanto custa um serviço do catálogo?',
      answer:
        'Valor e prazo dependem do defeito, do modelo e das peças envolvidas, por isso não são publicados aqui. Envie o modelo e o sintoma pelo WhatsApp para pedir o orçamento do seu caso.',
    },
    {
      question: 'A LCPC Gaming também faz site e identidade visual?',
      answer:
        'Sim, em um bloco à parte do catálogo. A LCPC Gaming desenvolve sites, landing pages e identidade visual. Converse sobre o projeto pelo WhatsApp.',
    },
  ],
  contato: [
    {
      question: 'Quais são os horários de atendimento?',
      answer:
        'Os horários ainda não estão publicados neste site. Pergunte pelo WhatsApp antes de ir até a Vila Marari, para confirmar se há alguém na bancada.',
    },
    {
      question: 'Vocês fazem retirada e entrega?',
      answer:
        'Retirada, entrega, atendimento em domicílio e no escritório dependem de consulta de condições e disponibilidade. Informe sua região e o equipamento pelo WhatsApp.',
    },
    {
      question: 'Como chego à LCPC Gaming?',
      answer:
        'O endereço é Rua Maria Pais de Barros, 329, Vila Marari, São Paulo - SP, CEP 04402-140. A Vila Marari fica na Zona Sul de São Paulo. O botão Como chegar abre o trajeto no Google Maps.',
    },
    {
      question: 'Preciso avisar antes de levar o equipamento?',
      answer:
        'Avise pelo WhatsApp, informando o equipamento e o que está acontecendo. Assim a conversa já começa com os dados do orçamento e as condições do atendimento ficam combinadas.',
    },
  ],
} satisfies Record<string, FaqItem[]>;
