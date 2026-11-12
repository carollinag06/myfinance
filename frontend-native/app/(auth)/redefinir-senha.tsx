// Valida o link recebido e atualiza a senha da conta.
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useLocalSearchParams } from '../../src/navigation';
import { api } from '../../src/api';
import { PasswordField } from '../../src/PasswordField';
import { colors } from '../../src/theme';
import { InlineNotice, PrimaryButton, Screen } from '../../src/ui';

export default function RedefinirSenhaScreen() {
  const params = useLocalSearchParams<{ email?: string; token?: string }>();
  const email = typeof params.email === 'string' ? params.email.trim().toLowerCase() : '';
  const token = typeof params.token === 'string' ? params.token : '';
  const linkValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^[a-f\d]{64}$/i.test(token);
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [concluido, setConcluido] = useState(false);

  async function redefinirSenha() {
    if (loading || !linkValido) return;
    setErro('');
    if (senha.length < 8) { setErro('Use uma senha com pelo menos 8 caracteres.'); return; }
    if (senha !== confirmarSenha) { setErro('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await api.redefinirSenha(email, token, senha);
      setConcluido(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível redefinir a senha agora.');
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
              <View style={[styles.icon, concluido && styles.iconSuccess]}><Ionicons name={concluido ? 'checkmark' : 'lock-closed-outline'} size={28} color={concluido ? colors.success : colors.primaryLight} /></View>
              <Text style={styles.title}>{concluido ? 'Senha redefinida' : 'Crie uma nova senha'}</Text>
              <Text style={styles.subtitle}>
                {concluido
                  ? 'Sua nova senha já está ativa. Entre com ela para continuar.'
                  : linkValido
                    ? `Defina uma nova senha para ${email}.`
                    : 'Este link está incompleto ou inválido. Solicite uma nova recuperação.'}
              </Text>
              {concluido ? (
                <View style={styles.form}>
                  <InlineNotice tone="success">A senha foi atualizada com segurança.</InlineNotice>
                  <Link href="/(auth)/login" style={styles.primaryLink}>Voltar para o login</Link>
                </View>
              ) : linkValido ? (
                <View style={styles.form}>
                  <InlineNotice tone="info">O link pode ser usado uma vez e expira em 30 minutos.</InlineNotice>
                  <PasswordField value={senha} onChangeText={(value) => { setSenha(value); setErro(''); }} placeholder="Nova senha (mínimo 8 caracteres)" accessibilityLabel="Nova senha" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" maxLength={72} />
                  <PasswordField value={confirmarSenha} onChangeText={(value) => { setConfirmarSenha(value); setErro(''); }} placeholder="Confirme a nova senha" accessibilityLabel="Confirme a nova senha" autoCapitalize="none" autoCorrect={false} autoComplete="new-password" textContentType="newPassword" maxLength={72} />
                  {erro ? <InlineNotice>{erro}</InlineNotice> : null}
                  <PrimaryButton label="Salvar nova senha" onPress={() => void redefinirSenha()} loading={loading} />
                </View>
              ) : <Link href="/(auth)/recuperar-senha" style={styles.primaryLink}>Solicitar outro link</Link>}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  container: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  backLink: { color: colors.muted, fontSize: 14, fontWeight: '600', alignSelf: 'flex-start', paddingVertical: 6 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, padding: 24, gap: 18 },
  icon: { width: 60, height: 60, borderRadius: 20, backgroundColor: 'rgba(138,43,226,0.18)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  iconSuccess: { backgroundColor: colors.successSoft },
  title: { color: colors.text, fontSize: 25, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  form: { gap: 13 },
  primaryLink: { color: colors.text, fontSize: 15, fontWeight: '700', backgroundColor: colors.primary, borderRadius: 15, textAlign: 'center', overflow: 'hidden', paddingVertical: 16 },
});
