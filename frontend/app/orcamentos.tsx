import { confirmAction, showSuccess } from '../src/feedback';
import { isRealized } from '../src/transactions';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View, type DimensionValue } from 'react-native';
import { api, Categoria, Orcamento, toAmount, Transacao } from '../src/api';
import { colors } from '../src/theme';
import { Field, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../src/ui';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function BudgetsScreen() {
  const now = new Date();
  const [fetching, setFetching] = useState(true);
  const [items, setItems] = useState<Orcamento[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setFetching(true);
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
    } finally { setFetching(false); }

  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const viewMonthKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}`;
  const monthlyBudgets = items.filter((item) => item.ano === viewYear && item.mes === viewMonth);
  const monthlyExpenses = transactions.filter((item) => isRealized(item) && item.tipo === 'despesa' && item.data.slice(0, 7) === viewMonthKey);
  const spendForBudget = (item: Orcamento) => monthlyExpenses
    .filter((transaction) => !item.categoriaId || transaction.categoriaId === item.categoriaId)
    .reduce((sum, transaction) => sum + toAmount(transaction.valor), 0);
  const totalBudgeted = monthlyBudgets.reduce((sum, item) => sum + toAmount(item.valor), 0);
  const hasAllCategoryBudget = monthlyBudgets.some((item) => !item.categoriaId);
  const coveredCategoryIds = [...new Set(monthlyBudgets.map((item) => item.categoriaId).filter((id): id is number => Boolean(id)))];
  const totalBudgetedSpend = hasAllCategoryBudget
    ? monthlyExpenses.reduce((sum, item) => sum + toAmount(item.valor), 0)
    : coveredCategoryIds.reduce((sum, id) => {
        const budget = monthlyBudgets.find((item) => item.categoriaId === id);
        return sum + (budget ? spendForBudget(budget) : 0);
      }, 0);
  const daysRemaining = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear()
    ? Math.max(new Date(viewYear, viewMonth, 0).getDate() - now.getDate() + 1, 1)
    : 0;
  const dailyAllowance = daysRemaining > 0 && totalBudgeted > 0
    ? Math.max(totalBudgeted - totalBudgetedSpend, 0) / daysRemaining
    : 0;
  const budgetedCategories = new Set(monthlyBudgets.filter((item) => item.categoriaId).map((item) => item.categoriaId));
  const suggestions = (hasAllCategoryBudget ? [] : monthlyExpenses).reduce<Array<{ id: number; name: string; value: number }>>((result, transaction) => {
    if (transaction.categoriaId && !budgetedCategories.has(transaction.categoriaId)) {
      const category = categories.find((item) => item.id === transaction.categoriaId);
      const existing = result.find((item) => item.id === transaction.categoriaId);
      if (existing) existing.value += toAmount(transaction.valor);
      else result.push({ id: transaction.categoriaId, name: category?.nome || transaction.categoria?.nome || 'Categoria', value: toAmount(transaction.valor) });
    }
    return result;
  }, []).sort((a, b) => b.value - a.value).slice(0, 3);

  function moveViewMonth(offset: number) {
    const next = new Date(viewYear, viewMonth - 1 + offset, 1);
    setViewMonth(next.getMonth() + 1);
    setViewYear(next.getFullYear());
  }

  async function add() {
    if (loading) return;
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
      showSuccess('Orçamento cadastrado.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o orçamento.');
    } finally {
      setLoading(false);
    }
  }

  function remove(item: Orcamento) {
    confirmAction('Excluir orçamento', 'Deseja excluir este registro? Esta ação não pode ser desfeita.', [{
      label: 'Excluir', destructive: true, run: async () => {
        await api.delete('/orcamentos/' + item.id);
        setItems(current => current.filter(budget => budget.id !== item.id));
        showSuccess('Orçamento excluído.');
      },
    }]);
  }

  return (
    <Screen title="Metas e orçamentos" subtitle="Acompanhe limites mensais por categoria.">
      <PrimaryButton disabled={loading} label={showForm ? 'Fechar formulário' : 'Nova meta'} icon={showForm ? 'close' : 'add'} onPress={() => {
        if (!showForm) {
          setMonth(String(viewMonth));
          setYear(String(viewYear));
        }
        setShowForm(!showForm);
      }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable accessibilityLabel="Mês anterior" onPress={() => moveViewMonth(-1)} hitSlop={8}><Ionicons name="chevron-back" size={22} color={colors.primaryLight} /></Pressable>
        <Text style={{ color: colors.text, fontWeight: '700', textTransform: 'capitalize' }}>{new Date(viewYear, viewMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
        <Pressable accessibilityLabel="Próximo mês" onPress={() => moveViewMonth(1)} hitSlop={8}><Ionicons name="chevron-forward" size={22} color={colors.primaryLight} /></Pressable>
      </View>
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
            {categories.filter((category) => category.tipo === 'despesa').map((category) => (
              <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={{ padding: 9, borderRadius: 18, backgroundColor: categoryId === category.id ? colors.primary : colors.surfaceLight }}>
                <Text style={{ color: colors.text }}>{category.nome}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton label="Salvar orçamento" onPress={add} loading={loading} />
        </Panel>
      ) : null}
      {fetching ? <LoadingState label="Carregando..." /> : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {monthlyBudgets.length > 0 ? (
        <Panel style={{ backgroundColor: 'rgba(138,43,226,0.12)' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View><Text style={{ color: colors.muted, fontSize: 12 }}>Total de metas</Text><Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>{currency(totalBudgeted)}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ color: colors.muted, fontSize: 12 }}>Gasto realizado</Text><Text style={{ color: totalBudgetedSpend > totalBudgeted ? colors.danger : colors.text, fontSize: 19, fontWeight: '800' }}>{currency(totalBudgetedSpend)}</Text></View>
          </View>
          {dailyAllowance > 0 ? <Text style={{ color: colors.primaryLight, fontSize: 12 }}>Para manter as metas, restam cerca de {currency(dailyAllowance)} por dia neste mês.</Text> : null}
        </Panel>
      ) : null}
      {suggestions.length > 0 ? (
        <Panel>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Sugestões de metas</Text>
          {suggestions.map((item) => (
            <Pressable key={item.id} onPress={() => { setCategoryId(item.id); setMonth(String(viewMonth)); setYear(String(viewYear)); setShowForm(true); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
              <Ionicons name="bulb-outline" size={19} color={colors.warning} />
              <Text style={{ color: colors.text, flex: 1 }}>Criar meta para {item.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{currency(item.value)}</Text>
            </Pressable>
          ))}
        </Panel>
      ) : null}
      {monthlyBudgets.map((item) => {
        const spent = spendForBudget(item);
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{currency(spent)} de {currency(limit)}</Text>
              <Text style={{ color: progress >= 1 ? colors.danger : colors.muted, fontSize: 12, fontWeight: '700' }}>{Math.round(progress * 100)}%</Text>
            </View>
          </Panel>
        );
      })}
      {!fetching && !error && monthlyBudgets.length === 0 && !showForm ? <Panel><Text style={{ color: colors.muted, textAlign: 'center' }}>Nenhuma meta cadastrada para este mês.</Text></Panel> : null}
    </Screen>
  );
}
