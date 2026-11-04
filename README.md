# Site da LCPC Gaming

Site institucional da LCPC Gaming, assistência técnica de computadores e notebooks na Vila Marari, em São Paulo. O objetivo comercial é gerar pedidos de orçamento qualificados pelo WhatsApp. A assistência técnica de notebooks e computadores lidera a mensagem; o PC gamer desktop é a personalidade da marca e uma frente própria (montagem, upgrade e manutenção).

Feito em HTML, CSS e TypeScript, sem framework, e publicado no Cloudflare Workers (Workers Static Assets). **Ainda não foi publicado:** a publicação fica para depois da revisão.

| Página | Intenção principal |
| ----- | ----- |
| `/` | Assistência técnica de computadores e notebooks na Vila Marari |
| `/pc-gamer/` | Assistência técnica e montagem de PC gamer na Vila Marari (com o raio-x do gabinete) |
| `/conserto-de-notebook/` | Assistência técnica de notebooks na Vila Marari |
| `/conserto-de-computador/` | Assistência técnica de computadores (e all-in-one) na Vila Marari |
| `/servicos/` | Catálogo completo por prioridade |
| `/sobre/` | Luis Carlos e a LCPC Gaming |
| `/contato/` | Endereço, WhatsApp, e-mail e "Como chegar" |

## Como o site é montado

- **As páginas são arquivos HTML de verdade** em `src/pages/` (`index.html`, `pc-gamer/index.html`, `404.html` etc.). O texto e a estrutura de cada página estão ali, dentro de `<main>`, e podem ser lidos e editados à mão.
- **Dados centrais ficam em TypeScript** (`src/data/`): empresa, catálogo, mensagens de WhatsApp, FAQ, mídia e menu. Nada disso é copiado para as páginas: elas pedem os dados por tags (veja abaixo), então a mudança vale no site inteiro.
- **O cabeçalho, o rodapé, a barra do celular, as migalhas, as metatags, o JSON-LD e o analytics não estão nas páginas.** O build (`scripts/build.ts`) acrescenta tudo isso a cada página.
- **O CSS** está em `src/styles/global.css` (base, faixas, bento, botões, movimento) e em `src/styles/parts/*.css` (raio-x, sintomas, mapa), embutido em cada HTML. Antes de embutir, `scripts/lib/purge-css.ts` tira as regras cujas classes a página não usa (as classes que o JavaScript acrescenta são lidas do próprio código em `src/client/`). As fontes (Saira Condensed e IBM Plex Sans, licença OFL) ficam em `src/assets/fonts/`, já reduzidas ao português, e são declaradas em `src/styles/fonts.css`.
- **O JavaScript do navegador** está em `src/client/` (evento `whatsapp_click`, barra do celular, menu e, só nas páginas que usam, vídeo sob demanda, seletor de sintomas e mapa sob demanda), compilado e embutido no fim de cada página. Sem JavaScript todo o conteúdo continua legível.
- **O Worker** (`src/worker/index.ts`) serve o site na Cloudflare e acrescenta cabeçalhos de segurança, cache por tipo de arquivo, o cabeçalho `Link` de preload (a Cloudflare o usa como Early Hints), `noindex` fora do domínio de produção e suporte a `Range` para o vídeo.

### Tags `<lcpc-*>` nas páginas

São "marcadores" que o build troca pelo HTML final. Nenhuma tag `<lcpc-*>` chega ao `dist/`, e um valor desconhecido (contexto, categoria, foto, conjunto de FAQ ou tag) **interrompe o build** com a página e a lista de opções válidas.

