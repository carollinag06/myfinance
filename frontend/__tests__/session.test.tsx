import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { Platform } from 'react-native';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { api, setAccessToken } from '../src/api';
import { AuthProvider, useAuth } from '../src/session';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('../src/api', () => ({
  api: { login: jest.fn(), register: jest.fn() },
  setAccessToken: jest.fn(),
}));

const mockApi = api as any;
const mockSetAccessToken = setAccessToken as any;
const user = { id: 4, nome: 'Ana', email: 'ana@example.com', tipoUsuario: 'usuario' };
const session = { token: 'signed-token', usuario: user };
const sessionKey = 'myfinance.session.v1';
const storedValues = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => storedValues.get(key) ?? null,
  setItem: (key: string, value: string) => { storedValues.set(key, value); },
  removeItem: (key: string) => { storedValues.delete(key); },
  clear: () => storedValues.clear(),
};
const originalPlatformOS = Platform.OS;

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

async function mountAuth() {
  const rendered = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(rendered.result.current.pronto).toBe(true));
  return rendered;
}

beforeAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
});

afterAll(() => {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
});

beforeEach(() => {
  storedValues.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { localStorage: localStorageMock },
  });
  mockApi.login.mockReset();
  mockApi.register.mockReset();
  mockSetAccessToken.mockReset();
});

describe('authentication context', () => {
  it('restores a stored session and applies its access token before the app is ready', async () => {
    storedValues.set(sessionKey, JSON.stringify(session));
    const { result } = await mountAuth();

    expect(result.current.usuario).toEqual(user);
    expect(result.current.pronto).toBe(true);
    expect(mockSetAccessToken).toHaveBeenCalledWith('signed-token');
  });

  it('normalizes the login email and persists the token and user', async () => {
    mockApi.login.mockResolvedValue(session);
    const { result } = await mountAuth();
    await act(async () => result.current.entrar(' ANA@EXAMPLE.COM ', 'secret'));

    expect(mockApi.login).toHaveBeenCalledWith('ana@example.com', 'secret');
    expect(storedValues.get(sessionKey)).toBe(JSON.stringify(session));
    expect(result.current.usuario).toEqual(user);
    expect(mockSetAccessToken).toHaveBeenLastCalledWith('signed-token');
  });

  it('registers and then signs in using the normalized credentials', async () => {
    mockApi.register.mockResolvedValue(user);
    mockApi.login.mockResolvedValue(session);
    const { result } = await mountAuth();
    await act(async () => result.current.cadastrar(' Ana ', ' ANA@EXAMPLE.COM ', 'secret'));

    expect(mockApi.register).toHaveBeenCalledWith('Ana', 'ana@example.com', 'secret');
    expect(mockApi.login).toHaveBeenCalledWith('ana@example.com', 'secret');
    expect(result.current.usuario).toEqual(user);
  });

  it('clears the stored session and token on sign out', async () => {
    storedValues.set(sessionKey, JSON.stringify(session));
    const { result } = await mountAuth();
    await act(async () => result.current.sair());

    expect(result.current.usuario).toBeNull();
    expect(storedValues.has(sessionKey)).toBe(false);
    expect(mockSetAccessToken).toHaveBeenLastCalledWith(null);
  });

  it('updates the user in the persisted session without dropping its token', async () => {
    storedValues.set(sessionKey, JSON.stringify(session));
    const { result } = await mountAuth();
    const updated = { ...user, nome: 'Ana Maria' };
    await act(async () => result.current.atualizarUsuario(updated));

    expect(result.current.usuario).toEqual(updated);
    expect(storedValues.get(sessionKey)).toBe(JSON.stringify({ ...session, usuario: updated }));
  });

  it('discards malformed stored session data and still finishes initialization', async () => {
    storedValues.set(sessionKey, '{not-json');
    const { result } = await mountAuth();

    expect(result.current.usuario).toBeNull();
    expect(result.current.pronto).toBe(true);
    expect(storedValues.has(sessionKey)).toBe(false);
  });
});
