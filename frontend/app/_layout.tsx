import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/session';
import { colors } from '../src/theme';
import { LoadingState } from '../src/ui';

function Navigation() {
  const { usuario, pronto } = useAuth();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!pronto || !navigationState?.key) return;
    const currentSegment = segments[0];
    if (!currentSegment || currentSegment === 'index') return;

    const inAuth = currentSegment === '(auth)';
    if (!usuario && !inAuth) router.replace('/(auth)/login');
    if (usuario && inAuth) router.replace('/(tabs)');
  }, [usuario, pronto, segments, navigationState?.key]);

  if (!pronto) return <LoadingState label="Preparando sua sessão..." />;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="nova-transacao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="novo-cartao" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categorias" />
        <Stack.Screen name="orcamentos" />
        <Stack.Screen name="faturas" />
        <Stack.Screen name="analises" />
        <Stack.Screen name="perfil" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