| Tag | O que gera |
| ----- | ----- |
| `<lcpc-whatsapp context="notebook" location="hero" variant="primary">Texto do botão</lcpc-whatsapp>` | Botão ou link de WhatsApp com a mensagem do contexto (`src/data/whatsapp.ts`) e os atributos do evento. `variant`: `primary` (padrão), `dark`, `ghost` ou `text`. Sem texto, usa "Pedir orçamento no WhatsApp" |
| `<lcpc-photo name="consertoNotebook" sizes="..." widths="480,668" class="photo--cut" priority />` | `<figure>` com a foto de `src/data/media.ts` (nome da chave), `<picture>` em AVIF, WebP e JPEG e legenda. `priority` só para a imagem principal da página. Toda foto sob demanda leva uma cor de reserva neutra (7 caracteres, gerada no build) até a imagem decodificar |
| `<lcpc-tile name="bancada" sizes="..." class="c5 r2" pos="50% 40%" morph="notebook">...</lcpc-tile>` | Bloco de bento: a foto real preenche o bloco. Com conteúdo dentro da tag, ele vira o texto sobre a foto (com tarja escura para leitura); sem conteúdo, mostra a legenda. `c3` a `c9` definem a largura em 12 colunas, `r2` e `r3` a altura, `pos` o enquadramento. `morph` dá à foto o nome de View Transition `morph-<valor>`: o mesmo valor na foto de uma página e na da página de destino faz a foto se mover entre as duas (nomes têm de ser únicos em cada página) |
| `<lcpc-picture name="hero" art-name="heroMobile" ... preload />` | `<picture>` sem `<figure>`, com recorte para celular e `<link rel="preload">` no `<head>` (abertura da home) |
| `<lcpc-catalog category="diagnostico" class="ticks" exclude="texto" />` | Lista `<ul>` dos itens publicados da categoria (`src/data/catalog.ts`). `exclude` tira os itens que contêm o texto |
| `<lcpc-faq set="notebook" title="..." lead="..." photo="bancada" />` | Perguntas e respostas de `src/data/faq.ts`, com título, chamada e uma foto na coluna da esquerda |
| `<lcpc-location context="contato" location="contato" title="..." intro="..." />` | Seção de localização: mapa sob demanda, endereço, contatos e botões de WhatsApp e "Como chegar" |
| `<lcpc-cta-band title="..." text="..." context="notebook" label="..." />` | Faixa final de chamada para o WhatsApp |
| `<lcpc-xray />` | "Raio-x do gabinete" (em `/pc-gamer/`): pontos sobre a foto real, ligados por trilhas a 45 graus a links para os serviços. Os pontos e links ficam em `src/data/xray.ts` (coordenadas da foto original de 1200x1600) |
| `<lcpc-steps set="atendimento" />` | "Como funciona o atendimento": os passos de `src/data/steps.ts`. A mesma lista vira o `HowTo` do JSON-LD, então texto visível e dados estruturados nunca divergem |
| `<lcpc-symptoms set="geral" location="seletor_sintomas" />` | Seletor "O que está acontecendo com seu equipamento?". Conjuntos `geral`, `computador` e `gamer` em `src/data/symptoms.ts`. Sem JavaScript as respostas saem em sequência; com JavaScript viram abas (setas, Home e End) |
| `<lcpc-trace variant="1" pulse />` | Trilha de circuito entre seções (SVG em linha, cinza e laranja). `pulse` acrescenta um sinal que acompanha a rolagem, onde o navegador suporta `animation-timeline` |
| `<lcpc-video />` | Vídeo sob demanda (`video` em `src/data/media.ts`): capa leve em AVIF/WebP carregada só perto da tela e botão; o `<video>` nasce depois do clique, com WebM (AV1) e MP4 de reserva. Sem JavaScript, o `<noscript>` traz o player nativo |
| `<lcpc-business field="owner.name" />` | Dado de `src/data/business.ts` dentro de um texto: `name`, `slogan`, `owner.name`, `owner.role`, `phone.display`, `email` |
| `<lcpc-service category="limpeza" class="c4" />`, `<lcpc-digital-block />`, `<lcpc-category-links />`, `<lcpc-category-link />` | Blocos do catálogo em `/servicos/`, gerados da lista de categorias: título, resumo e todos os itens publicados à vista, com a âncora da categoria |

### Ajustes de página

Ficam em `<meta name="lcpc:...">` no `<head>` de cada arquivo de `src/pages/` e são removidos do HTML final:

| Meta | Efeito |
| ----- | ----- |
| `lcpc:context` | Mensagem de WhatsApp do botão do cabeçalho e da barra do celular. Padrão: `geral` |
| `lcpc:mobile-cta` | Texto da barra de WhatsApp do celular |
| `lcpc:faq` | Conjunto de FAQ que entra no JSON-LD. Precisa ser o mesmo do `<lcpc-faq>` da página, ou o build falha |
| `lcpc:breadcrumb` | Nome da página nas migalhas (e no JSON-LD). O "Início" é automático |
| `lcpc:schema` | JSON-LD extra: `offer-catalog` ou `person` |
| `lcpc:noindex` | `true` mantém a página fora do índice mesmo em produção (usado no 404) |
| `lcpc:image` | Chave de `src/data/media.ts` da foto principal da página: vira `primaryImageOfPage` e a foto da imagem social |
| `lcpc:og` | Título impresso na imagem social da página (`dist/og/<página>.jpg`, 1200x630, gerada no build com foto real, logo e título) |
| `lcpc:type` | Tipo schema.org da página: `WebPage` (padrão), `AboutPage`, `ContactPage` ou `CollectionPage` |
| `lcpc:service`, `lcpc:service-type`, `lcpc:service-description` | Geram o schema `Service` das páginas comerciais (prestador: a empresa; área: a cidade de São Paulo) |

`<title>` e `<meta name="description">` também são lidos da página.

## Comandos

Requer Node 24.11 ou mais novo. Os scripts em TypeScript rodam direto no Node (sem compilar), por isso os imports usam a extensão `.ts`.

```bash
npm install
npm run dev        # wrangler dev em http://127.0.0.1:4321; refaz o build ao salvar arquivos de src/ e public/
npm run build      # gera o site em dist/ (node --env-file-if-exists=.env scripts/build.ts)
npm run preview    # build + wrangler dev em http://127.0.0.1:4321, com o Worker e os cabeçalhos reais
npm run check      # tsc --noEmit (site e Worker)
npm run verify     # verificações do dist/ (use "node scripts/verify-site.mjs --production" para o build de produção)
npm test           # check + build + verify
npm run test:e2e   # testes no Chrome. Requer o preview rodando: npm run preview
npm run media      # regenera as mídias a partir dos originais (o vídeo e os quadros do vídeo exigem ffmpeg)
node scripts/prepare-media.mjs --sem-video   # só recortes, ícones e quadros; não reencoda o vídeo
npm run types      # regenera worker-configuration.d.ts depois de mudar o wrangler.jsonc
npm run deploy     # wrangler deploy (publica na Cloudflare; veja "Publicação na Cloudflare")
```

O `wrangler.jsonc` roda `npm run build` antes de cada `wrangler dev` e `wrangler deploy`, então o `dist/` publicado nunca está desatualizado.

## Onde editar

