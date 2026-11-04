# Site da LCPC Gaming

Site institucional da LCPC Gaming, assistência técnica de computadores e notebooks na Vila Marari, em São Paulo. O objetivo comercial é gerar pedidos de orçamento qualificados pelo WhatsApp, com destaque para PC gamer desktop.

Feito em HTML, CSS e TypeScript, sem framework, e publicado no Cloudflare Workers (Workers Static Assets). **Ainda não foi publicado:** a publicação fica para depois da revisão.

| Página | Intenção principal |
| ----- | ----- |
| `/` | Assistência técnica de computadores e notebooks na Vila Marari |
| `/pc-gamer/` | Montagem, upgrade e manutenção de PC gamer em São Paulo |
| `/conserto-de-notebook/` | Conserto de notebook na Vila Marari |
| `/conserto-de-computador/` | Conserto de computador e all-in-one na Vila Marari |
| `/servicos/` | Catálogo completo por prioridade |
| `/sobre/` | Luis Carlos e a LCPC Gaming |
| `/contato/` | Endereço, WhatsApp, e-mail e "Como chegar" |

## Como o site é montado

- **As páginas são arquivos HTML de verdade** em `src/pages/` (`index.html`, `pc-gamer/index.html`, `404.html` etc.). O texto e a estrutura de cada página estão ali, dentro de `<main>`, e podem ser lidos e editados à mão.
- **Dados centrais ficam em TypeScript** (`src/data/`): empresa, catálogo, mensagens de WhatsApp, FAQ, mídia e menu. Nada disso é copiado para as páginas: elas pedem os dados por tags (veja abaixo), então a mudança vale no site inteiro.
- **O cabeçalho, o rodapé, a barra do celular, as migalhas, as metatags, o JSON-LD e o analytics não estão nas páginas.** O build (`scripts/build.ts`) acrescenta tudo isso a cada página.
- **O CSS** está em `src/styles/global.css` e é embutido em cada HTML. As fontes (Saira Condensed e IBM Plex Sans, licença OFL) ficam em `src/assets/fonts/` e são declaradas em `src/styles/fonts.css`.
- **O JavaScript do navegador** está em `src/client/` (evento `whatsapp_click`, barra do celular, menu, vídeo), compilado e embutido no fim de cada página.
- **O Worker** (`src/worker/index.ts`) serve o site na Cloudflare e acrescenta cabeçalhos de segurança, cache, `noindex` fora do domínio de produção e suporte a `Range` para o vídeo.

### Tags `<lcpc-*>` nas páginas

São "marcadores" que o build troca pelo HTML final. Nenhuma tag `<lcpc-*>` chega ao `dist/`, e um valor desconhecido (contexto, categoria, foto, conjunto de FAQ ou tag) **interrompe o build** com a página e a lista de opções válidas.

| Tag | O que gera |
| ----- | ----- |
| `<lcpc-whatsapp context="notebook" location="hero" variant="primary">Texto do botão</lcpc-whatsapp>` | Botão ou link de WhatsApp com a mensagem do contexto (`src/data/whatsapp.ts`) e os atributos do evento. `variant`: `primary` (padrão), `dark` ou `text`. Sem texto, usa "Pedir orçamento no WhatsApp" |
| `<lcpc-photo name="consertoNotebook" sizes="..." widths="480,668" class="photo--cut" priority />` | `<figure>` com a foto de `src/data/media.ts` (nome da chave), `<picture>` em AVIF, WebP e JPEG e legenda. `priority` só para a imagem principal da página |
| `<lcpc-picture name="hero" art-name="heroMobile" ... preload />` | `<picture>` sem `<figure>`, com recorte para celular e `<link rel="preload">` no `<head>` (abertura da home) |
| `<lcpc-catalog category="diagnostico" class="ticks" exclude="texto" />` | Lista `<ul>` dos itens publicados da categoria (`src/data/catalog.ts`). `exclude` tira os itens que contêm o texto |
| `<lcpc-faq set="notebook" title="..." />` | Perguntas e respostas de `src/data/faq.ts` |
| `<lcpc-location context="contato" location="contato" label="..." />` | Endereço, contatos e botões de WhatsApp e "Como chegar" |
| `<lcpc-cta-band title="..." text="..." context="notebook" label="..." />` | Faixa final de chamada para o WhatsApp |
| `<lcpc-video />` | Player de vídeo sob demanda (`video` em `src/data/media.ts`) |
| `<lcpc-business field="owner.name" />` | Dado de `src/data/business.ts` dentro de um texto: `name`, `slogan`, `owner.name`, `owner.role`, `phone.display`, `email` |
| `<lcpc-services priority="foco" />`, `<lcpc-digital-block />`, `<lcpc-category-links />`, `<lcpc-category-link />`, `<lcpc-category-summaries />` | Blocos do catálogo em `/servicos/` e na home, gerados da lista de categorias |

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
npm run media      # regenera as mídias a partir dos originais (o vídeo exige ffmpeg)
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
| Cores, tipografia e layout | `src/styles/global.css` |
| Cabeçalhos HTTP, cache e Range | `src/worker/index.ts` |
| Nome do Worker, host de produção, domínio | `wrangler.jsonc` |

