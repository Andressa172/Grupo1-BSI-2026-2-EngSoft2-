'use client';

/**
 * View de RF_B2 (Gerenciar Funcionários).
 * Só mostra dados e captura o que o usuário digita. Validação, regras e gravação
 * ficam no Control (UsuarioController), acessado pela API /api/usuarios.
 */

import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
<<<<<<< Updated upstream
import { Card, Field, Input, Select, Table, THead, EmptyRow, LoadingRows } from '@/components/app/ui';
=======
import { Card, Field, Input, Select, Modal, Table, THead, EmptyRow } from '@/components/app/ui';
>>>>>>> Stashed changes
import type { PerfilUsuario } from '@/lib/types';

interface Funcionario {
  id: number;
  nome: string;
  login: string;
  perfil: PerfilUsuario;
  cpf: string | null;
  ativo: boolean;
}

type Erros = Record<string, string>;

const CARGOS: { valor: PerfilUsuario; rotulo: string }[] = [
  { valor: 'GERENTE', rotulo: 'Gerente (ADM)' },
  { valor: 'SECRETARIO', rotulo: 'Secretário' },
  { valor: 'FUNCIONARIO', rotulo: 'Funcionário' },
];

const LABEL_PERFIL: Record<PerfilUsuario, string> = {
  GERENTE: 'Gerente',
  SECRETARIO: 'Secretário',
  FUNCIONARIO: 'Funcionário',
};

const SITUACOES_STATUS = [
  { valor: 'ATIVO', rotulo: 'Ativos' },
  { valor: 'INATIVO', rotulo: 'Inativos' },
];

interface FormFuncionario {
  nome: string;
  login: string;
  senha: string;
  perfil: PerfilUsuario | '';
  cpf: string;
  ativo: boolean;
}

const FORM_VAZIO: FormFuncionario = {
  nome: '',
  login: '',
  senha: '',
  perfil: 'FUNCIONARIO',
  cpf: '',
  ativo: true,
};

<<<<<<< Updated upstream
// login e CPF somem em telas estreitas
const COLUNAS = [
  'Nome',
  { label: 'Login', className: 'hidden sm:table-cell' },
  { label: 'CPF', className: 'hidden md:table-cell' },
  'Cargo',
];

