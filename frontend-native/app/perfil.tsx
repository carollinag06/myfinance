import { confirmAction } from '../src/feedback';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { launchImageLibrary, type Asset as ImagePickerAsset } from 'react-native-image-picker';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { api, fotoUsuarioUrl, Usuario } from '../src/api';
import { useAuth } from '../src/session';
import { colors } from '../src/theme';
import { Field, InlineNotice, Panel, PrimaryButton, Screen } from '../src/ui';

const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const MIME_TYPES_FOTO = ['image/jpeg', 'image/png', 'image/webp'];

function mimeTypeFoto(asset: ImagePickerAsset) {
  const mimeType = asset.type?.toLowerCase();
  if (mimeType && MIME_TYPES_FOTO.includes(mimeType)) return mimeType;

  const fileName = (asset.fileName || asset.uri || '').toLowerCase();
  if (/\.png(?:$|\?)/.test(fileName)) return 'image/png';
  if (/\.webp(?:$|\?)/.test(fileName)) return 'image/webp';
  if (/\.(jpe?g)(?:$|\?)/.test(fileName)) return 'image/jpeg';
  return null;
}

export default function ProfileScreen() {
  const { usuario, sair, atualizarUsuario } = useAuth();
  const [nome, setNome] = useState(usuario?.nome || '');
  const [email, setEmail] = useState(usuario?.email || '');
  const [fotoSelecionada, setFotoSelecionada] = useState<ImagePickerAsset | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);
  const [senhaLoading, setSenhaLoading] = useState(false);

  const tipoConta = usuario?.tipoUsuario === 'admin' ? 'Administrador' : 'Usuário';
  const fotoUrl = fotoSelecionada?.uri || fotoUsuarioUrl(usuario?.foto);

  async function escolherFoto() {
    setError('');
    setSaved('');

    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.8 });
      if (result.didCancel) return;

      const asset = result.assets?.[0];
      if (!asset) return;
      const fileSize = asset.fileSize;
      if (fileSize !== undefined && fileSize > MAX_FOTO_BYTES) {
        setError('Escolha uma imagem de até 5 MB.');
        return;
      }
      if (!mimeTypeFoto(asset)) {
        setError('Use uma imagem JPEG, PNG ou WebP.');
        return;
      }

      setFotoSelecionada(asset);
    } catch {
      setError('Não foi possível abrir a galeria de fotos.');
    }
  }

  async function save() {
    if (!usuario) return;
    const nomeNormalizado = nome.trim();
    const emailNormalizado = email.trim().toLowerCase();
    if (!nomeNormalizado || nomeNormalizado.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado) || emailNormalizado.length > 150) {
      setError('Informe um nome de até 100 caracteres e um e-mail válido de até 150 caracteres.');
      return;
    }

    setLoading(true);
    setError('');
    setSaved('');
    try {
      let atualizado: Usuario;
      if (fotoSelecionada) {
        const tipoFoto = mimeTypeFoto(fotoSelecionada);
        if (!tipoFoto) {
          setError('Use uma imagem JPEG, PNG ou WebP.');
          return;
        }

        const formData = new FormData();
        formData.append('nome', nomeNormalizado);
        formData.append('email', emailNormalizado);
        const nomeArquivo = fotoSelecionada.fileName || `perfil.${tipoFoto.split('/')[1]}`;
        formData.append('foto', {
          uri: fotoSelecionada.uri,
          name: nomeArquivo,
          type: tipoFoto,
        } as unknown as Blob);
        atualizado = await api.putMultipart<Usuario>(`/usuarios/${usuario.id}`, formData);
      } else {
        atualizado = await api.put<Usuario>(`/usuarios/${usuario.id}`, {
          nome: nomeNormalizado,
          email: emailNormalizado,
        });
      }

      await atualizarUsuario(atualizado);
      setFotoSelecionada(null);
      setSaved('Perfil atualizado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  }

  async function alterarSenha() {
    if (!usuario) return;
    if (!senhaAtual || !novaSenha || !confirmarSenha) {
      setError('Preencha os três campos para alterar a senha.');
      return;
    }
    if (novaSenha.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (novaSenha !== confirmarSenha) {
      setError('A confirmação da nova senha não corresponde.');
      return;
    }

    setSenhaLoading(true);
    setError('');
    setSaved('');
    try {
      await api.put(`/usuarios/${usuario.id}/senha`, { senhaAtual, novaSenha });
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
      setMostrarSenha(false);
      setSaved('Senha alterada com sucesso.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível alterar a senha.');
    } finally {
      setSenhaLoading(false);
    }
  }

  function confirmarSaida() {
    confirmAction('Sair da conta', 'Deseja encerrar sua sessão?', [{ label: 'Sair', run: async () => { await sair(); } }]);
  }

  return (
    <Screen title="Meu perfil" subtitle="Atualize os dados da sua conta e suas opções de segurança.">
      <Panel>
        <View style={{ alignItems: 'center', gap: 10, paddingBottom: 4 }}>
          {fotoUrl ? (
            <Image source={{ uri: fotoUrl }} style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceLight }} />
          ) : (
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(138,43,226,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={38} color={colors.primaryLight} />
            </View>
          )}
          <PrimaryButton label={fotoSelecionada ? 'Trocar foto' : 'Escolher foto'} icon="camera-outline" onPress={() => void escolherFoto()} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>JPEG, PNG ou WebP · até 5 MB</Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Nome</Text>
        <Field value={nome} onChangeText={setNome} placeholder="Nome" maxLength={100} autoCapitalize="words" />
        <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>E-mail</Text>
        <Field value={email} onChangeText={setEmail} placeholder="E-mail" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={150} />
        <Text style={{ color: colors.muted, fontSize: 12 }}>Tipo de conta: {tipoConta}</Text>
      </Panel>

      <Panel>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mostrarSenha ? 'Cancelar alteração de senha' : 'Mudar senha'}
          accessibilityState={{ expanded: mostrarSenha }}
          disabled={senhaLoading}
          onPress={() => {
            setMostrarSenha(!mostrarSenha);
            setSenhaAtual('');
            setNovaSenha('');
            setConfirmarSenha('');
            setError('');
            setSaved('');
          }}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <Ionicons name="lock-closed-outline" size={22} color={colors.primaryLight} />
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flex: 1 }}>{mostrarSenha ? 'Cancelar alteração de senha' : 'Mudar senha'}</Text>
          <Ionicons name={mostrarSenha ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primaryLight} />
        </Pressable>
        {mostrarSenha ? <>
        <Text style={{ color: colors.muted, fontSize: 13 }}>Confirme sua senha atual para cadastrar uma nova.</Text>
        <Field value={senhaAtual} onChangeText={setSenhaAtual} placeholder="Senha atual" secureTextEntry autoCapitalize="none" autoCorrect={false} />
        <Field value={novaSenha} onChangeText={setNovaSenha} placeholder="Nova senha (mínimo 8 caracteres)" secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={72} />
        <Field value={confirmarSenha} onChangeText={setConfirmarSenha} placeholder="Confirme a nova senha" secureTextEntry autoCapitalize="none" autoCorrect={false} maxLength={72} />
        <PrimaryButton label="Atualizar senha" onPress={() => void alterarSenha()} loading={senhaLoading} />
        </> : null}
      </Panel>

      {saved ? <InlineNotice tone="success">{saved}</InlineNotice> : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      <PrimaryButton label="Salvar perfil" onPress={() => void save()} loading={loading} />
      <Pressable
        accessibilityRole="button"
        onPress={confirmarSaida}
        style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
      >
        <Text style={{ color: colors.danger, fontWeight: '700' }}>Sair da conta</Text>
      </Pressable>
    </Screen>
  );
}
