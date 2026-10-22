/**
 * ------------------------------------------------------------
 * PROCESS SECTION CONTENT CONFIGURATION — ATLAS
 * ------------------------------------------------------------
 */

import { Workflow } from "lucide-react";

export const PROCESS_CONTENT = {
  badge: {
    title: "Como funciona",
    icon: Workflow,
  },

  heading: "Do cadastro ao relatório",

  subheading:
    `
      Um fluxo simples para a equipe do SOS Criança registrar o dia a dia
      da instituição e acompanhar tudo em poucos cliques.
    `,
  cta: {
    label: "Acessar o Sistema",
    href: "/auth"
  },

  steps: [
    {
      id: 'step-1',
      number: '01',
      title: 'Cadastre produtos, doadores e atendidos',
      description:
        'Centralize as informações da instituição: estoque, doadores, funcionários e crianças atendidas, tudo em um só lugar.',
      imageSrc: '/dashboard.png',
    },
    {
      id: 'step-2',
      number: '02',
      title: 'Registre doações, compras e caixa',
      description:
        'A cada doação ou compra registrada, o estoque e o caixa são atualizados automaticamente, sem retrabalho manual.',
      imageSrc: '/dashboard.png',
    },
    {
      id: 'step-3',
      number: '03',
      title: 'Acompanhe relatórios e tome decisões',
      description:
        'Gere relatórios de estoque, doações e finanças em segundos para apoiar a gestão e a prestação de contas da ONG.',
      imageSrc: '/dashboard.png',
    },
  ],
};
