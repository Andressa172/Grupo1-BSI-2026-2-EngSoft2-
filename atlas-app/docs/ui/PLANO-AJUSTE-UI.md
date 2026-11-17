# Plano de ajuste de UI — tirar a "cara de template/IA" do ATLAS

> Arquivo de trabalho local. Rodar **depois** que os módulos estiverem fechados.
> Por enquanto o escopo é **só a landing page** (`src/app/(marketing)`, `src/components/sections`, `src/content`).
> Branch de trabalho: `ui/landing` (só commits, sem PR por enquanto).

## Objetivo
A landing veio de um template ("LeadFlow", SaaS de leads). Precisa parecer o que é: o sistema de
gestão do SOS Criança, de Presidente Prudente, feito para a rotina de uma ONG.

## Lista de ajustes

### Identidade
- [ ] **Logo:** criar uma nova ou usar a logo oficial do SOS Criança (pedir o arquivo à instituição).
      Aplicar em navbar, rodapé, tela de login, favicon (`src/app/icon.svg`) e `public/logo.svg`.
- [ ] **Remover "LeadFlow"** de todo lugar: imagem do painel (`public/dashboard.png`), `src/content/seo/global.ts`,
      `src/components/layout/footer.tsx`, `src/app/layout.tsx` (comentário), `package.json` (`name`).
- [ ] **Imagem de compartilhamento** (`public/default.png`, usada no `ogImage`): refazer com a identidade do ATLAS.

### Tipografia e texto
- [x] **Fontes:** trocar Geist + Libre Baskerville (visual padrão de template) por Plus Jakarta Sans (títulos e texto). *(feito na landing)*
- [ ] **Texto:** revisar os títulos e descrições das seções (hero, features, processo, FAQ, CTA) para uma voz
      mais humana e direta, sem frases genéricas de produto.

### Imagens
- [ ] **Prints do painel admin** na landing: trocar o print do LeadFlow por telas reais do ATLAS
      (hero, os 3 passos do "como funciona" e o CTA). *(feito na branch, ver abaixo)*
- [ ] **Prints do cadastro ao relatório:** refazer conforme as telas forem fechadas (hoje só há as de estoque,
      compras, caixa e dashboard).
- [ ] **Logos de "Apoiado por quem acredita nessa causa"** (`public/logos`: google, figma, adobe, netflix, stripe
      são do template): trocar pelos parceiros reais da ONG ou remover a faixa.
- [ ] **Fotos reais das pessoas** que vivem o dia a dia do SOS Criança (equipe, voluntários, crianças com
      autorização dos responsáveis): hero, depoimentos (`public/reviews_imgs`) e seção "quem somos".
      Pedir à instituição fotos próprias e termo de uso de imagem.

### Movimento
- [ ] **Animações ao rolar a página:** entradas suaves por seção (já existe fade/blur em algumas).
- [ ] **"Nossa história" com números crescendo** (contadores animados na seção de estatísticas, com dados reais
      da ONG: anos de atuação, crianças atendidas, etc.). Confirmar os números com a coordenação.

### Planos de contribuição
- [ ] **Cards de contribuição:** reagem ao passar o mouse (levantam de leve). *(feito na branch, ver abaixo)*
- [ ] Revisar valores, benefícios e links com a ONG; a página oficial é <https://soscriancaprudente.org/>.

## Já feito na branch `ui/landing`
- Cards de contribuição levantam de leve ao passar o mouse (sombra + elevação curta, respeitando
  `prefers-reduced-motion`).
- Fontes da landing: Plus Jakarta Sans (títulos e texto), moderna e limpa. Aplicadas só na
  landing; o sistema interno continua como está. Replicar no sistema depois que os módulos fecharem.
- Prints da landing refeitos com telas reais do ATLAS.

## Princípios
- Sutil: nada que chame mais atenção que o conteúdo.
- Acessível: contraste, foco visível, `prefers-reduced-motion`.
- Só na landing até os módulos fecharem; depois replicar nas telas internas.
- Sem dado fictício que pareça real (números, depoimentos, parceiros): ou é verdadeiro ou sai.