Para expandir a presença gamer depois, crie páginas abaixo de `/pc-gamer/`, como `/pc-gamer/montagem/` (um `index.html` em `src/pages/pc-gamer/montagem/`). As URLs atuais não precisam mudar. Páginas novas só entram no menu e no sitemap se forem acrescentadas em `mainNav`, em `src/data/site.ts`.

## Materiais

Os originais ficam em `materiais/lcpc-gaming/` e não são publicados. O script `scripts/prepare-media.mjs` gera os recortes em `src/assets/media/` e o vídeo em `public/media/`. No build, o `sharp` converte as imagens para AVIF, WebP e JPEG (qualidade 62, 74 e 78; PNG 90), com o hash do conteúdo no nome, em `dist/assets/img/`. As variantes ficam em cache em `node_modules/.cache/lcpc-images`.

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
| `extras/` | demais fotos das pastas | Duas usadas em Sobre, o resto fica de reserva |
| `extras/nao-publicar-macbook/` | pasta Fotos da bancada | **Não usar enquanto Apple estiver fora do escopo:** o MacBook aparece nas fotos |
| `catalogo-extraido.json` | extraído do PDF, com a cor de cada item | Base da comparação feita por `npm run verify` |

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
| `service_category` | `pc_gamer_upgrade` | Contexto do botão |
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
7. Confirme no navegador que o vídeo de `/pc-gamer/` toca no iPhone (o Worker responde `206 Partial Content`; veja `src/worker/index.ts`).

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

- [ ] **Abertura da home:** o fundo foi editado. Parede, capacete, boneco e prateleira deram lugar a grafite com um halo nas cores da foto. O gabinete não foi alterado. Aprovar o resultado.
- [ ] **Marcas de terceiros na foto de abertura:** aparecem os adesivos Correa Motores e TUF, um boneco do Batman e um ímã do Buzz Lightyear, além das marcas dos componentes. Confirmar se podem ser usados.
- [ ] **Dono do PC:** a legenda não diz que o PC é de Luis, porque isso não foi confirmado. Se for, ajuste em `src/data/media.ts`.
- [ ] **Vídeo:** o áudio pode ser uma trilha musical e não foi possível avaliar os direitos de uso. Também não há legendas. O gabinete do vídeo não é o mesmo da foto de abertura.
- [ ] **Logo:** não existe SVG na pasta. O site usa o PNG transparente de 500 px. Vale pedir o vetor.
- [ ] **Nome:** a pasta do projeto diz "LCCP-Gaming", mas o nome oficial é LCPC Gaming, que é o usado no site.

## Testes

- `npm test`: tipos (site e Worker), build e verificações do HTML gerado. Cobre catálogo contra PDF, termos proibidos, WhatsApp, links, âncoras, metadados, JSON-LD, nome, endereço e telefone, modo de indexação e a ausência de tags `<lcpc-*>` e de caminhos antigos (`/_astro/`) no `dist/`.
- `npm run test:e2e`: rolagem horizontal em 13 larguras, alvos de toque, menu, teclado e foco, vídeo sob demanda, todos os CTAs de WhatsApp, evento, barra do celular, navegação sem JavaScript, movimento reduzido, CLS e LCP, 404 e requisições `Range` (206/416) do vídeo. Roda contra o `npm run preview` (wrangler dev), que exercita o Worker de verdade.

Ao rodar o Lighthouse nesta máquina, bloqueie o host `kaspersky-labs.com` (`--blocked-url-patterns=*kaspersky-labs.com*`). O antivírus injeta um script de 207 KB em todas as páginas e distorce a pontuação de performance. Esse script não faz parte do site. Para medir o SEO localmente, suba o preview com um build de produção e `--var PRODUCTION_HOST:127.0.0.1`; sem isso o Worker envia `X-Robots-Tag: noindex` e o Lighthouse reprova a indexação.
