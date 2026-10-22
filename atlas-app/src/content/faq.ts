/**
 * ------------------------------------------------------------
 * FAQ CONTENT — ATLAS
 * ------------------------------------------------------------
 */

import { CircleQuestionMark } from "lucide-react";

export const FAQ_CONTENT = {
    badge : {
        icon: CircleQuestionMark,
        title: 'Dúvidas Frequentes'
    },
    heading: "Perguntas Frequentes",
    subheading:
    `
          Tudo o que você precisa saber sobre o ATLAS. Se tiver outras
          dúvidas, entre em contato com a equipe do SOS Criança.
    `,
    items: [
        {
          id: 1,
          title: "O que é o ATLAS?",
          content:
            "ATLAS (Aplicação Tecnológica de Logística da Assistência Social) é o sistema desenvolvido para apoiar o SOS Criança no controle de estoque, doações, caixa, cotações e cardápios."
        },
        {
          id: 2,
          title: "Quem pode usar o sistema?",
          content:
            "O ATLAS é de uso interno da equipe do SOS Criança: gerentes, secretários e funcionários cadastrados, cada um com permissões específicas conforme sua função."
        },
        {
          id: 3,
          title: "Como o estoque é atualizado?",
          content:
            "O estoque é atualizado automaticamente sempre que uma compra, uma doação de produto ou o uso em um cardápio/evento é registrado no sistema."
        },
        {
          id: 4,
          title: "O sistema registra doações em dinheiro?",
          content:
            "Sim. É possível registrar doações em dinheiro vinculadas ao doador, atualizando automaticamente o caixa da instituição."
        },
        {
          id: 5,
          title: "É possível gerar relatórios?",
          content:
            "Sim. O ATLAS emite relatórios de estoque, doações, compras mensais, atendidos, doadores e contas a pagar, entre outros, em até 5 segundos."
        },
        {
          id: 6,
          title: "O sistema funciona em celular?",
          content:
            "Sim. O ATLAS é uma aplicação web responsiva, acessível por computadores e dispositivos móveis com navegador atualizado."
        },
        {
          id: 7,
          title: "Os dados da instituição estão seguros?",
          content:
            "Sim. O sistema utiliza comunicação segura via HTTPS e segue boas práticas de proteção de dados, em conformidade com a LGPD."
        },
    ]
}
