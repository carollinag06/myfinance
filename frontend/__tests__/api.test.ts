import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { api, apiBaseUrl, fotoUsuarioUrl, setAccessToken, toAmount } from '../src/api';

const mockFetch: any = jest.fn();

describe('API client', () => {
  beforeEach(() => {
    global.fetch = mockFetch as typeof fetch;
    setAccessToken(null);
    mockFetch.mockReset();
  });

  it('sends the bearer token and serializes JSON requests', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    setAccessToken('access-token');

    await expect(api.post('/cartoes', { nome: 'Principal' })).resolves.toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledWith(`${apiBaseUrl()}/cartoes`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: 'Principal' }),
    });
  });

  it('returns undefined for a successful empty response', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: jest.fn() });
    await expect(api.delete('/cartoes/1')).resolves.toBeUndefined();
  });

  it('surfaces a server-provided error and has a fallback for non-JSON errors', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'E-mail já cadastrado.' }) });
    await expect(api.post('/usuarios', {})).rejects.toThrow('E-mail já cadastrado.');

    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => { throw new Error('invalid JSON'); } });
    await expect(api.get('/usuarios')).rejects.toThrow('A solicitação não foi concluída.');
  });

  it('normalizes connection failures into a user-facing message', async () => {
    mockFetch.mockRejectedValue(new TypeError('network down'));
    await expect(api.get('/transacoes')).rejects.toThrow('Não foi possível conectar à API.');
  });

  it('does not set JSON content type for multipart uploads', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ foto: 'profile.png' }) });
    const body = new FormData();
    body.append('nome', 'Ana');

    await api.putMultipart('/usuarios/1', body);
    expect(mockFetch.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' });
    expect(mockFetch.mock.calls[0][1].body).toBe(body);
  });

  it('builds encoded photo URLs and treats invalid amounts as zero', () => {
    expect(fotoUsuarioUrl('foto perfil.png')).toBe(`${apiBaseUrl()}/uploads/foto%20perfil.png`);
    expect(fotoUsuarioUrl(null)).toBeNull();
    expect(toAmount('12.50')).toBe(12.5);
    expect(toAmount('not-a-number')).toBe(0);
    expect(toAmount(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