const LABEL_PERFIL: Record<PerfilUsuario, string> = {
  GERENTE: 'Gerente',
  SECRETARIO: 'Secretário',
  FUNCIONARIO: 'Funcionário',
=======
const FILTRO_VAZIO = {
  nome: '',
  perfil: '',
  status: '',
>>>>>>> Stashed changes
};

function aplicarMascaraCPF(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

function MensagemErro({ id, texto }: { id?: string; texto?: string }) {
  if (!texto) return null;
  return (
    <span id={id} className="text-xs text-primary mt-1 block">
      {texto}
    </span>
  );
}

// props para marcar um campo como inválido (borda vermelha + aria-invalid)
function invalido(campo: string, erros: Erros) {
  const erro = erros[campo];
  return {
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': erro ? `erro-${campo}` : undefined,
    className: erro ? 'border-primary! focus:ring-primary/30' : '',
  };
}

function montarUrlConsulta(filtro: typeof FILTRO_VAZIO) {
  const parametros = new URLSearchParams();
  if (filtro.nome.trim()) parametros.set('nome', filtro.nome.trim());
  if (filtro.perfil) parametros.set('perfil', filtro.perfil);
  if (filtro.status) parametros.set('status', filtro.status);
  const texto = parametros.toString();
  return texto ? `/api/usuarios?${texto}` : '/api/usuarios';
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
<<<<<<< Updated upstream
  const [form, setForm] = useState<FormFuncionario>(FORM_VAZIO);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [estadoLista, setEstadoLista] = useState<'carregando' | 'pronto' | 'erro'>('carregando');

  // falha no servidor vira estado de erro, não "nenhum funcionário"
  async function carregarFuncionarios() {
    try {
      const resposta = await fetch('/api/usuarios');
      if (!resposta.ok) throw new Error();
      setFuncionarios(await resposta.json());
      setEstadoLista('pronto');
    } catch {
      setEstadoLista('erro');
=======

  // consulta: filtro digitado x filtro aplicado
  const [filtro, setFiltro] = useState(FILTRO_VAZIO);
  const [filtroAplicado, setFiltroAplicado] = useState(FILTRO_VAZIO);
  const [erroConsulta, setErroConsulta] = useState('');

  // formulário (inclusão / alteração)
  const [modalAberto, setModalAberto] = useState(false);
  const [funcionarioEditando, setFuncionarioEditando] = useState<Funcionario | null>(null);
  const [form, setForm] = useState<FormFuncionario>(FORM_VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [salvando, setSalvando] = useState(false);

  // exclusão
  const [excluindo, setExcluindo] = useState<Funcionario | null>(null);
  const [erroExclusao, setErroExclusao] = useState('');
  const [erroAcaoLinha, setErroAcaoLinha] = useState('');

  const temporizadorBusca = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimaConsulta = useRef(0);

  async function carregarFuncionarios(filtroUsado = filtroAplicado) {
    const numero = ++ultimaConsulta.current;
    const resposta = await fetch(montarUrlConsulta(filtroUsado));
    const corpo = await resposta.json();
    if (numero !== ultimaConsulta.current) return;
    if (resposta.ok) {
      setFuncionarios(corpo);
      setErroConsulta('');
    } else {
      setErroConsulta(corpo.erro ?? 'Erro ao consultar funcionários.');
>>>>>>> Stashed changes
    }
  }

  useEffect(() => {
    fetch('/api/usuarios')
      .then((resposta) => {
        if (!resposta.ok) throw new Error();
        return resposta.json();
      })
      .then((dados) => {
        setFuncionarios(dados);
        setEstadoLista('pronto');
      })
      .catch(() => setEstadoLista('erro'));
  }, []);

  function aplicarFiltro(novoFiltro: typeof FILTRO_VAZIO) {
    if (temporizadorBusca.current) clearTimeout(temporizadorBusca.current);
    setFiltroAplicado(novoFiltro);
    carregarFuncionarios(novoFiltro);
  }

  function alterarFiltroDeLista(campo: 'perfil' | 'status', valor: string) {
    const novoFiltro = { ...filtro, [campo]: valor };
    setFiltro(novoFiltro);
    aplicarFiltro(novoFiltro);
  }

  function alterarFiltroNome(valor: string) {
    const novoFiltro = { ...filtro, nome: valor };
    setFiltro(novoFiltro);
    if (temporizadorBusca.current) clearTimeout(temporizadorBusca.current);
    temporizadorBusca.current = setTimeout(() => aplicarFiltro(novoFiltro), 300);
  }

  function consultar(e: React.FormEvent) {
    e.preventDefault();
    aplicarFiltro(filtro);
  }

  function limparFiltro() {
    setFiltro(FILTRO_VAZIO);
    aplicarFiltro(FILTRO_VAZIO);
  }

  function abrirNovo() {
    setFuncionarioEditando(null);
    setForm(FORM_VAZIO);
    setErros({});
    setErroGeral('');
    setModalAberto(true);
  }

  // retorno da consulta para o cadastro: busca os dados atualizados do funcionário e abre o modal
  async function abrirEdicao(funcionario: Funcionario) {
    setErroAcaoLinha('');
    let dados = funcionario;
    try {
      const resposta = await fetch(`/api/usuarios/${funcionario.id}`);
      if (resposta.ok) {
        dados = await resposta.json();
      }
    } catch {
      // se falhar a leitura pontual, usa os dados já carregados na linha
    }

    setFuncionarioEditando(dados);
    setForm({
      nome: dados.nome,
      login: dados.login,
      senha: '',
      perfil: dados.perfil,
      cpf: aplicarMascaraCPF(dados.cpf ?? ''),
      ativo: dados.ativo,
    });
    setErros({});
    setErroGeral('');
    setModalAberto(true);
  }

  function alterarCampo<K extends keyof FormFuncionario>(campo: K, valor: FormFuncionario[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (erros[campo as string]) {
      const resto = { ...erros };
      delete resto[campo as string];
      setErros(resto);
    }
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroGeral('');

    try {
      const url = funcionarioEditando ? `/api/usuarios/${funcionarioEditando.id}` : '/api/usuarios';
      const metodo = funcionarioEditando ? 'PUT' : 'POST';

      const resposta = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (resposta.ok) {
        setModalAberto(false);
        await carregarFuncionarios();
        return;
      }

      const corpo = await resposta.json();
      setErros(corpo.erros ?? {});
      setErroGeral(corpo.erros ? '' : (corpo.erro ?? 'Não foi possível salvar o funcionário.'));
    } catch {
      setErroGeral('Erro ao conectar com o servidor.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatusAtivo(funcionario: Funcionario) {
    setErroAcaoLinha('');
    try {
      const resposta = await fetch(`/api/usuarios/${funcionario.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: funcionario.nome,
          login: funcionario.login,
          perfil: funcionario.perfil,
          cpf: funcionario.cpf ?? '',
          ativo: !funcionario.ativo,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json();
        setErroAcaoLinha(corpo.erro ?? 'Não foi possível alterar o status do funcionário.');
        return;
      }

      await carregarFuncionarios();
    } catch {
      setErroAcaoLinha('Erro ao conectar com o servidor.');
    }
  }

  async function confirmarExclusao() {
    if (!excluindo) return;
    const resposta = await fetch(`/api/usuarios/${excluindo.id}`, { method: 'DELETE' });
    if (!resposta.ok) {
      const corpo = await resposta.json();
      setErroExclusao(corpo.erro ?? 'Não foi possível excluir o funcionário.');
      return;
    }
    setExcluindo(null);
    await carregarFuncionarios();
  }

  return (
    <div className="flex flex-col gap-6">
<<<<<<< Updated upstream
      <Card className="p-6">
        <h2 className="text-base font-medium tracking-tight mb-5">Novo funcionário</h2>
        <form onSubmit={cadastrar} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nome">
=======
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <p className="text-sm text-foreground/50 max-w-xl">
          Gerenciamento de funcionários (RF_B2): cadastre, consulte, edite, inative ou exclua usuários com acesso ao sistema ATLAS.
        </p>
        <Button variant="primary" size="md" onClick={abrirNovo} iconLeft={<Plus size={16} />}>
          Novo Funcionário
        </Button>
      </div>

      {/* Consulta com 3 filtros: nome/login, cargo e status */}
      <form onSubmit={consultar} className="flex flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1">
          <Field label="Nome ou Login">
            <Input
              placeholder="Buscar por nome ou login"
              value={filtro.nome}
              maxLength={120}
              onChange={(e) => alterarFiltroNome(e.target.value)}
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Cargo">
            <Select value={filtro.perfil} onChange={(e) => alterarFiltroDeLista('perfil', e.target.value)}>
              <option value="">Todos</option>
              {CARGOS.map((c) => (
                <option key={c.valor} value={c.valor}>
                  {c.rotulo}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="w-40">
          <Field label="Status">
            <Select value={filtro.status} onChange={(e) => alterarFiltroDeLista('status', e.target.value)}>
              <option value="">Todos</option>
              {SITUACOES_STATUS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.rotulo}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="primary" size="md">
            Consultar
          </Button>
          <Button type="button" variant="outline" size="md" onClick={limparFiltro}>
            Limpar
          </Button>
        </div>
      </form>
      <MensagemErro texto={erroConsulta || erroAcaoLinha} />

      <Card className="p-0">
        <Table>
          <THead cols={['Nome', 'Login', 'CPF', 'Cargo', 'Status', 'Ações']} />
          <tbody>
            {funcionarios.length === 0 && <EmptyRow colSpan={6} label="Nenhum funcionário encontrado." />}
            {funcionarios.map((f) => (
              <tr key={f.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{f.nome}</td>
                <td className="px-4 py-3 text-foreground/60">{f.login}</td>
                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">{f.cpf || '—'}</td>
                <td className="px-4 py-3 text-foreground/60">{LABEL_PERFIL[f.perfil] ?? f.perfil}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      f.ativo
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-foreground/5 text-foreground/50 border-border-line/20'
                    }`}
                  >
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => abrirEdicao(f)}
                      className="p-2 text-foreground/50 hover:text-foreground cursor-pointer"
                      title={`Alterar ${f.nome}`}
                      aria-label={`Alterar ${f.nome}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alternarStatusAtivo(f)}
                      className="p-2 text-foreground/50 hover:text-foreground cursor-pointer"
                      title={f.ativo ? `Inativar ${f.nome}` : `Ativar ${f.nome}`}
                      aria-label={f.ativo ? `Inativar ${f.nome}` : `Ativar ${f.nome}`}
                    >
                      {f.ativo ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setErroExclusao('');
                        setExcluindo(f);
                      }}
                      className="p-2 text-foreground/50 hover:text-primary cursor-pointer"
                      title={`Excluir ${f.nome}`}
                      aria-label={`Excluir ${f.nome}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>

      {/* Modal de inclusão / alteração */}
      <Modal
        open={modalAberto}
        title={funcionarioEditando ? 'Alterar Funcionário' : 'Cadastrar Funcionário'}
        onClose={() => setModalAberto(false)}
      >
        {/* noValidate: quem valida é o Model; a tela só destaca o que voltou com erro */}
        <form onSubmit={salvar} noValidate className="flex flex-col gap-4">
          <p className="text-xs text-foreground/50">
            Campos com <span className="text-primary font-semibold">*</span> são obrigatórios.
          </p>

          <div>
            <Field label="Nome *">
>>>>>>> Stashed changes
              <Input
                placeholder="Nome completo do funcionário"
                value={form.nome}
                maxLength={120}
                required
                onChange={(e) => alterarCampo('nome', e.target.value)}
                {...invalido('nome', erros)}
              />
            </Field>
            <MensagemErro id="erro-nome" texto={erros.nome} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Field label="Documento (CPF) *">
                <Input
                  placeholder="000.000.000-00"
                  maxLength={14}
                  inputMode="numeric"
                  value={form.cpf}
                  required
                  onChange={(e) => alterarCampo('cpf', aplicarMascaraCPF(e.target.value))}
                  {...invalido('cpf', erros)}
                />
              </Field>
              <MensagemErro id="erro-cpf" texto={erros.cpf} />
            </div>

            <div>
              <Field label="Login *">
                <Input
                  placeholder="Identificador de acesso"
                  value={form.login}
                  maxLength={60}
                  required
                  onChange={(e) => alterarCampo('login', e.target.value)}
                  {...invalido('login', erros)}
                />
              </Field>
              <MensagemErro id="erro-login" texto={erros.login} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Field label={funcionarioEditando ? 'Nova senha (opcional)' : 'Senha *'}>
                <Input
                  type="password"
                  placeholder={funcionarioEditando ? 'Em branco mantém a atual' : 'Digite a senha de acesso'}
                  value={form.senha}
                  required={!funcionarioEditando}
                  onChange={(e) => alterarCampo('senha', e.target.value)}
                  {...invalido('senha', erros)}
                />
              </Field>
              <MensagemErro id="erro-senha" texto={erros.senha} />
            </div>

            <div>
              <Field label="Cargo *">
                <Select
                  value={form.perfil}
                  required
                  onChange={(e) => alterarCampo('perfil', e.target.value as PerfilUsuario)}
                  {...invalido('perfil', erros)}
                >
                  <option value="" disabled>
                    Selecione...
                  </option>
                  {CARGOS.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.rotulo}
                    </option>
                  ))}
                </Select>
              </Field>
              <MensagemErro id="erro-perfil" texto={erros.perfil} />
            </div>
          </div>

          <div>
            <Field label="Status de acesso *">
              <Select
                value={form.ativo ? 'ATIVO' : 'INATIVO'}
                onChange={(e) => alterarCampo('ativo', e.target.value === 'ATIVO')}
              >
                <option value="ATIVO">Ativo (habilitado para uso)</option>
                <option value="INATIVO">Inativo (desabilitado para uso)</option>
              </Select>
            </Field>
          </div>

<<<<<<< Updated upstream
          {erro && <p className="text-sm text-primary">{erro}</p>}
          {sucesso && <p className="text-sm text-success">{sucesso}</p>}

          <div className="flex justify-end mt-4">
            <Button type="submit" variant="primary" size="md" isLoading={carregando}>
              Cadastrar
=======
          <MensagemErro texto={erroGeral} />

          <div className="flex gap-2 justify-end mt-2">
            <Button type="button" variant="outline" size="md" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={salvando}>
              {funcionarioEditando ? 'Salvar alterações' : 'Cadastrar'}
>>>>>>> Stashed changes
            </Button>
          </div>
        </form>
      </Modal>

<<<<<<< Updated upstream
      <Table>
        <THead cols={COLUNAS} />
        <tbody>
          {estadoLista === 'carregando' && <LoadingRows colSpan={COLUNAS.length} />}
          {estadoLista === 'erro' && (
            <EmptyRow colSpan={COLUNAS.length}>
              Não foi possível carregar os funcionários.{' '}
              <button type="button" onClick={carregarFuncionarios} className="font-medium text-foreground underline underline-offset-2 cursor-pointer hover:text-primary">
                Tentar de novo
              </button>
            </EmptyRow>
          )}
          {estadoLista === 'pronto' && funcionarios.length === 0 && (
            <EmptyRow colSpan={COLUNAS.length} label="Nenhum funcionário cadastrado ainda." />
          )}
          {estadoLista === 'pronto' &&
            funcionarios.map((f) => (
              <tr key={f.id} className="border-b border-border-line/10 last:border-0">
                <td className="px-4 py-3 font-medium">{f.nome}</td>
                <td className="hidden sm:table-cell px-4 py-3 text-foreground/70">{f.login}</td>
                <td className="hidden md:table-cell px-4 py-3 text-foreground/70 tabular-nums whitespace-nowrap">{f.cpf || '—'}</td>
                <td className="px-4 py-3 text-foreground/70">{LABEL_PERFIL[f.perfil] ?? f.perfil}</td>
              </tr>
            ))}
        </tbody>
      </Table>
=======
      {/* Confirmação de exclusão */}
      <Modal open={excluindo !== null} title="Excluir funcionário" onClose={() => setExcluindo(null)}>
        <p className="text-sm text-foreground/70 mb-5">
          Tem certeza que deseja excluir <strong>{excluindo?.nome}</strong>? Essa ação não pode ser desfeita.
        </p>
        <MensagemErro texto={erroExclusao} />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" size="md" onClick={() => setExcluindo(null)}>
            Cancelar
          </Button>
          <Button variant="danger" size="md" onClick={confirmarExclusao}>
            Excluir
          </Button>
        </div>
      </Modal>
>>>>>>> Stashed changes
    </div>
  );
}
