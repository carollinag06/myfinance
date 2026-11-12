// Gerencia a listagem, o cadastro, a edição e a exclusão de categorias.
import { confirmAction, showSuccess } from '../src/feedback';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Categoria } from '../src/api';
import { Field, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../src/ui';
import { colors } from '../src/theme';

export default function CategoriesScreen() {
  const [fetching, setFetching] = useState(true);
  const [items, setItems] = useState<Categoria[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
    try {
      setItems(await api.get<Categoria[]>('/categorias'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as categorias.');
    } finally { setFetching(false); }

  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function saveCategory() {
    if (loading) return;
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const payload = { nome: name.trim(), descricao: description.trim() || null };
      if (editingId !== null) {
        const updated = await api.put<Categoria>('/categorias/' + editingId, payload);
        setItems(current => current.map(category => category.id === updated.id ? updated : category));
      } else {
        await api.post('/categorias', { ...payload, tipo: type });
      }
      setName('');
      setDescription('');
      setType('despesa');
      setEditingId(null);
      setShowForm(false);
      if (editingId === null) await load();
      showSuccess(editingId === null ? 'Categoria cadastrada.' : 'Categoria atualizada.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a categoria.');
    } finally {
      setLoading(false);
    }
  }

  function startEditing(item: Categoria) {
    setEditingId(item.id);
    setName(item.nome);
    setDescription(item.descricao || '');
    setError('');
    setShowForm(false);
  }

  function cancelEditing() {
    setEditingId(null);
    setName('');
    setDescription('');
    setError('');
  }

  function remove(item: Categoria) {
    confirmAction('Excluir categoria', 'Deseja excluir “' + item.nome + '”? Esta ação não pode ser desfeita.', [{
      label: 'Excluir', destructive: true, run: async () => {
        await api.delete('/categorias/' + item.id);
        setItems(current => current.filter(category => category.id !== item.id));
        showSuccess('Categoria excluída.');
      },
    }]);
  }

  return (
    <Screen title="Categorias" subtitle="Organize os lançamentos por tipo de gasto ou receita.">
      <PrimaryButton disabled={loading || editingId !== null} label={showForm ? 'Fechar formulário' : 'Nova categoria'} icon={showForm ? 'close' : 'add'} onPress={() => setShowForm(!showForm)} />
      {showForm ? (
        <Panel>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Tipo</Text>
          <View style={{ flexDirection: 'row', gap: 9 }}>
            {(['despesa', 'receita'] as const).map((item) => (
              <Pressable key={item} onPress={() => setType(item)} style={{ flex: 1, padding: 11, borderRadius: 13, alignItems: 'center', backgroundColor: type === item ? (item === 'despesa' ? colors.dangerSoft : colors.successSoft) : colors.surfaceLight, borderWidth: 1, borderColor: type === item ? (item === 'despesa' ? colors.danger : colors.success) : colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item === 'despesa' ? 'Despesa' : 'Receita'}</Text>
              </Pressable>
            ))}
          </View>
          <Field value={name} onChangeText={setName} placeholder="Nome" maxLength={100} />
          <Field value={description} onChangeText={setDescription} placeholder="Descrição (opcional)" maxLength={255} />
          <PrimaryButton label="Salvar categoria" onPress={saveCategory} loading={loading} />
        </Panel>
      ) : null}
      {fetching ? <LoadingState label="Carregando..." /> : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {!fetching && !error && items.length === 0 ? <Panel><Text style={{ color: colors.muted, textAlign: 'center' }}>Nenhuma categoria cadastrada.</Text></Panel> : null}
      {items.map((item) => (
        <Panel key={item.id} style={{ padding: 13 }}>
          {editingId === item.id ? <View style={{ gap: 10 }}>
            <Field value={name} onChangeText={setName} placeholder="Nome" maxLength={100} />
            <Field value={description} onChangeText={setDescription} placeholder="Descrição (opcional)" maxLength={255} />
            {error ? <InlineNotice>{error}</InlineNotice> : null}
            <PrimaryButton label="Salvar alterações" onPress={saveCategory} loading={loading} />
            <Pressable accessibilityRole="button" disabled={loading} onPress={cancelEditing} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.muted, fontWeight: '600' }}>Cancelar</Text>
            </Pressable>
          </View> : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(138,43,226,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="pricetag-outline" size={19} color={colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>{item.nome}</Text>
                {item.isPadrao ? <Text style={{ color: colors.primaryLight, fontSize: 10, fontWeight: '700' }}>PADRÃO</Text> : null}
              </View>
              {item.descricao ? <Text style={{ color: colors.muted, fontSize: 12 }}>{item.descricao}</Text> : null}
            </View>
            <Text style={{ color: item.tipo === 'receita' ? colors.success : colors.danger, fontSize: 11, fontWeight: '700' }}>{item.tipo === 'receita' ? 'RECEITA' : 'DESPESA'}</Text>
            {!item.isPadrao ? <Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + item.nome} disabled={loading || editingId !== null} onPress={() => startEditing(item)} hitSlop={8}><Ionicons name="create-outline" size={18} color={colors.primaryLight} /></Pressable> : null}
            {!item.isPadrao ? <Pressable onPress={() => remove(item)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable> : null}
          </View>
          )}
        </Panel>
      ))}
    </Screen>
  );
}
