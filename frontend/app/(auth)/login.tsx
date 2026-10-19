import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Field, InlineNotice, PrimaryButton, Screen } from '../../src/ui';
import { PasswordField } from '../../src/PasswordField';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';

export default function LoginScreen() {
  const { entrar } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const senhaRef = useRef<TextInput>(null);

  async function submit() {
    if (loading) return;
    setError('');
    const emailLimpo = email.trim().toLowerCase();
    if (!emailLimpo || !senha) {
      setError('Informe seu e-mail e sua senha.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setError('Confira o formato do e-mail.');
      return;
    }
    setLoading(true);
    try {
      await entrar(emailLimpo, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={styles.logo}>
                <Ionicons name="wallet-outline" size={36} color={colors.primaryLight} />
              </View>
              <Text style={styles.title}>MyFinance</Text>
              <Text style={styles.subtitle}>Seu dinheiro, mais organizado.</Text>
            </View>

            <View style={styles.form}>
              <Field
                value={email}
                onChangeText={(value) => { setEmail(value); setError(''); }}
                placeholder="E-mail"
                accessibilityLabel="E-mail"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={150}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => senhaRef.current?.focus()}
              />
              <PasswordField
                ref={senhaRef}
                value={senha}
                onChangeText={(value) => { setSenha(value); setError(''); }}
                placeholder="Senha"
                accessibilityLabel="Senha"
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
              />
              {error ? <InlineNotice>{error}</InlineNotice> : null}
              <PrimaryButton label="Entrar" onPress={submit} loading={loading} />
              <Text style={styles.footer}>
                Ainda não tem conta?{' '}
                <Link href="/(auth)/cadastro" style={styles.link}>
                  Criar conta
                </Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(138,43,226,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    gap: 14,
  },
  footer: {
    color: colors.muted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 22,
  },
  link: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
