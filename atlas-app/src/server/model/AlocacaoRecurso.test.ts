import { describe, expect, it } from 'vitest';
import { AlocacaoRecurso } from './AlocacaoRecurso';
import { ErroValidacao } from '../erros';

describe('Model AlocacaoRecurso - RF_F9 Alocar Recursos para Eventos', () => {
  it('aceita um recurso de produto válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 5 });
    expect(() => recurso.validar()).not.toThrow();
  });

  it('aceita um recurso financeiro válido', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 150 });
    expect(() => recurso.validar()).not.toThrow();
  });

  it('rejeita recurso de produto sem produtoId', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', quantidade: 5 });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });

  it('rejeita recurso de produto com quantidade zero ou negativa', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 0 });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });

  it('rejeita recurso de produto que também informa valor financeiro', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'PRODUTO', produtoId: 1, quantidade: 5, valor: 10 });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });

  it('rejeita recurso financeiro sem valor', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO' });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });

  it('rejeita recurso financeiro com valor zero ou negativo', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: -10 });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });

  it('rejeita recurso financeiro que também informa produto', () => {
    const recurso = new AlocacaoRecurso({ tipo: 'FINANCEIRO', valor: 10, produtoId: 1 });
    expect(() => recurso.validar()).toThrow(ErroValidacao);
  });
});
