// Solicita o envio do link de recuperação de senha.
import { Ionicons } from '@expo/vector-icons';
import { Link, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../../src/api';
import { colors } from '../../src/theme';
import { Field, InlineNotice, PrimaryButton, Screen } from '../../src/ui';

const emailValido = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function RecuperarSenhaScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [linkEnviado, setLinkEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [reenviarEm, setReenviarEm] = useState(0);

  useEffect(() => {
    if (reenviarEm <= 0) return;
    const timer = setTimeout(() => setReenviarEm((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearTimeout(timer);
  }, [reenviarEm]);

  async function enviarLink() {
    if (loading) return;
    setErro('');
    const emailLimpo = email.trim().toLowerCase();
    if (!emailValido(emailLimpo)) {
      setErro('Confira o formato do e-mail.');
      return;
    }

    setLoading(true);
    try {
      await api.solicitarRecuperacao(emailLimpo);
      setEmail(emailLimpo);
      setLinkEnviado(true);
      setReenviarEm(60);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o link agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <Link href="/(auth)/login" style={styles.backLink}>‹  Voltar para entrar</Link>
            <View style={styles.card}>
              <View style={styles.icon}>
                <Ionicons name={linkEnviado ? 'mail-outline' : 'key-outline'} size={28} color={colors.primaryLight} />
              </View>
              <Text style={styles.title}>{linkEnviado ? 'Verifique seu e-mail' : 'Recupere seu acesso'}</Text>
              <Text style={styles.subtitle}>
                {linkEnviado
                  ? `Se houver uma conta vinculada a ${email}, enviaremos um link para criar uma nova senha. Confira também a pasta de spam.`
                  : 'Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.'}
              </Text>

              {linkEnviado ? (
                <View style={styles.form}>
                  <InlineNotice tone="info">O link expira em 30 minutos e só pode ser usado uma vez. Abra o e-mail no dispositivo em que o MyFinance está instalado.</InlineNotice>
                  <Pressable onPress={() => void enviarLink()} disabled={loading || reenviarEm > 0} accessibilityRole="button" style={styles.secondaryButton}>
                    <Text style={[styles.secondaryText, (loading || reenviarEm > 0) && styles.disabledText]}>
                      {reenviarEm > 0 ? `Enviar outro link em ${reenviarEm}s` : 'Enviar outro link'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => { setLinkEnviado(false); setErro(''); }} accessibilityRole="button" style={styles.textButton}>
                    <Text style={styles.secondaryText}>Usar outro e-mail</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.form}>
                  <Field value={email} onChangeText={(value) => { setEmail(value); setErro(''); }} placeholder="E-mail da conta" accessibilityLabel="E-mail da conta" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" maxLength={150} returnKeyType="send" onSubmitEditing={() => void enviarLink()} />
                  {erro ? <InlineNotice>{erro}</InlineNotice> : null}
                  <PrimaryButton label="Enviar link de recuperação" onPress={() => void enviarLink()} loading={loading} icon="mail-outline" />
                  <Text style={styles.helper}>Conta criada com Google? Volte e escolha “Entrar com Google”.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  container: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  backLink: { color: colors.muted, fontSize: 14, fontWeight: '600', alignSelf: 'flex-start', paddingVertical: 6 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 24, gap: 18 },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(138,43,226,0.18)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  form: { gap: 13 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  secondaryButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primaryLight, fontSize: 14, fontWeight: '700' },
  disabledText: { color: colors.muted },
  textButton: { alignItems: 'center', padding: 6 },
});
