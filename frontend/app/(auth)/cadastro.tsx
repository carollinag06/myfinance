import { Link } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { Field, InlineNotice, PrimaryButton, Screen } from '../../src/ui';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';

export default function RegisterScreen() {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    if (!nome.trim() || !email.trim() || !senha || !confirmacao) {
      setError('Preencha todos os campos.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Confira o formato do e-mail.');
      return;
    }
    if (senha.length < 8) {
      setError('Use uma senha com pelo menos 8 caracteres.');
      return;
    }
    if (senha !== confirmacao) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await cadastrar(nome, email, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Criar conta" subtitle="Comece a acompanhar suas finanças.">
      <KeyboardAvoidingView style={{ gap: 13 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Field value={nome} onChangeText={setNome} placeholder="Nome" autoCapitalize="words" />
        <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
        <Field value={senha} onChangeText={setSenha} placeholder="Senha (mínimo 8 caracteres)" secureTextEntry />
        <Field value={confirmacao} onChangeText={setConfirmacao} placeholder="Confirme a senha" secureTextEntry returnKeyType="go" onSubmitEditing={submit} />
        {error ? <InlineNotice>{error}</InlineNotice> : null}
        <PrimaryButton label="Criar minha conta" onPress={submit} loading={loading} />
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 7 }}>
          Já tem conta? <Link href="/(auth)/login" style={{ color: colors.primaryLight, fontWeight: '700' }}>Entrar</Link>
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}