import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, type AlertButton } from 'react-native';
import { api, Categoria, Transacao, toAmount } from '../../src/api';
import { EmptyState, Field, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../../src/ui';
import { colors } from '../../src/theme';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateLabel = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Number.isFinite(day) ? new Date(year, month - 1, day).toLocaleDateString('pt-BR') : value;
};
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'despesa' | 'receita'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(monthKey(new Date()));
  const [allMonths, setAllMonths] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [result, categoryList] = await Promise.all([
        api.get<Transacao[]>('/transacoes'),
        api.get<Categoria[]>('/categorias'),
      ]);
      setTransactions([...result].sort((a, b) => b.data.localeCompare(a.data)));
      setCategories(categoryList);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o extrato.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const visibleTransactions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    return transactions.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.descricao} ${item.categoria?.nome || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedQuery);
      const matchesType = typeFilter === 'todos' || item.tipo === typeFilter;
      const matchesCategory = categoryFilter === null || item.categoriaId === categoryFilter;
      const matchesMonth = allMonths || item.data.slice(0, 7) === selectedMonth;
      return matchesQuery && matchesType && matchesCategory && matchesMonth;
    });
  }, [transactions, query, typeFilter, categoryFilter, allMonths, selectedMonth]);

  function moveMonth(offset: number) {
    const [year, month] = selectedMonth.split('-').map(Number);
    const next = new Date(year, month - 1 + offset, 1);
    setSelectedMonth(monthKey(next));
    setAllMonths(false);
  }

  const monthLabel = (() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  })();

  async function removeOne(item: Transacao) {
    try {
      await api.delete('/transacoes/' + item.id);
      setTransactions((current) => current.filter((transaction) => transaction.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir o lançamento.');
    }
  }

  async function removeGroup(item: Transacao) {
    if (!item.grupoParcelamento) return;
    try {
      await api.delete('/transacoes/grupos/' + item.grupoParcelamento);
      setTransactions((current) => current.filter((transaction) => transaction.grupoParcelamento !== item.grupoParcelamento));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir as parcelas.');
    }
  }

  function confirmRemove(item: Transacao) {
    const description = item.grupoParcelamento
      ? `Parcela ${item.numeroParcela}/${item.totalParcelas} de “${item.descricao}”.`
      : `Deseja remover “${item.descricao}”?`;
    const buttons: AlertButton[] = [
      { text: 'Cancelar', style: 'cancel' },
      { text: item.grupoParcelamento ? 'Só esta parcela' : 'Excluir', style: 'destructive', onPress: () => { void removeOne(item); } },
    ];
    if (item.grupoParcelamento) {
      buttons.push({ text: 'Toda a compra', style: 'destructive', onPress: () => { void removeGroup(item); } });
    }
    Alert.alert('Excluir lançamento', description, buttons);
  }

  return (
    <Screen title="Extrato" subtitle="Busque e filtre suas receitas e despesas.">
      <PrimaryButton label="Nova transação" icon="add" onPress={() => router.push('/nova-transacao')} />
      <Field value={query} onChangeText={setQuery} placeholder="Buscar descrição ou categoria" accessibilityLabel="Buscar no extrato" />

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          ['todos', 'Tudo'],
          ['despesa', 'Despesas'],
          ['receita', 'Receitas'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => setTypeFilter(value)} style={{ flex: 1, paddingVertical: 10, borderRadius: 13, alignItems: 'center', backgroundColor: typeFilter === value ? colors.primary : colors.surfaceLight }}>
            <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} hitSlop={8}><Ionicons name="chevron-back" size={22} color={colors.primaryLight} /></Pressable>
        <Pressable onPress={() => setAllMonths(!allMonths)}>
          <Text style={{ color: allMonths ? colors.primaryLight : colors.text, fontWeight: '700', textTransform: 'capitalize' }}>{allMonths ? 'Todos os períodos' : monthLabel}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} hitSlop={8}><Ionicons name="chevron-forward" size={22} color={colors.primaryLight} /></Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable onPress={() => setCategoryFilter(null)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: categoryFilter === null ? colors.primary : colors.surfaceLight }}>
          <Text style={{ color: colors.text, fontSize: 12 }}>Todas categorias</Text>
        </Pressable>
        {categories.map((category) => (
          <Pressable key={category.id} onPress={() => setCategoryFilter(category.id)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: categoryFilter === category.id ? colors.primary : colors.surfaceLight }}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{category.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => { setQuery(''); setTypeFilter('todos'); setCategoryFilter(null); setAllMonths(true); }} style={{ alignSelf: 'flex-end' }}>
        <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '700' }}>Limpar filtros</Text>
      </Pressable>

      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {loading && transactions.length === 0 ? <LoadingState /> : null}
      {!loading && visibleTransactions.length === 0 ? <Panel><EmptyState label={transactions.length ? 'Nenhum lançamento corresponde a esses filtros.' : 'Ainda não há lançamentos.'} /></Panel> : null}
      {visibleTransactions.map((item) => (
        <Panel key={item.id} style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.tipo === 'receita' ? colors.successSoft : colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.tipo === 'receita' ? 'arrow-down' : 'arrow-up'} size={18} color={item.tipo === 'receita' ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.descricao}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.categoria?.nome || 'Sem categoria'} · {dateLabel(item.data)}</Text>
              {item.grupoParcelamento ? <Text style={{ color: colors.primaryLight, fontSize: 11, marginTop: 3 }}>Parcela {item.numeroParcela}/{item.totalParcelas}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 7 }}>
              <Text style={{ color: item.tipo === 'receita' ? colors.success : colors.text, fontWeight: '700' }}>
                {item.tipo === 'despesa' ? '- ' : '+ '}{currency(toAmount(item.valor))}
              </Text>
              <Pressable accessibilityLabel="Excluir lançamento" onPress={() => confirmRemove(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        </Panel>
      ))}
    </Screen>
  );
}
