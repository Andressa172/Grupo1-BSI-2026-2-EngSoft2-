// Testes do Model Atendido (RF_B1): validações, sem banco.
import { describe, expect, it } from 'vitest';
import { Atendido } from './Atendido';
import { FiltroAtendido } from './FiltroAtendido';

const valido = { nome: 'Maria da Silva', dataNascimento: '10/05/2015', sexo: 'Feminino', responsavelLegal: 'Ana Silva' };

describe('Atendido.validar', () => {
  it('aceita dados corretos', () => {
    expect(new Atendido(valido).validar()).toEqual({});
  });

  it('exige todos os campos (4 erros com tudo vazio)', () => {
    const erros = new Atendido({ nome: '', dataNascimento: '', sexo: '', responsavelLegal: '' }).validar();
    expect(Object.keys(erros).sort()).toEqual(['dataNascimento', 'nome', 'responsavelLegal', 'sexo']);
  });

  it('aceita acentos, apóstrofo e hífen no nome', () => {
    expect(new Atendido({ ...valido, nome: "João D'Ávila-Souza" }).validar()).toEqual({});
  });

  it.each(['Ma', 'João123', 'Maria <script>', "Robert'); DROP TABLE atendido;--", 'Maria\u0000Silva', '123 456'])(
    'rejeita nome inválido: %s',
    (nome) => {
      expect(new Atendido({ ...valido, nome }).validar()).toHaveProperty('nome');
    }
  );

  it('rejeita nome com mais de 120 caracteres', () => {
    expect(new Atendido({ ...valido, nome: 'A'.repeat(121) }).validar()).toHaveProperty('nome');
  });

  it.each(['31/02/2015', '10-05-2015', '2015/05/10', '99/99/9999', 'abc', '10/05/15', '29/02/2023'])(
    'rejeita data de nascimento inválida: %s',
    (dataNascimento) => {
      expect(new Atendido({ ...valido, dataNascimento }).validar()).toHaveProperty('dataNascimento');
    }
  );

  it('aceita 29/02 em ano bissexto', () => {
    expect(new Atendido({ ...valido, dataNascimento: '29/02/2016' }).validar()).toEqual({});
  });

  it('rejeita data de nascimento no futuro e idade acima de 120 anos', () => {
    expect(new Atendido({ ...valido, dataNascimento: '01/01/2999' }).validar()).toHaveProperty('dataNascimento');
    expect(new Atendido({ ...valido, dataNascimento: '01/01/1800' }).validar()).toHaveProperty('dataNascimento');
  });

  it('aceita também a data no formato do banco (aaaa-mm-dd)', () => {
    expect(new Atendido({ ...valido, dataNascimento: '2015-05-10' }).validar()).toEqual({});
  });

  it('rejeita sexo fora da lista e responsável inválido', () => {
    expect(new Atendido({ ...valido, sexo: 'Outro' }).validar()).toHaveProperty('sexo');
    expect(new Atendido({ ...valido, responsavelLegal: 'Al' }).validar()).toHaveProperty('responsavelLegal');
    expect(new Atendido({ ...valido, responsavelLegal: 'Ana; DROP TABLE x' }).validar()).toHaveProperty('responsavelLegal');
  });

  it('não quebra com tipos errados vindos de um JSON malformado', () => {
    const lixo = { nome: 123, dataNascimento: {}, sexo: null, responsavelLegal: [] } as unknown as Parameters<
      (typeof Atendido)['prototype']['setNome']
    >;
    void lixo;
    const erros = new Atendido({
      nome: 123 as unknown as string,
      dataNascimento: {} as unknown as string,
      sexo: null as unknown as string,
      responsavelLegal: [] as unknown as string,
    }).validar();
    expect(Object.keys(erros)).toHaveLength(4);
  });
});

describe('Atendido.idade', () => {
  it('conta anos completos', () => {
    const a = new Atendido({ ...valido, dataNascimento: '10/05/2015' });
    expect(a.idade(new Date(Date.UTC(2026, 4, 9, 12)))).toBe(10); // 1 dia antes do aniversário
    expect(a.idade(new Date(Date.UTC(2026, 4, 10, 12)))).toBe(11); // no aniversário
  });
});

describe('FiltroAtendido.validar', () => {
  it('filtro vazio é válido', () => {
    expect(new FiltroAtendido().validar()).toEqual({});
  });

  it('rejeita idade que não é número e faixa invertida', () => {
    expect(new FiltroAtendido({ idadeMinima: 'abc' }).validar()).toHaveProperty('idadeMinima');
    expect(new FiltroAtendido({ idadeMinima: '1 OR 1=1' }).validar()).toHaveProperty('idadeMinima');
    expect(new FiltroAtendido({ idadeMinima: '-1' }).validar()).toHaveProperty('idadeMinima');
    expect(new FiltroAtendido({ idadeMinima: '20', idadeMaxima: '10' }).validar()).toHaveProperty('idadeMaxima');
  });

  it('aceita faixa de idade correta', () => {
    expect(new FiltroAtendido({ idadeMinima: '5', idadeMaxima: '17' }).validar()).toEqual({});
  });
});
