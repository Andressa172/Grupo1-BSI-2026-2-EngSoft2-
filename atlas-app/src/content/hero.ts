/**
 * ------------------------------------------------------------
 * HERO CONTENT CONFIGURATION — ATLAS (SOS Criança)
 * ------------------------------------------------------------
 * Conteúdo da seção hero da landing page institucional do ATLAS,
 * sistema de gestão desenvolvido para o SOS Criança - Serviço de
 * Obras Sociais de Presidente Prudente.
 */

export const HERO_CONTENT = {
  /**
   * Social proof badge displayed above the hero heading.
   */
  badge: "Desenvolvido para o SOS Criança - Presidente Prudente",

  /**
   * User avatars shown alongside the social proof badge.
   */
  reviewBadgeImgs: [
    { src: "/avatar_imgs/img_1.png", alt: "colaborador1" },
    { src: "/avatar_imgs/img_2.png", alt: "colaborador2" },
    { src: "/avatar_imgs/img_3.jpg", alt: "colaborador3" },
    { src: "/avatar_imgs/img_4.jpg", alt: "colaborador4" },
    { src: "/avatar_imgs/img_5.jpg", alt: "colaborador5" },
  ],

  /**
   * Main hero headline.
   */
  heading: "Mais organização para",

  highlightedHeading: "Transformar Vidas",

  /**
   * Supporting hero description.
   */
  subheading:
    `
      O ATLAS une estoque, doações, caixa e cardápios em um único lugar,
      para que o SOS Criança passe menos tempo em planilhas e mais tempo
      cuidando de crianças e adolescentes de Presidente Prudente.
    `,

  /**
   * Hero call-to-action buttons.
   */
  cta: {
    primary: {
      label: "Acessar o Sistema",
      link: "/auth",
    },
    secondary: {
      label: "Entrar",
      link: "/auth",
    },
  },

  /**
   * Main hero illustration or product preview image.
   */
  heroImage: {
    src: "/dashboard.png",
    alt: "painel-atlas",
  },

  /**
   * Heading displayed above the trust logos section.
   */
  trustHeading: "Apoiado por quem acredita nessa causa",

  /**
   * Collection of company/client logos used for credibility.
   */
  trustLogos: [
    { src: '/logos/google.png', alt: 'parceiro' },
    { src: '/logos/figma.png', alt: 'parceiro' },
    { src: '/logos/adobe.png', alt: 'parceiro' },
    { src: '/logos/netflix.png', alt: 'parceiro' },
    { src: '/logos/stripe.png', alt: 'parceiro' },
  ],
};
