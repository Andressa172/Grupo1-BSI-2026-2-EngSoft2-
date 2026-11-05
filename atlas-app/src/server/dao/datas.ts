// o pg devolve DATE como objeto Date local, não string - converte de volta
export function paraDataSimples(valor: string | Date): string {
  if (typeof valor === 'string') {
    return valor.slice(0, 10);
  }
  const ano = valor.getFullYear();
  const mes = String(valor.getMonth() + 1).padStart(2, '0');
  const dia = String(valor.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}