| O que muda | Arquivo |
| ----- | ----- |
| Texto e estrutura de uma página | `src/pages/<página>/index.html` |
| Nome, endereço, telefone, e-mail | `src/data/business.ts` |
| Catálogo: categoria, prioridade e status de cada item | `src/data/catalog.ts` |
| Mensagens de WhatsApp | `src/data/whatsapp.ts` |
| Perguntas frequentes (o JSON-LD sai da mesma lista) | `src/data/faq.ts` |
| Imagens, textos alternativos, legendas e vídeo | `src/data/media.ts` |
| Menu e configuração por ambiente | `src/data/site.ts` |
| Cabeçalho, rodapé, `<head>` e JSON-LD | `scripts/lib/layout.ts` |
| Seletor de sintomas (opções, o que é avaliado, o que enviar, links) | `src/data/symptoms.ts` |
| Raio-x do gabinete (componentes, serviços e links) | `src/data/xray.ts` |
| Passos de "como funciona" (e HowTo) | `src/data/steps.ts` |
| Fontes (subconjunto e fontes de reserva) | `scripts/fonts/subset.py` e `src/styles/fonts.css` |
| Cores, tipografia, espaçamento e movimento | `src/styles/global.css` e `src/styles/parts/*.css` |
| robots.txt, sitemap, llms.txt, llms-full.txt, security.txt | `scripts/lib/site-files.ts` |
| Cabeçalhos HTTP, cache e Range | `src/worker/index.ts` |
| Nome do Worker, host de produção, domínio | `wrangler.jsonc` |

Para expandir a presença gamer depois, crie páginas abaixo de `/pc-gamer/`, como `/pc-gamer/montagem/` (um `index.html` em `src/pages/pc-gamer/montagem/`). As URLs atuais não precisam mudar. Páginas novas só entram no menu e no sitemap se forem acrescentadas em `mainNav`, em `src/data/site.ts`.

## Materiais

Os originais ficam em `materiais/lcpc-gaming/` e não são publicados. O script `scripts/prepare-media.mjs` gera os recortes em `src/assets/media/`, os ícones (48, 180, 192 e 512 px) e o vídeo em `public/media/`. Os arquivos têm nomes descritivos em português (ex.: `conserto-de-notebook-bancada-vila-marari.jpg`) porque o nome vai para a URL pública da imagem; o build verifica isso. No build, o `sharp` converte as imagens para AVIF, WebP e JPEG (qualidade 62, 74 e 78; PNG 90), com o hash do conteúdo no nome, em `dist/assets/img/`. O halo colorido do fundo da abertura foi reduzido a 30% em `prepare-media.mjs` (`node scripts/prepare-media.mjs --sem-video`), para o RGB do próprio gabinete ser a única cor. As variantes ficam em cache em `node_modules/.cache/lcpc-images`.

Os nomes no Drive não batem com os do brief, então os arquivos foram renomeados. Onde a pasta tinha várias fotos, a escolha foi nossa e pode ser trocada:

| Arquivo em `materiais/lcpc-gaming/` | Origem no Drive | Uso |
| ----- | ----- | ----- |
| `hero-pc-gamer.jpeg` | `hero-pc-gamer.jpeg` | Abertura da home e recortes de PC gamer |
| `luis-carlos.jpeg` | `luis-carlos-assistencia-tecnica.jpeg` | Home e Sobre |
| `conserto-notebook.jpeg` | pasta Conserto, `conserto-notebook-marari` (escolhida) | Foto principal de notebooks |
| `detalhe-notebook.jpeg` | `detalhe-notebook.jpeg` | Foto de apoio de notebooks |
| `bancada-lcpc.jpeg` | pasta Fotos da bancada, `conserto-de-computador-marari.jpeg` (escolhida) | "Na bancada" e Sobre |
| `video-pc-gamer.mp4` | `lcpc-assistencia-pc-gamer.mp4` | PC Gamer, com capa no segundo 22,5 |
| `logos/` | pasta Logos | `logo-sem-fundo.png` no site, `logo-tech.png` na imagem social |
| `extras/` | demais fotos das pastas | Cinco fotos usadas (placa-mãe com chave de precisão, bancada com luz de anel e logo, notebook aberto com mão em sinal de positivo, notebook Acer aberto, notebook com chaves de precisão) |
| quadros do `video-pc-gamer.mp4` | segundos 10, 17 e 22,5 | Três quadros usados como fotos em `/pc-gamer/`, na home e em `/conserto-de-computador/` (o vídeo tem 464x832, então só entram em tamanho pequeno) |
| `extras/nao-publicar-macbook/` | pasta Fotos da bancada | **Não usar enquanto Apple estiver fora do escopo:** o MacBook aparece nas fotos |
| `catalogo-extraido.json` | extraído do PDF, com a cor de cada item | Base da comparação feita por `npm run verify` |
| `referencias/` | brief da revisão 2 (**o arquivo termina no meio da frase, em "Não usar “também monta” como"; o que faltava não foi inventado**), brief original e o estudo de palavras-chave (xlsx, 1.189 termos, São Paulo capital) | Só consulta. Nada daqui vai para o `dist/` (o `verify` confere) e a tabela de volumes não é publicada |

## Direção visual, movimento e SEO desta versão (revisão 2)

