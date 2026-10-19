export interface Usuario {
  id: number;
  nome: string;
  email: string;
  tipoUsuario: string;
  foto?: string | null;
}

export interface Categoria {
  id: number;
  nome: string;
  descricao?: string | null;
  tipo: 'receita' | 'despesa';
  isPadrao?: boolean;
  usuarioId: number;
}

export interface Cartao {
  id: number;
  nome: string;
  limite: number | string;
  vencimento?: number | null;
  numero?: string | null;
}

export interface Transacao {
  id: number;
  descricao: string;
  valor: number | string;
  tipo: 'receita' | 'despesa';
  data: string;
  usuarioId: number;
  categoriaId?: number | null;
  cartaoId?: number | null;
  categoria?: Categoria | null;
  cartao?: Cartao | null;
  grupoParcelamento?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
}

export interface Orcamento {
  id: number;
  valor: number | string;
  mes: number;
  ano: number;
  categoriaId?: number | null;
  categoria?: Categoria | null;
}

export interface Fatura {
  id: number;
  valor: number | string;
  vencimento: string;
  paga: boolean;
  cartaoId?: number | null;
  cartao?: Cartao | null;
}

const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = 'Bearer ' + accessToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response: Response;
  try {
    response = await fetch(API_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira o endereço configurado e se o backend está ligado.');
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'A solicitação não foi concluída.';
    throw new Error(message);
  }
  return payload as T;
}

async function requestMultipart<T>(path: string, method: string, body: FormData): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = 'Bearer ' + accessToken;

  let response: Response;
  try {
    response = await fetch(API_URL + path, { method, headers, body });
  } catch {
    throw new Error('Não foi possível conectar à API. Confira o endereço configurado e se o backend está ligado.');
  }

  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : 'A solicitação não foi concluída.';
    throw new Error(message);
  }
  return payload as T;
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, body: unknown) => request<T>(path, 'POST', body),
  put: <T,>(path: string, body: unknown) => request<T>(path, 'PUT', body),
  putMultipart: <T,>(path: string, body: FormData) => requestMultipart<T>(path, 'PUT', body),
  delete: <T,>(path: string) => request<T>(path, 'DELETE'),
  login: (email: string, senha: string) =>
    request<{ usuario: Usuario; token: string }>('/usuarios/login', 'POST', { email, senha }),
  register: (nome: string, email: string, senha: string) =>
    request<Usuario>('/usuarios', 'POST', { nome, email, senha }),
};

export function apiBaseUrl() {
  return API_URL;
}

export function fotoUsuarioUrl(foto?: string | null) {
  return foto ? `${API_URL}/uploads/${encodeURIComponent(foto)}` : null;
}

export function toAmount(value: number | string | null | undefined): number {
  const amount = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}
