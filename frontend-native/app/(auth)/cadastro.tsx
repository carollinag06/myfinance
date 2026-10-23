import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { Link } from '../../src/navigation';
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
import { PasswordField } from '../../src/PasswordField';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';
import { Field, InlineNotice, PrimaryButton, Screen } from '../../src/ui';

function utf8ByteLength(value: string) {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) || 0;
    length += codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
  }
  return length;
}

export default function RegisterScreen() {
  const { cadastrar } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const senhaRef = useRef<TextInput>(null);
  const confirmacaoRef = useRef<TextInput>(null);

  async function submit() {
    if (loading) return;
    setError('');

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    if (!nomeLimpo || !emailLimpo || !senha || !confirmacao) {
      setError('Informe seu nome, e-mail e senha nos campos abaixo.');
      return;
    }
    if (nomeLimpo.length > 100) {
      setError('O nome deve ter até 100 caracteres.');
      return;
    }
    if (emailLimpo.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setError('Confira o endereço de e-mail.');
      return;
    }
    if (senha.length < 8) {
      setError('Use uma senha com pelo menos 8 caracteres.');
      return;
    }
    if (utf8ByteLength(senha) > 72) {
      setError('A senha excede o limite de 72 bytes. Reduza o tamanho e tente novamente.');
      return;
    }
    if (senha !== confirmacao) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await cadastrar(nomeLimpo, emailLimpo, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a conta.');
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
                <Ionicons name="person-add-outline" size={30} color={colors.primaryLight} />
              </View>
              <Text style={styles.title}>Crie sua conta</Text>
              <Text style={styles.subtitle}>Organize suas finanças em poucos passos.</Text>
            </View>

            <View style={styles.form}>
              <Field
                value={nome}
                onChangeText={(value) => { setNome(value); setError(''); }}
                placeholder="Nome completo"
                accessibilityLabel="Nome completo"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={100}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => emailRef.current?.focus()}
              />
              <Field
                ref={emailRef}
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
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmacaoRef.current?.focus()}
              />
              <View style={styles.passwordHint}>
                <Ionicons
                  name={senha.length >= 8 ? 'checkmark-circle' : 'information-circle-outline'}
                  size={16}
                  color={senha.length >= 8 ? colors.success : colors.muted}
                />
                <Text style={styles.hintText}>Use pelo menos 8 caracteres. Limite: 72 bytes.</Text>
              </View>
              <PasswordField
                ref={confirmacaoRef}
                value={confirmacao}
                onChangeText={(value) => { setConfirmacao(value); setError(''); }}
                placeholder="Confirme a senha"
                accessibilityLabel="Confirme a senha"
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="go"
                onSubmitEditing={() => { void submit(); }}
              />
              {error ? <InlineNotice>{error}</InlineNotice> : null}
              <PrimaryButton label="Criar minha conta" onPress={submit} loading={loading} />
              <Text style={styles.footer}>
                Já tem conta?{' '}
                <Link href="/(auth)/login" style={styles.link}>Entrar</Link>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 16 },
  container: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 28 },
  header: { alignItems: 'center', gap: 9 },
  logo: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: 'rgba(138,43,226,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  title: { color: colors.text, fontSize: 27, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  form: { gap: 12 },
  passwordHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -5, marginLeft: 3 },
  hintText: { color: colors.muted, fontSize: 12 },
  footer: { color: colors.muted, textAlign: 'center', marginTop: 5, lineHeight: 22 },
  link: { color: colors.primaryLight, fontWeight: '700' },
});
