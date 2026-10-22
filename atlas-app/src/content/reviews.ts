/**
 * ------------------------------------------------------------
 * REVIEWS SECTION CONTENT CONFIGURATION — ATLAS
 * ------------------------------------------------------------
 */

import { Star } from "lucide-react";

export const REVIEWS_CONTENT = {
  badge: {
    title: "Depoimentos",
    icon: Star,
  },

  heading: "Quem vive o dia a dia do SOS Criança",

  items: [
    {
      id: 1,
      name: "Vanessa Vasconcelos Brigatti",
      role: "Coordenadora",
      company: "SOS Criança",
      quote:
        "Com o ATLAS deixamos de depender de várias planilhas soltas. Agora conseguimos ver o estoque, as doações e o caixa em um só lugar.",
      image: "/reviews_imgs/img_1.jpg",
    },
    {
      id: 2,
      name: "Equipe do Espaço Amigo",
      role: "Projeto Socioeducativo",
      company: "SOS Criança",
      quote:
        "O controle de cardápio ficou muito mais simples. Sabemos exatamente quais alimentos estão disponíveis antes de planejar a semana.",
      image: "/reviews_imgs/img_2.jpg",
    },
    {
      id: 3,
      name: "Secretaria Administrativa",
      role: "Setor Financeiro",
      company: "SOS Criança",
      quote:
        "Os relatórios de doações e contas a pagar que levavam horas para montar agora saem prontos em segundos.",
      image: "/reviews_imgs/img_3.jpg",
    },
  ],
};