- **Cor:** a interface é grafite neutro mais **uma** cor de ação, o laranja da logo (`#fa6a0a` e `#ff7d26`). Os azuis, o marinho e os blocos coloridos saíram. O RGB do hardware é a única cor da página: as fotos reais ficam levemente dessaturadas e "ligam" (cor total) quando chegam à região central da tela, ou com mouse e foco. Só a foto de abertura é sempre saturada. `npm run verify` falha se CSS escrito à mão, SVG em linha ou o HTML final usar um matiz fora da família do laranja (a logo e as fotos não entram na conta) e se `margin`, `padding` ou `gap` sairem da escala de espaçamento `--s-1` a `--s-8` (4, 8, 12, 16, 24, 32, 48 e 64 px).
- **Movimento (aprimoramento progressivo):** (1) a abertura "liga" no carregamento, em cerca de 1,3 s, sem atrasar o LCP; (2) as fotos acendem pela rolagem (`animation-timeline: view()` atrás de `@supports`, sem JavaScript, também em tela de toque; navegadores sem suporte mostram a cor natural); (3) navegação entre páginas com `@view-transition` (cabeçalho e barra do celular ficam parados e a foto do bloco de serviço se move até a foto da página de destino); (4) as linhas do seletor de sintomas acendem em sequência, como uma tela de POST; (5) o sinal que corre pela trilha de circuito. Só `transform`, `opacity` e, nas fotos, `filter` (animado no compositor). Com `prefers-reduced-motion: reduce` nada disso roda e as fotos ficam em cor natural; o teste confere animações em execução, regras de View Transition ativas e transições.
- **Espaçamento:** escala única `--s-1` a `--s-8` em todo o CSS. As seções têm no máximo 64 px acima e 48 px abaixo no desktop (32 e 24 px no celular).
- **Conteúdo e SEO:** "assistência técnica" lidera, com conserto, manutenção, montagem e upgrade de forma natural; notebook aparece primeiro entre os equipamentos. Os H1 vêm do brief. Cada página comercial tem uma intenção, bloco de resposta direta (50 a 100 palavras), FAQ e links descritivos entre sintomas, serviços e páginas. A home segue a ordem do brief (apresentação, serviços por equipamento, seletor de problemas, como funciona, trabalho, Luis, FAQ, localização, chamada final); avaliações reais ficam de fora porque não há material verificável. Termos de marca e de assistência autorizada não são usados.
- **Metadados:** título da home fixo pelo brief (48 caracteres, única exceção ao intervalo de 50 a 60); descrições de 140 a 160 caracteres (agora falham o `verify`); imagem social de cada página (`scripts/lib/og.ts`, com o texto gerado pela entrada `text` do `sharp` e as fontes de `src/assets/fonts/og/`; a dependência `opentype.js` foi removida).
- **Dados estruturados:** `LocalBusiness` (com `hasMap`, `contactPoint` e `containedInPlace` Zona Sul / São Paulo), `WebSite`, `WebPage` (ou `AboutPage`, `ContactPage`, `CollectionPage`) com `primaryImageOfPage` e `speakable` (título e bloco de resposta), `BreadcrumbList`, `FAQPage`, `Service`, `HowTo` na home (espelha a seção "Como funciona"; o Google não dá mais resultado rico para HowTo, o valor é de leitura por IA), `VideoObject` em `/pc-gamer/`, `ImageObject`, `Person` e `OfferCatalog`. Continua sem horário, nota, avaliações, faixa de preço e coordenadas. Os blocos foram validados contra o vocabulário oficial do schema.org (tipos, propriedades e domínios).
- **Rastreamento e GEO:** `robots.txt` com regra explícita por rastreador (buscadores; busca e resposta de IA: OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User; treinamento e controle de uso: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, Amazonbot, Meta-ExternalAgent, CCBot), todos liberados e sem bloqueio (a trava em preview é o `noindex`). **Decisão do cliente pendente:** liberar os rastreadores de treinamento foi mantido da revisão 1; para bloquear algum, troque `Allow: /` por `Disallow: /` na lista `AI_TRAINING_CRAWLERS` de `scripts/lib/site-files.ts`. `sitemap.xml` com imagens e a entrada de vídeo de `/pc-gamer/` (vazio em preview). `llms.txt` (índice com links) e `llms-full.txt` (respostas, FAQ, passos e todos os itens publicados do catálogo), sem promessa de citação e com links relativos em preview e absolutos em produção. `/.well-known/security.txt` (RFC 9116, e-mail oficial; a data de validade renova a cada build).
- **Desempenho:** ver a seção "Desempenho" abaixo.

## Desempenho

- **Fontes:** subconjunto em português (ASCII, acentos e pontuação) com `scripts/fonts/subset.py` (fonttools e brotli, fora das dependências do projeto): de 82 KB para 31 KB em três arquivos; a IBM Plex Sans variável ficou só com o eixo 400 a 700. Só a Saira 700 (título da abertura) é pré-carregada. As fontes de reserva usam `size-adjust` e overrides calculados com as larguras reais (Arial como base), e o teste atrasa a fonte em 1,5 s para conferir que a troca não gera CLS. Para regenerar: `pip install fonttools brotli` e `python scripts/fonts/subset.py`; copie as métricas impressas para `src/styles/fonts.css`.
- **CSS:** só o que a página usa (`purge-css.ts`), embutido. `content-visibility: auto` foi medido e descartado: na rolagem completa a altura estimada das faixas gerou CLS de 0,02 a 0,04 (o TBT já é 0), então as faixas renderizam normalmente.
- **Imagens:** `sizes` por posição real (inclusive a galeria de duas colunas no celular), só a abertura com prioridade alta, cor de reserva de 7 caracteres no lugar do LQIP em base64.
- **Vídeo:** nada baixa antes do clique (nem o arquivo nem a capa JPEG); a capa é uma imagem AVIF/WebP preguiçosa e o `<video>` nasce no clique. Fonte principal em AV1/WebM (~1,1 MB, SSIM igual ao do MP4 H.264 de ~2,5 MB, que fica como reserva). Para refazer: `node scripts/prepare-media.mjs --so-webm`.
- **Navegação:** Speculation Rules (`prerender` moderado, só links internos) e View Transitions. O GTM e o GA4 esperam o `prerenderingchange`, para não contar visita pré-renderizada.
- **Cabeçalhos (Worker):** `Cache-Control` por tipo (`/assets/*` imutável; `/media/*` 30 dias; ícones e imagens sociais 1 dia; robots, sitemap e llms 1 hora; HTML revalida) e `Link` de preload da fonte e da foto de abertura.

