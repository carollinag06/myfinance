import React from 'react';
import { Text, type TextProps } from 'react-native';
import { createNavigationContainerRef, useFocusEffect as useNativeFocusEffect, useRoute } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();
const routeNames: Record<string, string> = {
  '/perfil': 'Perfil', '/categorias': 'Categorias', '/orcamentos': 'Orcamentos',
  '/faturas': 'Faturas', '/cartoes': 'Cartoes', '/(tabs)/cartoes': 'Cartoes',
  '/nova-transacao': 'NovaTransacao', '/novo-cartao': 'NovoCartao',
  '/transacoes': 'Transacoes', '/analises': 'Analises',
  '/(auth)/login': 'Login', '/(auth)/cadastro': 'Cadastro',
};
export const router = {
  push(path: string) {
    const [pathname, query] = path.split('?');
    const name = routeNames[pathname];
    if (!name || !navigationRef.isReady()) return;
    const id = query ? new URLSearchParams(query).get('id') : null;
    if (['Transacoes', 'Analises'].includes(name)) navigationRef.navigate('MainTabs', { screen: name });
    else navigationRef.navigate(name, id ? { id } : undefined);
  },
  back() { if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack(); },
};
export const useFocusEffect = useNativeFocusEffect;
export function useLocalSearchParams<T extends object>(): T { return (useRoute().params || {}) as T; }
export function Link({ href, children, ...props }: TextProps & { href: string; children: React.ReactNode }) {
  return <Text {...props} onPress={() => router.push(href)}>{children}</Text>;
}
