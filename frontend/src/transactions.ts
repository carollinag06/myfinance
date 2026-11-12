import type { Transacao } from './api';
import { localDateISO } from './date';

// Compatibilidade com respostas antigas durante a atualizacao da API.
export function transactionStatus(item: Pick<Transacao, 'status' | 'data'>): 'previsto' | 'realizado' {
  return item.status || (item.data > localDateISO() ? 'previsto' : 'realizado');
}
export function isRealized(item: Pick<Transacao, 'status' | 'data'>) {
  return transactionStatus(item) === 'realizado' && item.data <= localDateISO();
}
export function statusLabel(item: Pick<Transacao, 'status' | 'data' | 'tipo'>) {
  return transactionStatus(item) === 'previsto' ? 'Previsto' : item.tipo === 'receita' ? 'Recebida' : 'Paga';
}

export function paymentLabel(item: Pick<Transacao, 'tipo' | 'formaPagamento' | 'cartaoId' | 'cartao'>): string {
  if (item.tipo !== 'despesa') return '';
  const method = item.formaPagamento || (item.cartaoId != null ? 'cartao' : 'a_vista');
  return method === 'cartao' ? 'Cartão' + (item.cartao?.nome ? ' · ' + item.cartao.nome : '') : 'À vista';
}

// Use o cadastro para desempatar datas iguais, com ID como alternativa.
export function newestCreatedFirst(a: Transacao, b: Transacao): number {
  const aTime = Date.parse(a.createdAt || '');
  const bTime = Date.parse(b.createdAt || '');
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) return bTime - aTime;
  return b.id - a.id;
}
export function newestDateFirst(a: Transacao, b: Transacao): number {
  return b.data.localeCompare(a.data) || newestCreatedFirst(a, b);
}
