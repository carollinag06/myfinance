import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Link } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

WebBrowser.maybeCompleteAuthSession();

const googleClientId = Platform.select({
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export default function LoginScreen() {
  const { entrar, entrarComGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const senhaRef = useRef<TextInput>(null);
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleClientId || 'not-configured',
    selectAccount: true,
  }, { scheme: 'myfinance' });

  useEffect(() => {
    if (__DEV__ && googleRequest?.redirectUri) {
      console.info('Google OAuth redirect URI:', googleRequest.redirectUri);
    }
  }, [googleRequest?.redirectUri]);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token || googleResponse.authentication?.idToken;
    if (!idToken) {
      setError('O Google não retornou um token de identidade.');
      setLoading(false);
      return;
    }
    void entrarComGoogle(idToken)
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível entrar com Google.'))
      .finally(() => setLoading(false));
  }, [googleResponse, entrarComGoogle]);

  async function submitGoogle() {
    if (loading) return;
    setError('');
    if (!googleClientId) {
      setError('Configure o ID do Google OAuth no arquivo frontend/.env.');
      return;
    }
    if (!googleRequest) return;
    setLoading(true);
    try {
      const result = await promptGoogle();
      if (result.type !== 'success') setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o Google.');
      setLoading(false);
    }
  }

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
              <Pressable onPress={submitGoogle} disabled={loading} style={styles.googleButton} accessibilityRole="button" accessibilityLabel="Entrar com Google">
                <Ionicons name="logo-google" size={20} color={colors.text} />
                <Text style={styles.googleButtonText}>Entrar com Google</Text>
              </Pressable>
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
  googleButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.muted,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  link: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
});
