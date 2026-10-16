import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api, Categoria } from '../src/api';
import { Field, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../src/ui';
import { colors } from '../src/theme';

export default function CategoriesScreen() {
  const [items, setItems] = useState<Categoria[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.get<Categoria[]>('/categorias'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as categorias.');
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function add() {
    if (!name.trim()) {
      setError('Informe o nome da categoria.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/categorias', { nome: name.trim(), descricao: description.trim() || null });
      setName('');
      setDescription('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a categoria.');
    } finally {
      setLoading(false);
    }
  }

  function remove(item: Categoria) {
    Alert.alert('Excluir categoria', 'Deseja excluir “' + item.nome + '”?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/categorias/' + item.id);
          setItems((current) => current.filter((category) => category.id !== item.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível excluir.');
        }
      } },
    ]);
  }

  return (
    <Screen title="Categorias" subtitle="Organize os lançamentos por tipo de gasto ou receita.">
      <PrimaryButton label={showForm ? 'Fechar formulário' : 'Nova categoria'} icon={showForm ? 'close' : 'add'} onPress={() => setShowForm(!showForm)} />
      {showForm ? (
        <Panel>
          <Field value={name} onChangeText={setName} placeholder="Nome" maxLength={100} />
          <Field value={description} onChangeText={setDescription} placeholder="Descrição (opcional)" maxLength={255} />
          <PrimaryButton label="Salvar categoria" onPress={add} loading={loading} />
        </Panel>
      ) : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {items.length === 0 ? <Panel><Text style={{ color: colors.muted, textAlign: 'center' }}>Nenhuma categoria cadastrada.</Text></Panel> : null}
      {items.map((item) => (
        <Panel key={item.id} style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(138,43,226,0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="pricetag-outline" size={19} color={colors.primaryLight} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.nome}</Text>
              {item.descricao ? <Text style={{ color: colors.muted, fontSize: 12 }}>{item.descricao}</Text> : null}
            </View>
            <Pressable onPress={() => remove(item)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
          </View>
        </Panel>
      ))}
    </Screen>
  );
}