## Catálogo

O PDF tem 121 itens: 65 verdes, 32 amarelos e 24 vermelhos. Todos estão em `src/data/catalog.ts`, com a cor original e um status:

- `publicado`: vai ao ar com o texto do PDF.
- `publicado-adaptado`: vai ao ar com o texto de `label`.
- `pendente`: fora do ar até validação.
- `excluido`: nunca é renderizado.

Para mudar uma decisão, altere o status do item. `npm run verify` confirma que todo item publicado está em `/servicos/` e que nenhum vermelho ou pendente aparece em texto, metadados ou JSON-LD.

## Configuração

Copie `.env.example` para `.env` (uso local) ou defina as variáveis no ambiente de build da Cloudflare. Elas são lidas **no build** (`process.env`), não pelo Worker.

| Variável | Efeito |
| ----- | ----- |
| `PUBLIC_SITE_URL` | Domínio de produção, com `https` e sem barra final. Gera canônicas, sitemap e URLs absolutas |
| `PUBLIC_INDEXABLE` | Use `true` só no build de produção |
| `PUBLIC_GTM_ID` | Ativa o Google Tag Manager |
| `PUBLIC_GA4_ID` | Ativa o GA4 direto. É ignorado se houver GTM |
| `PUBLIC_GOOGLE_BUSINESS_URL` | Mostra o link do Perfil da Empresa no rodapé e em Contato, e o inclui no `sameAs` |

**Previews ficam fora da indexação por padrão.** Sem `PUBLIC_SITE_URL` e `PUBLIC_INDEXABLE=true`, as páginas saem com `noindex`, sem canônica e com o sitemap vazio. O `robots.txt` não bloqueia o rastreamento de propósito, porque o buscador precisa acessar a página para ler o `noindex`.

Para conferir um build de produção: `npm run build` com as variáveis definidas e depois `node scripts/verify-site.mjs --production`. No PowerShell: `$env:PUBLIC_SITE_URL='https://...'; $env:PUBLIC_INDEXABLE='true'; npm run build`. Depois, limpe as variáveis (`$env:PUBLIC_SITE_URL=''`) e rode `npm run build` de novo para voltar ao build de preview.

**Segunda trava no Worker:** a variável `PRODUCTION_HOST`, em `wrangler.jsonc`, vale para qualquer build. Enquanto estiver vazia, ou em qualquer host diferente dela (como `lcpc-gaming.<conta>.workers.dev` e URLs de preview), o Worker responde com `X-Robots-Tag: noindex, nofollow`. Assim, um build de produção publicado por engano num endereço de teste continua fora do Google.

## Medição

Cada clique em um CTA de WhatsApp envia o evento `whatsapp_click`:

| Parâmetro | Exemplo | Conteúdo |
| ----- | ----- | ----- |
| `page_path` | `/pc-gamer/` | Caminho da página, sem parâmetros de URL |
| `service_category` | `pc_gamer_upgrade`, `sintoma_nao_liga` | Contexto do botão. Os botões do seletor de sintomas usam `sintoma_*` |
| `cta_location` | `hero`, `barra_celular`, `faixa_final` | Posição do botão |

O clique não espera o analytics para abrir o WhatsApp, e o evento não leva dados pessoais nem o texto da mensagem. No GTM, crie um acionador de evento personalizado `whatsapp_click` e passe os três parâmetros por variáveis da camada de dados. No GA4 direto, registre os parâmetros como dimensões personalizadas.

**O evento mede só a primeira etapa.** Não trate esses números como equivalentes:

| Etapa | O que é | Onde medir |
| ----- | ----- | ----- |
| Clique | A pessoa clicou no botão. Pode desistir antes de enviar | GA4, evento `whatsapp_click` |
| Conversa iniciada | A mensagem chegou ao WhatsApp da LCPC | WhatsApp Business, contagem manual ou CRM |
| Lead qualificado | O equipamento e o problema estão dentro do escopo atendido | Registro manual do atendimento |
| Venda | O orçamento foi aprovado e o serviço, contratado | Controle comercial |

A mensagem pré-preenchida ajuda a identificar conversas vindas do site, mas a pessoa pode editá-la antes de enviar.

### Usar `whatsapp_click` como conversão no Google Ads (nada disso foi configurado)

O site já envia o evento; falta só ligar as contas, depois da publicação. Passo a passo para quem for ativar:

