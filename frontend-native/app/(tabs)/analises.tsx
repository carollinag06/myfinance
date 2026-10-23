import { paymentLabel } from '../../src/transactions';
import { isRealized } from '../../src/transactions';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect } from '../../src/navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View, type DimensionValue } from 'react-native';
import { api, Transacao, toAmount } from '../../src/api';
import { formatDateBR } from '../../src/date';
import { colors } from '../../src/theme';
import { EmptyState, InlineNotice, LoadingState, Panel, Screen, SectionTitle } from '../../src/ui';

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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'previsto' | 'realizado'>('todos');
  const [selectedType, setSelectedType] = useState<'receita' | 'despesa' | null>(null);
  const reportType = selectedType || 'despesa';
  const isIncome = reportType === 'receita';
  const reportLabel = isIncome ? 'receitas' : 'despesas';
  const [showAllCategories, setShowAllCategories] = useState(false);

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

  const reportTransactions = useMemo(() => transactions.filter(item => statusFilter === 'todos' || (statusFilter === 'realizado' ? isRealized(item) : !isRealized(item))), [transactions, statusFilter]);
  const monthly = useMemo(() => reportTransactions.filter((item) => item.data.slice(0, 7) === selectedMonth), [reportTransactions, selectedMonth]);
  const income = monthly.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + toAmount(item.valor), 0);
  const expenses = monthly.filter((item) => item.tipo === 'despesa').reduce((sum, item) => sum + toAmount(item.valor), 0);
  const previousMonth = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return keyFor(new Date(year, month - 2, 1));
  }, [selectedMonth]);
  const previousTotal = reportTransactions.filter((item) => item.data.slice(0, 7) === previousMonth && item.tipo === reportType).reduce((sum, item) => sum + toAmount(item.valor), 0);
  const reportChange = previousTotal === 0 ? null : (((isIncome ? income : expenses) - previousTotal) / previousTotal) * 100;

  const categoryTotals = useMemo(() => {
    const totals = new Map<string, number>();
    monthly.filter((item) => item.tipo === reportType).forEach((item) => {
      const name = item.categoria?.nome || 'Sem categoria';
      totals.set(name, (totals.get(name) || 0) + toAmount(item.valor));
    });
    return [...totals.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [monthly, reportType]);

  const history = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(year, month - 6 + index, 1);
      const key = keyFor(date);
      const items = reportTransactions.filter((item) => item.data.slice(0, 7) === key);
      return {
        key,
        label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        income: items.filter((item) => item.tipo === 'receita').reduce((sum, item) => sum + toAmount(item.valor), 0),
        expenses: items.filter((item) => item.tipo === 'despesa').reduce((sum, item) => sum + toAmount(item.valor), 0),
      };
    });
  }, [reportTransactions, selectedMonth]);
  const largestHistoryValue = Math.max(1, ...history.flatMap((item) => selectedType === 'receita' ? [item.income] : selectedType === 'despesa' ? [item.expenses] : [item.income, item.expenses]));

  const reportItems = monthly.filter(item => item.tipo === reportType);
  const reportTotal = isIncome ? income : expenses;
  function selectType(type: 'receita' | 'despesa') {
    setSelectedType(type);
    setSelectedCategory(null);
    setShowAllCategories(false);
  }
  const [selectedYear, selectedMonthNumber] = selectedMonth.split('-').map(Number);
  const daysInMonth = new Date(selectedYear, selectedMonthNumber, 0).getDate();
  const savingsRate = income > 0 ? (income - expenses) / income * 100 : null;
  const topTransactions = [...reportItems]
    .filter(item => !selectedCategory || (item.categoria?.nome || 'Sem categoria') === selectedCategory)
    .sort((a, b) => toAmount(b.valor) - toAmount(a.valor)).slice(0, 5);
  const palette = [colors.primaryLight, '#42C8F5', '#FFB74D', '#F48FB1', '#80CBC4', '#B39DDB'];

  function moveMonth(offset: number) {
    setSelectedCategory(null);
    const [year, month] = selectedMonth.split('-').map(Number);
    setSelectedMonth(keyFor(new Date(year, month - 1 + offset, 1)));
  }

  if (loading && transactions.length === 0) return <Screen><LoadingState /></Screen>;

  return (
    <Screen title="Análises" subtitle="Seu mês em números, tendências e escolhas.">
      {error ? <InlineNotice>{error}</InlineNotice> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => moveMonth(-1)} hitSlop={8}><Ionicons name="chevron-back" size={24} color={colors.primaryLight} /></Pressable>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', textTransform: 'capitalize' }}>{monthTitle(selectedMonth)}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => moveMonth(1)} hitSlop={8}><Ionicons name="chevron-forward" size={24} color={colors.primaryLight} /></Pressable>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(['todos', 'realizado', 'previsto'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: statusFilter === value }} onPress={() => { setStatusFilter(value); setSelectedCategory(null); }} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: statusFilter === value ? colors.primary : colors.surfaceLight }}><Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>{value === 'todos' ? 'Todos' : value === 'realizado' ? 'Realizados' : 'Previstos'}</Text></Pressable>)}
      </View>

      <Panel style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: '#E7D3FF', fontSize: 13 }}>{selectedType ? (isIncome ? 'Receitas do período' : 'Despesas do período') : 'Saldo do período'}</Text>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '800' }}>{currency(selectedType ? reportTotal : income - expenses)}</Text>
        <Text style={{ color: '#E7D3FF', fontSize: 12 }}>{selectedType ? reportItems.length : monthly.length} lançamentos</Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 3 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: '#E7D3FF', flex: 1 }}>{selectedType ? 'Relatório de ' + reportLabel : income > expenses ? 'Receitas acima das despesas' : expenses > income ? 'Despesas acima das receitas' : 'Receitas e despesas equilibradas'}</Text>
          <Ionicons name={income >= expenses ? 'trending-up' : 'trending-down'} size={28} color={colors.text} />
        </View>
        <Text style={{ color: '#E7D3FF', fontSize: 11 }}>{statusFilter === 'todos' ? 'Projeção do mês: inclui realizados e previstos.' : statusFilter === 'realizado' ? 'Somente receitas recebidas e despesas pagas até hoje.' : 'Somente lançamentos ainda previstos.'}</Text>
      </Panel>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver relatório de receitas" accessibilityState={{ selected: selectedType === 'receita' }} onPress={() => selectType('receita')} style={{ flex: 1 }}>
        <Panel style={{ padding: 13, borderColor: selectedType === 'receita' ? colors.success : colors.border }}>
          <Ionicons name="arrow-down-circle-outline" size={22} color={colors.success} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Receitas</Text>
          <Text numberOfLines={1} style={{ color: colors.success, fontWeight: '700' }}>{currency(income)}</Text>
        </Panel>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver relatório de despesas" accessibilityState={{ selected: selectedType === 'despesa' }} onPress={() => selectType('despesa')} style={{ flex: 1 }}>
        <Panel style={{ padding: 13, borderColor: selectedType === 'despesa' ? colors.danger : colors.border }}>
          <Ionicons name="arrow-up-circle-outline" size={22} color={colors.danger} />
          <Text style={{ color: colors.muted, fontSize: 12 }}>Despesas</Text>
          <Text numberOfLines={1} style={{ color: colors.danger, fontWeight: '700' }}>{currency(expenses)}</Text>
        </Panel>
        </Pressable>
      </View>
      {selectedType ? <Pressable
        accessibilityRole="button"
        onPress={() => { setSelectedType(null); setSelectedCategory(null); }}
        style={({ pressed }) => ({
          minHeight: 52,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: 18,
          paddingVertical: 14,
          borderRadius: 14,
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor: colors.primaryLight,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="grid-outline" size={21} color={colors.text} />
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Ver visão geral</Text>
        <Ionicons name="arrow-back" size={20} color={colors.text} />
      </Pressable> : null}

      <Panel>
        <SectionTitle>Como foi o seu mês</SectionTitle>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{selectedType ? 'Quantidade de lançamentos' : 'Saldo / receitas'}</Text>
            <Text style={{ color: savingsRate !== null && savingsRate < 0 ? colors.danger : colors.success, fontSize: 23, fontWeight: '800' }}>{selectedType ? reportItems.length : savingsRate === null ? '—' : savingsRate.toFixed(1).replace('.', ',') + '%'}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>{selectedType ? 'Registros de ' + reportLabel + ' no mês' : savingsRate === null ? 'Sem receitas no período' : 'Percentual que restou no mês'}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={{ color: colors.muted, fontSize: 12 }}>{isIncome ? 'Receita média por dia' : 'Gasto médio por dia'}</Text>
            <Text style={{ color: colors.text, fontSize: 21, fontWeight: '800' }}>{currency(reportTotal / daysInMonth)}</Text>
            <Text style={{ color: colors.muted, fontSize: 11 }}>Total dividido por {daysInMonth} dias</Text>
          </View>
        </View>
        <View style={{ backgroundColor: colors.surfaceLight, padding: 12, borderRadius: 12, gap: 5 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{categoryTotals[0] ? categoryTotals[0].name + (isIncome ? ' lidera as receitas' : ' lidera os gastos') : 'Adicione lançamentos para analisar'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{categoryTotals[0] ? currency(categoryTotals[0].value) + ' · ' + (categoryTotals[0].value / reportTotal * 100).toFixed(1).replace('.', ',') + '% das ' + reportLabel + ' do mês.' : 'Suas categorias e tendências aparecem aqui conforme você adiciona transações.'}</Text>
        </View>
      </Panel>

      <Panel style={{ padding: 14 }}>
        <SectionTitle>Comparação com o mês anterior</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Ionicons name={reportChange === null ? 'remove-circle-outline' : reportChange > 0 ? 'trending-up' : 'trending-down'} size={23} color={reportChange === null ? colors.muted : (isIncome ? reportChange < 0 : reportChange > 0) ? colors.danger : colors.success} />
          <Text style={{ color: colors.text, flex: 1 }}>
            {reportChange === null ? 'Sem ' + reportLabel + ' no mês anterior para comparar.' : `${Math.abs(reportChange).toFixed(1)}% ${reportChange > 0 ? 'a mais' : 'a menos'} em ${reportLabel}`}
          </Text>
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Mês anterior: {currency(previousTotal)}</Text>
      </Panel>

      <Panel>
        <SectionTitle>{selectedType ? 'Evolução de ' + reportLabel : 'Receitas × despesas'}</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Últimos seis meses · toque em um mês para explorar</Text>
        <View style={{ height: 140, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5, paddingTop: 10 }}>
          {history.map((item) => (
            <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={'Ver ' + monthTitle(item.key)} accessibilityState={{ selected: item.key === selectedMonth }} onPress={() => { setSelectedMonth(item.key); setSelectedCategory(null); }} style={{ flex: 1, alignItems: 'center', gap: 6, borderRadius: 10, backgroundColor: item.key === selectedMonth ? colors.surfaceLight : 'transparent' }}>
              <View style={{ height: 105, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
                {selectedType !== 'despesa' ? <View style={{ width: 10, height: `${Math.max(item.income / largestHistoryValue * 100, item.income ? 4 : 0)}%` as DimensionValue, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.success }} /> : null}
                {selectedType !== 'receita' ? <View style={{ width: 10, height: `${Math.max(item.expenses / largestHistoryValue * 100, item.expenses ? 4 : 0)}%` as DimensionValue, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: colors.danger }} /> : null}
              </View>
              <Text style={{ color: colors.muted, fontSize: 10, textTransform: 'capitalize' }}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
          {selectedType !== 'despesa' ? <Text style={{ color: colors.success, fontSize: 11 }}>● Receitas</Text> : null}
          {selectedType !== 'receita' ? <Text style={{ color: colors.danger, fontSize: 11 }}>● Despesas</Text> : null}
        </View>
      </Panel>

      <Panel>
        <SectionTitle>{isIncome ? 'Receitas por categoria' : 'Despesas por categoria'}</SectionTitle>
        <Text style={{ color: colors.muted, fontSize: 12 }}>Participação no total · toque para filtrar os lançamentos</Text>
        {reportTotal > 0 ? <View style={{ height: 16, flexDirection: 'row', borderRadius: 8, overflow: 'hidden', gap: 2 }}>
          {categoryTotals.map((item, index) => <View key={item.name} style={{ flex: item.value / reportTotal, backgroundColor: palette[index % palette.length] }} />)}
        </View> : null}
        {categoryTotals.length === 0 ? <EmptyState label={isIncome ? 'Não há receitas neste mês.' : 'Não há despesas neste mês.'} /> : categoryTotals.slice(0, showAllCategories ? undefined : 5).map((item, index) => (
          <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={'Filtrar categoria ' + item.name} accessibilityState={{ selected: selectedCategory === item.name }} onPress={() => setSelectedCategory(selectedCategory === item.name ? null : item.name)} style={{ gap: 6, padding: 10, borderRadius: 12, backgroundColor: selectedCategory === item.name ? colors.surfaceLight : 'transparent' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
              <Text numberOfLines={1} style={{ color: colors.text, flex: 1 }}>{item.name}</Text>
              <Text style={{ color: colors.muted }}>{currency(item.value)} · {(item.value / reportTotal * 100).toFixed(1).replace('.', ',')}%</Text>
            </View>
            <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.surfaceLight, overflow: 'hidden' }}>
              <View style={{ width: `${item.value / reportTotal * 100}%` as DimensionValue, height: '100%', backgroundColor: palette[index % palette.length] }} />
            </View>
          </Pressable>
        ))}
        {categoryTotals.length > 5 ? <Pressable accessibilityRole="button" onPress={() => setShowAllCategories(!showAllCategories)} style={{ padding: 10 }}><Text style={{ color: colors.primaryLight, textAlign: 'center' }}>{showAllCategories ? 'Mostrar menos' : 'Ver todas as categorias'}</Text></Pressable> : null}
      </Panel>

      <Panel>
        <SectionTitle>{isIncome ? 'Maiores receitas' : 'Maiores gastos'}</SectionTitle>
        {selectedCategory ? <Pressable accessibilityRole="button" onPress={() => setSelectedCategory(null)}><Text style={{ color: colors.primaryLight }}>{selectedCategory} · Limpar filtro</Text></Pressable> : null}
        {topTransactions.length === 0 ? <EmptyState label={isIncome ? 'Nenhuma receita para exibir.' : 'Nenhum gasto para exibir.'} /> : topTransactions.map((item, index) => <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: index === topTransactions.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
          <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.primaryLight, fontWeight: '800' }}>{index + 1}</Text></View>
          <View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>{item.descricao}</Text><Text style={{ color: colors.muted, fontSize: 11 }}>{formatDateBR(item.data)} · {item.categoria?.nome || 'Sem categoria'}{paymentLabel(item) ? ' · ' + paymentLabel(item) : ''}</Text></View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{currency(toAmount(item.valor))}</Text>
        </View>)}
      </Panel>
    </Screen>
  );
}
