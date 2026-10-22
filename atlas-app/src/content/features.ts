/**
 * ------------------------------------------------------------
 * FEATURES CONTENT CONFIGURATION — ATLAS
 * ------------------------------------------------------------
 */

import {
  PackageSearch,
  HandCoins,
  FileBarChart,
  CalendarCheck,
} from 'lucide-react';

export const FEATURESCONTENT = {
  badge: {
    title: "Solução",
    icon: CalendarCheck,
  },

  heading: "Menos planilhas. Mais impacto.",

  subheading:
    `
      O ATLAS organiza estoque, doações, caixa, cotações e cardápios do
      SOS Criança em um sistema só, reduzindo erros manuais e dando mais
      visibilidade para quem cuida da instituição no dia a dia.
    `,

  items: [
    {
      icon: PackageSearch,
      title: 'Controle de Estoque em Tempo Real',
      description:
        'Atualização automática de quantidades a partir de compras e doações, com alertas de produtos próximos do vencimento.',
    },
    {
      icon: HandCoins,
      title: 'Doações e Caixa Centralizados',
      description:
        'Registre doações em dinheiro ou produto, vincule ao doador e mantenha a abertura, atualização e fechamento de caixa sempre em dia.',
    },
    {
      icon: FileBarChart,
      title: 'Relatórios Gerenciais Automáticos',
      description:
        'Relatórios de estoque, doações, compras, atendidos e contas a pagar gerados em segundos, mantendo o padrão exigido pela ONG.',
    },
  ],
};