1. No **GTM**, publique um acionador do tipo "Evento personalizado" com o nome `whatsapp_click` e variáveis de camada de dados para `page_path`, `service_category` e `cta_location`. Se usar GA4 direto, o evento já chega ao GA4 com esses três parâmetros.
2. No **GA4** (Administrador > Eventos), marque `whatsapp_click` como **evento principal** (conversão) e registre os três parâmetros como dimensões personalizadas.
3. Vincule o GA4 ao Google Ads (Administrador > Vínculos do Google Ads) e, no Ads, em Metas > Conversões > Nova ação de conversão > Importar > "Google Analytics 4", importe `whatsapp_click`. Alternativa: criar a conversão direto no Ads (tipo "Site") e disparar a tag de conversão no GTM com o mesmo acionador.
4. Atribua à conversão o valor "usar o mesmo valor para cada conversão" ou nenhum valor, já que o site não conhece preço, e escolha "uma" conversão por clique. Lembre que o clique é a **primeira etapa** (veja a tabela acima): para otimizar por lead qualificado, importe depois a conversa iniciada ou o lead marcado no CRM como conversão offline.
5. Páginas de destino para anúncios: cada URL comercial (`/`, `/conserto-de-notebook/`, `/conserto-de-computador/`, `/pc-gamer/`) já mostra o H1 e o botão "Solicitar orçamento no WhatsApp" na primeira tela, no celular e no desktop. Use parâmetros UTM na URL do anúncio; `page_path` não leva parâmetros, então o relatório de campanha vem das UTM no GA4.
6. LGPD: resolva política de privacidade e aviso de cookies antes de ativar GTM ou GA4.

## Publicação na Cloudflare

O site roda no Cloudflare Workers com Static Assets (`wrangler.jsonc`, Worker `lcpc-gaming`). Nada foi publicado ainda. O `wrangler deploy` **publica de verdade**: só rode depois da revisão.

### Primeira publicação (endereço `*.workers.dev`, sem domínio)

1. Crie ou use a conta da Cloudflare do cliente e entre pelo terminal: `npx wrangler login` (abre o navegador). Em máquina sem navegador ou em CI, use um token de API com a permissão "Edit Cloudflare Workers" em `CLOUDFLARE_API_TOKEN` e o `CLOUDFLARE_ACCOUNT_ID`. Confira a conta com `npx wrangler whoami`.
2. Teste o empacotamento sem publicar: `npx wrangler deploy --dry-run`.
3. Publique: `npm run deploy`. O comando roda o build, envia o `dist/` e o Worker e mostra o endereço `https://lcpc-gaming.<subdomínio>.workers.dev`. Esse endereço sai com `noindex` (o `PRODUCTION_HOST` ainda está vazio), o que é o esperado para revisão.

### Com o domínio confirmado

1. **Domínio na Cloudflare:** a zona do domínio precisa estar na mesma conta (Workers & Pages > o Worker > Settings > Domains & Routes > Add > Custom Domain), ou acrescente em `wrangler.jsonc`: `"routes": [{ "pattern": "www.dominio.com.br", "custom_domain": true }]`. Há um comentário no arquivo marcando o lugar.
2. **`PRODUCTION_HOST`:** em `wrangler.jsonc`, em `vars`, preencha com o host exato, sem `https://` e sem barra (`"www.dominio.com.br"`). Só esse host sai sem `X-Robots-Tag`. Se o site responder também no domínio sem `www`, configure um redirecionamento para o host principal na Cloudflare.
3. **Variáveis de build:** `PUBLIC_SITE_URL` (`https://www.dominio.com.br`, sem barra final) e `PUBLIC_INDEXABLE=true`, além de `PUBLIC_GTM_ID` ou `PUBLIC_GA4_ID` e `PUBLIC_GOOGLE_BUSINESS_URL` quando existirem. Localmente, defina-as no ambiente do terminal ou em um `.env` (que não vai para o Git) antes de `npm run deploy`.
4. Rode `node scripts/verify-site.mjs --production` depois do build e então `npm run deploy`.

### Publicação automática (Workers Builds, opcional)

Em Workers & Pages > o Worker > Settings > Builds, conecte o repositório Git. Configure:

