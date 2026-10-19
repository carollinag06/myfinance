import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View, type DimensionValue } from 'react-native';
import { api, Transacao, toAmount } from '../src/api';
import { colors } from '../src/theme';
import { EmptyState, InlineNotice, LoadingState, Panel, Screen, SectionTitle } from '../src/ui';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const keyFor = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthTitle = (key: string) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

export default function AnalyticsScreen() {
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(keyFor(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTransactions(await api.get<Transacao[]>('/transacoes'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as análises.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const monthly = useMemo(() => transactions.filter((item) => item.data.slice(0, 7) === selectedMonth), [transactions, selectedMonth]);
  const income = monthly.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + toAmount(item.valor), 0);
  const expenses = monthly.filter((item) => item.tipo === 'despesa').reduce((sum, item) => sum + toAmount(item.valor), 0);
  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return keyFor(new Date(year, month - 2, 1));
  }, [selectedMonth]);
  const previousExpenses = transactions.filter((item) => item.data.slice(0, 7) === previousMonth && item.tipo === 'despesa').reduce((sum, item) => sum + toAmount(item.valor), 0);
  const expenseChange = previousExpenses === 0 ? null : ((expenses - previousExpenses) / previousExpenses) * 100;

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    monthly.filter((item) => item.tipo === 'despesa').forEach((item) => {
      const name = item.categoria?.nome || 'Sem categoria';
      totals.set(name, (totals.get(name) || 0) + toAmount(item.valor));
    });
    return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthly]);

  const history = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 5 + index, 1);
      const key = keyFor(date);
      const items = transactions.filter((item) => item.data.slice(0, 7) === key);
      return {
        key,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income: items.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + toAmount(item.valor), 0),
        expenses: items.filter((item) => item.tipo === 'despesa').reduce((sum, item) => sum + toAmount(item.valor), 0),
      };
    });
  }, [transactions, selectedMonth]);
  const largestHistoryValue = Math.max(1, ...history.flatMap((item) => [item.income, item.expenses]));
  const largestCategoryValue = Math.max(1, ...categoryTotals.map((item) => item.value));

  function moveMonth(offset: number) {
    const [year, month] = selectedMonth.split('-').map(Number);
    setSelectedMonth(keyFor(new Date(year, month - 1 + offset, 1)));
  }

  if (loading && transactions.length === 0) return <Screen><LoadingState /></Screen>;

  return (
    <Screen title="Análises" subtitle="Entenda como seu dinheiro entrou e saiu.">
      {error ? <InlineNotice>{error}</InlineNotice> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} hitSlop={8}><Ionicons name="chevron-back" size={24} color={colors.primaryLight} /></Pressable>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{monthTitle(selectedMonth)}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} hitSlop={8}><Ionicons name="chevron-forward" size={24} color={colors.primaryLight} /></Pressable>
      </View>

      <Panel style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: '#E7D3FF', fontSize: 13 }}>Saldo do período</Text>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>{currency(income - expenses)}</Text>
        <Text style={{ color: '#E7D3FF', fontSize: 12 }}>{monthly.length} lançamentos</Text>
      </Panel>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Panel style={{ flex: 1, padding: 13 }}>
          <Ionicons name="arrow-down-circle-outline" size={22} color={colors.success} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Receitas</Text>
          <Text numberOfLines={1} style={{ color: colors.success, fontWeight: '700' }}>{currency(income)}</Text>
        </Panel>
        <Panel style={{ flex: 1, padding: 13 }}>
          <Ionicons name="arrow-up-circle-outline" size={22} color={colors.danger} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Despesas</Text>
          <Text numberOfLines={1} style={{ color: colors.danger, fontWeight: '700' }}>{currency(expenses)}</Text>
        </Panel>
      </View>

      <Panel style={{ padding: 14 }}>
        <SectionTitle>Comparação com o mês anterior</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name={expenseChange === null ? 'remove-circle-outline' : expenseChange > 0 ? 'trending-up' : 'trending-down'} size={23} color={expenseChange !== null && expenseChange > 0 ? colors.danger : colors.success} />
          <Text style={{ color: colors.text, flex: 1 }}>
            {expenseChange === null ? 'Sem despesas no mês anterior para comparar.' : `${Math.abs(expenseChange).toFixed(1)}% ${expenseChange > 0 ? 'a mais' : 'a menos'} em despesas`}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Mês anterior: {currency(previousExpenses)}</Text>
      </Panel>

      <Panel>
        <SectionTitle>Últimos seis meses</SectionTitle>
        <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5, paddingTop: 10 }}>
          {history.map((item) => (
            <View key={item.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View style={{ height: 105, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                <View style={{ width: 10, height: `${Math.max(item.income / largestHistoryValue * 100, item.income ? 4 : 0)}%` as DimensionValue, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.success }} />
                <View style={{ width: 10, height: `${Math.max(item.expenses / largestHistoryValue * 100, item.expenses ? 4 : 0)}%` as DimensionValue, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.danger }} />
              </View>
              <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'capitalize' }}>{item.label}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          <Text style={{ color: colors.success, fontSize: 11 }}>● Receitas</Text>
          <Text style={{ color: colors.danger, fontSize: 11 }}>● Despesas</Text>
        </View>
      </Panel>

      <Panel>
        <SectionTitle>Despesas por categoria</SectionTitle>
        {categoryTotals.length === 0 ? <EmptyState label="Não há despesas neste mês." /> : categoryTotals.slice(0, 8).map((item) => (
          <View key={item.name} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={1} style={{ color: colors.text, flex: 1 }}>{item.name}</Text>
              <Text style={{ color: colors.muted }}>{currency(item.value)}</Text>
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: 'hidden' }}>
              <View style={{ width: `${item.value / largestCategoryValue * 100}%` as DimensionValue, height: '100%', backgroundColor: colors.primaryLight }} />
            </View>
          </View>
        ))}
      </Panel>
    </Screen>
  );
}
