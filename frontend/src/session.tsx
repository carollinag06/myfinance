import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { api, setAccessToken, Usuario } from './api';

interface Session {
  token: string;
  usuario: Usuario;
}

interface AuthContextValue {
  usuario: Usuario | null;
  pronto: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  entrarComGoogle: (idToken: string) => Promise<void>;
  /** Identificador da etapa de código pendente (login em duas etapas). */
  desafio: string | null;
  confirmarCodigo: (codigo: string) => Promise<void>;
  reenviarCodigo: () => Promise<void>;
  cancelarCodigo: () => void;
  cadastrar: (nome: string, email: string, senha: string) => Promise<void>;
  sair: () => Promise<void>;
  atualizarUsuario: (usuario: Usuario) => Promise<void>;
}

const SESSION_KEY = 'myfinance.session.v1';
const AuthContext = createContext<AuthContextValue | null>(null);

async function readSession(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(SESSION_KEY);
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeSession(value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    if (value === null) window.localStorage.removeItem(SESSION_KEY);
    else window.localStorage.setItem(SESSION_KEY, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(SESSION_KEY);
  else await SecureStore.setItemAsync(SESSION_KEY, value);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [pronto, setPronto] = useState(false);
  const [desafio, setDesafio] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void readSession()
      .then((raw) => {
        if (!raw) return;
        const session = JSON.parse(raw) as Session;
        setAccessToken(session.token);
        if (mounted) setUsuario(session.usuario);
      })
      .catch(() => {
        void writeSession(null);
      })
      .finally(() => {
        if (mounted) setPronto(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const entrar = useCallback(async (email: string, senha: string) => {
    // A senha correta não abre a sessão: o servidor envia um código por e-mail.
    const resposta = await api.login(email.trim().toLowerCase(), senha);
    setDesafio(resposta.desafioId);
  }, []);

  const confirmarCodigo = useCallback(async (codigo: string) => {
    if (!desafio) throw new Error('Entre novamente para receber um código.');
    let session;
    try {
      session = await api.verificarCodigoLogin(desafio, codigo);
    } catch (e) {
      // Código expirado ou bloqueado: volta para a senha.
      if (e instanceof Error && /Entre novamente/.test(e.message)) setDesafio(null);
      throw e;
    }
    await writeSession(JSON.stringify(session));
    setAccessToken(session.token);
    setDesafio(null);
    setUsuario(session.usuario);
  }, [desafio]);

  const reenviarCodigo = useCallback(async () => {
    if (!desafio) throw new Error('Entre novamente para receber um código.');
    await api.reenviarCodigoLogin(desafio);
  }, [desafio]);

  const cancelarCodigo = useCallback(() => setDesafio(null), []);

  const entrarComGoogle = useCallback(async (idToken: string) => {
    const session = await api.loginGoogle(idToken);
    await writeSession(JSON.stringify(session));
    setAccessToken(session.token);
    setUsuario(session.usuario);
  }, []);

  const cadastrar = useCallback(async (nome: string, email: string, senha: string) => {
    await api.register(nome.trim(), email.trim().toLowerCase(), senha);
    await entrar(email, senha);
  }, [entrar]);

  const sair = useCallback(async () => {
    setDesafio(null);
    setAccessToken(null);
    setUsuario(null);
    await writeSession(null);
  }, []);

  const atualizarUsuario = useCallback(async (updated: Usuario) => {
    const raw = await readSession();
    if (!raw) return;
    const session = JSON.parse(raw) as Session;
    const next = { ...session, usuario: updated };
    await writeSession(JSON.stringify(next));
    setUsuario(updated);
  }, []);

  const value = useMemo(() => ({
    usuario,
    pronto,
    entrar,
    entrarComGoogle,
    cadastrar,
    sair,
    atualizarUsuario,
    desafio,
    confirmarCodigo,
    reenviarCodigo,
    cancelarCodigo,
  }), [usuario, pronto, entrar, entrarComGoogle, cadastrar, sair, atualizarUsuario, desafio, confirmarCodigo, reenviarCodigo, cancelarCodigo]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
