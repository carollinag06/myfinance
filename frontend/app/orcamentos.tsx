import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View, type DimensionValue } from 'react-native';
import { api, Categoria, Orcamento, toAmount, Transacao } from '../src/api';
import { colors } from '../src/theme';
import { Field, InlineNotice, Panel, PrimaryButton, Screen } from '../src/ui';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function BudgetsScreen() {
  const now = new Date();
  const [items, setItems] = useState<Orcamento[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [budgetList, categoryList, transactionList] = await Promise.all([
        api.get<Orcamento[]>('/orcamentos'),
        api.get<Categoria[]>('/categorias'),
        api.get<Transacao[]>('/transacoes'),
      ]);
      setItems(budgetList);
      setCategories(categoryList);
      setTransactions(transactionList);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os orçamentos.');
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function add() {
    const value = Number(amount.trim().replace(',', '.'));
    const m = Number(month);
    const y = Number(year);
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 1900 || y > 9999) {
      setError('Confira o valor, mês e ano do orçamento.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/orcamentos', { valor: value, mes: m, ano: y, categoriaId: categoryId });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o orçamento.');
    } finally {
      setLoading(false);
    }
  }

  function remove(item: Orcamento) {
    Alert.alert('Excluir orçamento', 'Deseja remover este orçamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/orcamentos/' + item.id);
          setItems((current) => current.filter((budget) => budget.id !== item.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível excluir o orçamento.');
        }
      } },
    ]);
  }

  return (
    <Screen title="Orçamentos" subtitle="Compare o limite definido com as despesas do período.">
      <PrimaryButton label={showForm ? 'Fechar formulário' : 'Novo orçamento'} icon={showForm ? 'close' : 'add'} onPress={() => setShowForm(!showForm)} />
      {showForm ? (
        <Panel>
          <Field value={amount} onChangeText={setAmount} placeholder="Limite (R$)" keyboardType="decimal-pad" />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Field value={month} onChangeText={setMonth} placeholder="Mês (1–12)" keyboardType="number-pad" style={{ flex: 1 }} />
            <Field value={year} onChangeText={setYear} placeholder="Ano" keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Categoria</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable onPress={() => setCategoryId(null)} style={{ padding: 9, borderRadius: 18, backgroundColor: categoryId === null ? colors.primary : colors.surfaceLight }}>
              <Text style={{ color: colors.text }}>Todas</Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={{ padding: 9, borderRadius: 18, backgroundColor: categoryId === category.id ? colors.primary : colors.surfaceLight }}>
                <Text style={{ color: colors.text }}>{category.nome}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Salvar orçamento" onPress={add} loading={loading} />
        </Panel>
      ) : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {items.map((item) => {
        const monthKey = String(item.ano) + '-' + String(item.mes).padStart(2, '0');
        const spent = transactions
          .filter((t) => t.tipo === 'despesa' && t.data.slice(0, 7) === monthKey && (!item.categoriaId || t.categoriaId === item.categoriaId))
          .reduce((sum, t) => sum + toAmount(t.valor), 0);
        const limit = toAmount(item.valor);
        const progress = limit > 0 ? Math.min(spent / limit, 1) : 0;
        const category = item.categoria?.nome || categories.find((c) => c.id === item.categoriaId)?.nome || 'Todas as categorias';

        return (
          <Panel key={item.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{category}</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{String(item.mes).padStart(2, '0')}/{item.ano}</Text>
              </View>
              <Pressable onPress={() => void remove(item)} hitSlop={8}><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
            </View>
            <View style={{ height: 8, borderRadius: 5, backgroundColor: colors.surfaceLight, overflow: 'hidden' }}>
              <View style={{ width: ((progress * 100) + '%') as DimensionValue, height: '100%', backgroundColor: progress >= 1 ? colors.danger : colors.primaryLight }} />
            </View>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{currency(spent)} de {currency(limit)}</Text>
          </Panel>
        );
      })}
      {items.length === 0 && !showForm ? <Panel><Text style={{ color: colors.muted, textAlign: 'center' }}>Nenhum orçamento cadastrado.</Text></Panel> : null}
    </Screen>
  );
}