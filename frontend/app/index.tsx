import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/session';
import { LoadingState } from '../src/ui';

export default function Index() {
  const { usuario, pronto } = useAuth();
  if (!pronto) return <LoadingState label="Carregando sua conta..." />;
  return <Redirect href={usuario ? '/(tabs)' : '/(auth)/login'} />;
}