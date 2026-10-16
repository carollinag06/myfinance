import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Field, InlineNotice, PrimaryButton, Screen } from '../../src/ui';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!email.trim() || !senha) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }
    setLoading(true);
    try {
      await entrar(email, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'center', gap: 22 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <View style={{ width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(138,43,226,0.22)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="wallet-outline" size={36} color={colors.primaryLight} />
          </View>
          <Text style={{ color: colors.text, fontSize: 30, fontWeight: '800' }}>Carolbeck</Text>
          <Text style={{ color: colors.muted, fontSize: 15 }}>Seu dinheiro, mais organizado.</Text>
        </View>

        <View style={{ gap: 13 }}>
          <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field value={senha} onChangeText={setSenha} placeholder="Senha" secureTextEntry returnKeyType="go" onSubmitEditing={submit} />
          {error ? <InlineNotice>{error}</InlineNotice> : null}
          <PrimaryButton label="Entrar" onPress={submit} loading={loading} />
          <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 6 }}>
            Ainda não tem conta? <Link href="/(auth)/cadastro" style={{ color: colors.primaryLight, fontWeight: '700' }}>Criar conta</Link>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}