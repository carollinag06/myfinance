import React, { useState } from 'react';
import { Text } from 'react-native';
import { api } from '../src/api';
import { useAuth } from '../src/session';
import { colors } from '../src/theme';
import { Field, InlineNotice, Panel, PrimaryButton, Screen } from '../src/ui';

export default function ProfileScreen() {
  const { usuario, sair, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!usuario) return;
    if (!nome.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Informe um nome e um e-mail válido.');
      return;
    }
    setLoading(true);
    setError('');
    setSaved('');
    try {
      await api.put('/usuarios/' + usuario.id, { nome: nome.trim(), email: email.trim().toLowerCase() });
      await atualizarUsuario({ ...usuario, nome: nome.trim(), email: email.trim().toLowerCase() });
      setSaved('Perfil atualizado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Meu perfil" subtitle="Atualize os dados da sua conta.">
      <Panel>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Nome</Text>
        <Field value={nome} onChangeText={setNome} placeholder="Nome" />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>E-mail</Text>
        <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" />
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tipo de conta: {usuario?.tipoUsuario}</Text>
      </Panel>
      {saved ? <Text style={{ color: colors.success }}>{saved}</Text> : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      <PrimaryButton label="Salvar perfil" onPress={save} loading={loading} />
      <PrimaryButton label="Sair da conta" onPress={() => void sair()} />
    </Screen>
  );
}