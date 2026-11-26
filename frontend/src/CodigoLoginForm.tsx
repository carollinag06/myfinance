import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { InlineNotice, PrimaryButton } from './ui';
import { useAuth } from './session';
import { colors } from './theme';

const DIGITOS = 6;

/** Segunda etapa do login: seis campos para o código enviado por e-mail. */
export function CodigoLoginForm() {
  const { desafio, confirmarCodigo, reenviarCodigo, cancelarCodigo } = useAuth();
  const [digitos, setDigitos] = useState<string[]>(Array(DIGITOS).fill(''));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const refs = useRef<(TextInput | null)[]>([]);

  function alterar(index: number, value: string) {
    const limpo = value.replace(/\D/g, '');
    setError('');
    setInfo('');
    if (limpo.length > 1) {
      // Colar o código inteiro em qualquer campo.
      const novo = [...digitos];
      limpo.slice(0, DIGITOS - index).split('').forEach((d, i) => { novo[index + i] = d; });
      setDigitos(novo);
      refs.current[Math.min(index + limpo.length, DIGITOS - 1)]?.focus();
      return;
    }
    const novo = [...digitos];
    novo[index] = limpo;
    setDigitos(novo);
    if (limpo && index < DIGITOS - 1) refs.current[index + 1]?.focus();
  }

  function apagar(index: number, key: string) {
    if (key === 'Backspace' && !digitos[index] && index > 0) refs.current[index - 1]?.focus();
  }

  async function confirmar() {
    if (loading) return;
    const codigo = digitos.join(''); // mantido como texto para preservar zeros à esquerda
    if (codigo.length !== DIGITOS) {
      setError('Digite os 6 números do código.');
      return;
    }
    setLoading(true);
    try {
      await confirmarCodigo(codigo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível confirmar o código.');
      setDigitos(Array(DIGITOS).fill(''));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function reenviar() {
    if (loading) return;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await reenviarCodigo();
      setInfo('Enviamos um novo código para o seu e-mail.');
      setDigitos(Array(DIGITOS).fill(''));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível reenviar o código.');
    } finally {
      setLoading(false);
    }
  }

  if (!desafio) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirme seu acesso</Text>
      <Text style={styles.subtitle}>
        Enviamos um código de 6 dígitos para o e-mail da sua conta. Ele expira em 10 minutos. Confira também o spam.
      </Text>
      <View style={styles.row}>
        {digitos.map((d, i) => (
          <TextInput
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={d}
            onChangeText={(v) => alterar(i, v)}
            onKeyPress={(e) => apagar(i, e.nativeEvent.key)}
            keyboardType="number-pad"
            maxLength={i === 0 ? DIGITOS : 1}
            autoFocus={i === 0}
            textContentType={i === 0 ? 'oneTimeCode' : 'none'}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            accessibilityLabel={`Dígito ${i + 1} do código`}
            style={styles.box}
          />
        ))}
      </View>
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {info ? <InlineNotice tone="success">{info}</InlineNotice> : null}
      <PrimaryButton label="Confirmar código" onPress={confirmar} loading={loading} />
      <Pressable onPress={reenviar} disabled={loading} accessibilityRole="button">
        <Text style={styles.link}>Não recebeu? Reenviar código</Text>
      </Pressable>
      <Pressable onPress={cancelarCodigo} disabled={loading} accessibilityRole="button">
        <Text style={styles.cancel}>Voltar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  box: {
    width: 46,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.muted,
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  link: { color: colors.primaryLight, fontWeight: '700', textAlign: 'center' },
  cancel: { color: colors.muted, textAlign: 'center' },
});