| Campo | Valor |
| ----- | ----- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` (o padrão) |
| Variáveis de build | `NODE_VERSION=24` (obrigatório: o build roda TypeScript direto no Node e precisa do Node 24) e as `PUBLIC_*` da seção Configuração |

O nome do Worker no painel precisa ser igual ao `name` do `wrangler.jsonc` (`lcpc-gaming`). O `wrangler deploy` roda o build de novo por causa do `build.command` do arquivo, o que é inofensivo.

### Depois da publicação

1. Confirme o domínio e publique com `PUBLIC_SITE_URL` e `PUBLIC_INDEXABLE=true`. HTTPS, compressão e cache já vêm da Cloudflare; o Worker acrescenta cache imutável em `/assets/*` e revalidação no HTML.
2. No [Google Search Console](https://search.google.com/search-console), adicione uma propriedade de domínio e valide pelo registro DNS.
3. Em **Sitemaps**, envie `sitemap.xml`.
4. Em **Inspeção de URL**, solicite a indexação da home e de `/pc-gamer/`.
5. Confira se nome, endereço e telefone são idênticos aos do Perfil da Empresa no Google e aponte o perfil para o novo site.
6. Rode o [PageSpeed Insights](https://pagespeed.web.dev/) e o [validador de schema](https://validator.schema.org/) nas URLs finais.
7. Confirme no navegador que o vídeo de `/pc-gamer/` toca no iPhone (o Worker responde `206 Partial Content`; veja `src/worker/index.ts`). O iPhone sem AV1 usa o MP4 de reserva.
8. **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)): adicione o site (dá para importar do Search Console), envie o `sitemap.xml` e confira o rastreamento. O Bing alimenta também respostas de assistentes de IA.
9. **IndexNow** (Bing e outros buscadores): gere uma chave, publique um arquivo `<chave>.txt` na raiz do domínio com a própria chave como conteúdo (acrescente em `public/`) e avise as URLs novas ou alteradas com uma requisição a `https://api.indexnow.org/indexnow?url=<URL>&key=<chave>`. Depende do domínio final, por isso não foi feito.
10. Com o domínio no ar: confira `robots.txt`, `llms.txt`, `llms-full.txt` e `/.well-known/security.txt` na URL final; o `security.txt` usa `Canonical` com o domínio.
11. Rode o Lighthouse de SEO na URL final ou localmente com `PRODUCTION_HOST` igual ao host do teste (veja "Testes"): no preview a nota de SEO cai só por causa do `noindex` intencional.
12. No Search Console, acompanhe Desempenho (consultas e páginas) e Experiência > Core Web Vitals. A Web Vitals real só aparece depois de algumas semanas de tráfego.

## Pendências de validação

### Faltam dados do cliente

O site não inventa nada disso. Cada item está tratado com "consulte pelo WhatsApp" ou simplesmente não aparece.

- [ ] Domínio de produção. O e-mail sugere `lcpcgaming.com`, mas não há confirmação.
- [ ] Link direto do Perfil da Empresa no Google.
- [ ] Horários de atendimento.
- [ ] Avaliações e depoimentos reais. Hoje o site não tem prova social de terceiros.
- [ ] Garantias, prazos e preços.
- [ ] Cobertura e condições de retirada, entrega e atendimento em domicílio.
- [ ] Informações profissionais de Luis Carlos, como tempo de experiência e formação.
- [ ] CNPJ ou razão social, se quiserem no rodapé.
- [ ] Política de privacidade e aviso de cookies. **Resolver antes de ativar GTM ou GA4,** por causa da LGPD.

### Textos e fatos novos para validar

- [ ] **Zona Sul:** "Vila Marari, bairro da Zona Sul de São Paulo" (CEP 04402) aparece na home, em `/contato/`, no `llms.txt` e no FAQ. É um fato geográfico, não uma promessa de cobertura. Confirmar que o cliente concorda com a frase.
- [ ] **Mensagens de WhatsApp do seletor de sintomas** (`src/data/whatsapp.ts`: não liga, sem vídeo, esquentando, travando, reiniciando, tela quebrada, não carrega). Os textos são novos e seguem o estilo das mensagens do brief. Em `/pc-gamer/` o seletor usa a mensagem de manutenção gamer do brief.
- [ ] **Raio-x do gabinete** (`src/data/xray.ts`): o vínculo de cada componente com um serviço do catálogo (ventoinhas, bomba do water cooler, memória RAM, placa de vídeo, entrada de ar, montagem) e os nomes dos componentes foram definidos olhando a foto. Conferir.
- [ ] **FAQ novos** de `/servicos/` e `/contato/` (`src/data/faq.ts`) e os blocos de resposta direta de cada página.
- [ ] **Quadros do vídeo como fotos:** três quadros do vídeo viraram fotos em `/pc-gamer/`, na home e em `/conserto-de-computador/`. Valem as mesmas dúvidas de uso do vídeo, e a resolução é baixa (464x832).
- [ ] **Foto com mão em sinal de positivo** (`extras/assistencia-computador-gamer-zona-sul.jpeg`): a legenda não diz de quem é a mão.
- [ ] **Imagens sociais e ícones** usam o PNG da logo (não há vetor) e o monograma LCPC. Vale pedir o SVG.
- [ ] **Mapa do Google:** a página só carrega o iframe depois do clique (nenhuma requisição ao Google antes). Se o site passar a ter política de privacidade, mencionar o mapa.

### Dúvidas do catálogo

| Item | Conflito no PDF | Decisão atual |
| ----- | ----- | ----- |
| Placa de rede, Wi-Fi e Bluetooth (seção 3) | Verde, mas instalação de adaptadores e diagnóstico de Wi-Fi estão em vermelho na seção 10 | **Oculto** |
| Windows, macOS ou Linux (seção 7) | Verde, mas reinstalação de macOS está em vermelho na seção 11 | Publicado sem macOS |
| Montagem de workstation (seção 6) | Verde, mas workstation está em vermelho na seção 11 | Publicado sem workstation |
| Acesso remoto e VPN (seção 10) | Amarelo, mas fora da lista resumida do brief | Publicado como complementar |
| Atendimento no escritório (seção 13) | Verde, mas atendimento para empresas está em vermelho na seção 12 | Publicado, mediante consulta |
| Contas de usuário e e-mail (seção 7) | Verde, mas a versão para empresas está em vermelho na seção 12 | Publicado |
| Portas soldadas, inclusive rede (seção 4) | Amarelo, perto dos serviços de rede em vermelho | Publicado como reparo de placa |

Confirme também como responder quem pedir um equipamento excluído, como notebook gamer ou MacBook. O site não cita esses casos e orienta a enviar marca e modelo para confirmar o atendimento.

### Mídia

- [ ] **Abertura da home:** o fundo foi editado. Parede, capacete, boneco e prateleira deram lugar a grafite com um halo bem discreto (30% do halo da revisão 1, para o RGB do gabinete ser a única cor). O gabinete não foi alterado. Aprovar o resultado.
- [ ] **Marcas de terceiros na foto de abertura:** aparecem os adesivos Correa Motores e TUF, um boneco do Batman e um ímã do Buzz Lightyear, além das marcas dos componentes. Confirmar se podem ser usados.
- [ ] **Dono do PC:** a legenda não diz que o PC é de Luis, porque isso não foi confirmado. Se for, ajuste em `src/data/media.ts`.
- [ ] **Vídeo:** o áudio pode ser uma trilha musical e não foi possível avaliar os direitos de uso. Também não há legendas. O gabinete do vídeo não é o mesmo da foto de abertura.
- [ ] **Logo:** não existe SVG na pasta. O site usa o PNG transparente de 500 px. Vale pedir o vetor.
- [ ] **Nome:** a pasta do projeto diz "LCCP-Gaming", mas o nome oficial é LCPC Gaming, que é o usado no site.

## Testes

- `npm test`: tipos (site e Worker), build e verificações do HTML gerado. Cobre catálogo contra PDF, termos proibidos (inclusive em `llms.txt` e `llms-full.txt`: "também monta", "Vila Mariana", "nossa equipe", "perto de mim", marcas e assistência autorizada), WhatsApp, links, âncoras, metadados (título da home exato do brief; demais títulos de 50 a 60 e descrições de 140 a 160 caracteres, agora como falha), H1 de cada página comercial, abertura da home (botões e descrição do brief, nada de endereço antes do H1), ordem das seções da home, paleta (nenhum matiz fora da família do laranja no CSS escrito à mão, em SVG em linha e no HTML final), escala de espaçamento, JSON-LD (WebSite, WebPage com `speakable`, Service, HowTo igual à seção visível, VideoObject, ImageObject, Person, `hasMap`, `contactPoint`, `containedInPlace`, sem coordenadas), imagem social de cada página (1200x630, abaixo de 300 KB), mínimo de 400 palavras, resposta direta de 50 a 100 palavras, FAQ, seletor de sintomas no HTML, vídeo (nenhum `<video>` fora do `<noscript>`, capa em imagem sob demanda, WebM antes do MP4), ausência de iframe antes do clique no mapa, `sizes` nas imagens, nomes de imagem descritivos, regra de Apple, `robots.txt` (regra por rastreador, sem `Disallow`), `llms.txt` e `llms-full.txt` (itens publicados e links), `security.txt`, sitemap com imagens e vídeo, Speculation Rules, `@view-transition`, fontes (3 arquivos, menos de 40 KB, uma só pré-carregada, fonte de reserva), animações só de `transform`, `opacity` e, nos dois keyframes do conceito de cor, `filter`, nada de `materiais/` no `dist/`, nome, endereço e telefone, modo de indexação e ausência de tags `<lcpc-*>`.
- `npm run test:e2e`: rolagem horizontal em 13 larguras, alvos de toque (48 px nos CTAs), menu, teclado e foco, vídeo sob demanda (nenhuma requisição ao vídeo nem à capa antes do clique, capa só perto da tela, WebM e queda para o MP4), todos os CTAs de WhatsApp, evento, barra do celular, navegação sem JavaScript, **movimento reduzido de verdade** (nenhuma animação nem transição em execução, nenhum elemento com `animation-name`, regras de View Transition inativas, fotos em cor natural), as fotos acendendo pela rolagem e pelo mouse (e só pela rolagem em tela de toque), View Transition entre páginas com a foto compartilhada, Speculation Rules, CLS e LCP, imagens que não baixam variante maior que a necessária (celular 2x, desktop 1x e 2x), fonte atrasada em 1,5 s sem CLS, rolagem completa sem CLS nem quadros longos, cache e `Link` do Worker, 404, requisições `Range` (206/416) para MP4 e WebM, raio-x (agora em `/pc-gamer/`: posição dos pontos e trilhas em 5 larguras, rótulos sem sobreposição, foco de teclado), seletor de sintomas, mapa. Roda contra o `npm run preview` (wrangler dev), que exercita o Worker de verdade.

Última medição (revisão 2, Lighthouse 13.6, celular, build de produção com domínio de teste e `--var PRODUCTION_HOST:127.0.0.1`, script do antivírus bloqueado): home e `/pc-gamer/` com desempenho 98, acessibilidade 100 e SEO 100; LCP simulado 2,2 s nas duas, CLS 0, TBT 0 ms, Speed Index 1,7 s; 287 KiB (home) e 238 KiB (`/pc-gamer/`) transferidos. A nota de práticas recomendadas fica em 81 só porque o teste local roda em HTTP. O servidor local (`wrangler dev`) não comprime o HTML, o que pesa uns 0,4 s no LCP local; na Cloudflare o HTML sai com gzip/brotli (de ~90 KB para ~19 KB). Ao rodar o Lighthouse nesta máquina, bloqueie o host `kaspersky-labs.com` (`--blocked-url-patterns=*kaspersky-labs.com*`): o antivírus injeta um script de 207 KB e distorce a nota. Para medir o SEO localmente, suba o preview com um build de produção e `--var PRODUCTION_HOST:127.0.0.1`; sem isso o Worker envia `X-Robots-Tag: noindex` e o Lighthouse reprova a indexação.
