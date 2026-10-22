/**
 * ------------------------------------------------------------
 * "PRICING" CONTENT — adaptado para formas de contribuição com a ONG
 * ------------------------------------------------------------
 * Reaproveita o componente de pricing do template para apresentar
 * formas de apoio financeiro ao SOS Criança, em vez de planos pagos
 * de um produto SaaS.
 */
import { HeartHandshake } from "lucide-react";

export const PRICING_CONTENT = {
    badge: {
        title: "Como Ajudar",
        icon: HeartHandshake,
    },
    heading: "Formas de Contribuir com o SOS Criança",
    subheading: "Toda contribuição ajuda a manter os projetos sociais e o Espaço Amigo em funcionamento.",
    plans: [
      {
        id: 'padrinho',
        name: 'Padrinho do Mês',
        description: 'Uma contribuição mensal simbólica para apoiar a rotina da instituição.',
        monthlyPrice: 20,
        annualPrice: 220,
        ctaText: 'Quero Ajudar',
        ctaHref: 'https://soscriancaprudente.org/',
        features: [
          'Apoio contínuo à instituição',
          'Recibo de doação',
          'Atualizações sobre os projetos',
        ],
      },
      {
        id: 'colaborador',
        name: 'Colaborador',
        description: 'Para quem quer fazer uma diferença maior na rotina das crianças atendidas.',
        monthlyPrice: 50,
        annualPrice: 550,
        ctaText: 'Quero Ajudar',
        ctaHref: 'https://soscriancaprudente.org/',
        highlighted: true,
        highlightLabel: 'Mais escolhido',
        features: [
          'Tudo do Padrinho do Mês',
          'Prioridade em eventos da ONG',
          'Relatório de transparência',
          'Reconhecimento como parceiro',
        ],
      },
      {
        id: 'empresa',
        name: 'Parceria Empresarial',
        description: 'Para empresas que desejam apoiar a causa social de Presidente Prudente.',
        monthlyPrice: 'Combinar',
        annualPrice: 'Combinar',
        ctaText: 'Falar com a ONG',
        ctaHref: 'https://soscriancaprudente.org/',
        features: [
          'Doação de produtos ou valores',
          'Parceria institucional divulgada',
          'Ações conjuntas de responsabilidade social',
          'Contato direto com a coordenação',
        ],
      },
    ]
}
