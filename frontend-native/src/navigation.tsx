// Adapta ações de navegação do aplicativo nativo às telas.
import React from 'react';
import { Text, type TextProps } from 'react-native';
import { createNavigationContainerRef, useFocusEffect as useNativeFocusEffect, useRoute } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();
const routeNames: Record<string, string> = {
  '/perfil': 'Perfil', '/categorias': 'Categorias', '/orcamentos': 'Orcamentos',
  '/faturas': 'Faturas', '/cartoes': 'Cartoes', '/(tabs)/cartoes': 'Cartoes',
  '/nova-transacao': 'NovaTransacao', '/novo-cartao': 'NovoCartao',
  '/transacoes': 'Transacoes', '/analises': 'Analises',
  '/(auth)/login': 'Login', '/(auth)/cadastro': 'Cadastro', '/(auth)/recuperar-senha': 'RecuperarSenha',
  '/(auth)/redefinir-senha': 'RedefinirSenha',
};
export const router = {
  push(path: string) {
    const [pathname, query] = path.split('?');
    const name = routeNames[pathname];
    if (!name || !navigationRef.isReady()) return;
    const params = query ? new URLSearchParams(query) : null;
    const id = params?.get('id') || null;
    const email = params?.get('email') || null;
    const token = params?.get('token') || null;
    if (['Transacoes', 'Analises'].includes(name)) navigationRef.navigate('MainTabs', { screen: name });
    else navigationRef.navigate(name, email || token ? { ...(email ? { email } : {}), ...(token ? { token } : {}) } : id ? { id } : undefined);
  },
  back() { if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack(); },
};
export const useFocusEffect = useNativeFocusEffect;
export function useLocalSearchParams<T extends object>(): T { return (useRoute().params || {}) as T; }
export function Link({ href, children, ...props }: TextProps & { href: string; children: React.ReactNode }) {
  return <Text {...props} onPress={() => router.push(href)}>{children}</Text>;
}
