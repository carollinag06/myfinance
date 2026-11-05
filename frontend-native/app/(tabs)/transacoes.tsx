import { newestDateFirst } from '../../src/transactions';
import { paymentLabel } from '../../src/transactions';
import { confirmAction, showSuccess } from '../../src/feedback';
import { transactionStatus, statusLabel } from '../../src/transactions';
import { localDateISO } from '../../src/date';
import { formatDateBR } from '../../src/date';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect, router } from '../../src/navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { api, Categoria, Transacao, toAmount } from '../../src/api';
import { EmptyState, Field, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../../src/ui';
import { colors } from '../../src/theme';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateLabel = formatDateBR;
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'previsto' | 'realizado'>('todos');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'despesa' | 'receita'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<number[]>([]);
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
      setTransactions([...result].sort(newestDateFirst));
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
      const matchesCategory = categoryFilter.length === 0 || (item.categoriaId != null && categoryFilter.includes(item.categoriaId));
      const matchesMonth = allMonths || item.data.slice(0, 7) === selectedMonth;
      return matchesQuery && matchesType && matchesCategory && matchesMonth && (statusFilter === 'todos' || transactionStatus(item) === statusFilter);
    });
  }, [transactions, query, typeFilter, categoryFilter, allMonths, selectedMonth, statusFilter]);

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

  const activeFilterCount = Number(statusFilter !== 'todos') + Number(typeFilter !== 'todos') + Number(categoryFilter.length > 0) + Number(allMonths || selectedMonth !== monthKey(new Date()));
  const filterSummary = [allMonths ? 'Todos os períodos' : monthLabel, typeFilter === 'receita' ? 'Receitas' : typeFilter === 'despesa' ? 'Despesas' : null, categoryFilter.length > 1 ? categoryFilter.length + ' categorias' : categories.find(category => categoryFilter.includes(category.id))?.nome, statusFilter === 'todos' ? null : statusFilter === 'previsto' ? 'Previstos' : 'Realizados'].filter(Boolean).join(' · ');

  async function removeOne(item: Transacao) {
    await api.delete('/transacoes/' + item.id);
    setTransactions(current => current.filter(transaction => transaction.id !== item.id));
    showSuccess('Lançamento excluído.');
  }
  async function removeGroup(item: Transacao) {
    await api.delete('/transacoes/grupos/' + item.grupoParcelamento);
    setTransactions(current => current.filter(transaction => transaction.grupoParcelamento !== item.grupoParcelamento));
    showSuccess('Compra parcelada excluída.');
  }
  function confirmRemove(item: Transacao) {
    confirmAction('Excluir lançamento', item.grupoParcelamento
      ? 'Escolha se deseja excluir apenas esta parcela de “' + item.descricao + '” ou toda a compra. Esta ação não pode ser desfeita.'
      : 'Deseja excluir “' + item.descricao + '”? Esta ação não pode ser desfeita.', [
        { label: item.grupoParcelamento ? 'Só esta parcela' : 'Excluir', destructive: true, run: () => removeOne(item) },
        ...(item.grupoParcelamento ? [{ label: 'Toda a compra', destructive: true, run: () => removeGroup(item) }] : []),
      ]);
  }
  async function changeStatus(item: Transacao) {
    if (busyId !== null) return;
    setBusyId(item.id); setError('');
    try {
      const status: Transacao['status'] = transactionStatus(item) === 'previsto' ? 'realizado' : 'previsto';
      const data = status === 'realizado' && item.data > localDateISO() ? localDateISO() : item.data;
      await api.put('/transacoes/' + item.id, { status, data });
      setTransactions(current => current.map(transaction => transaction.id === item.id ? { ...transaction, status, data } : transaction).sort(newestDateFirst));
      showSuccess(status === 'previsto' ? 'Lançamento marcado como previsto.' : item.tipo === 'receita' ? 'Receita recebida.' : 'Despesa paga.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível atualizar a situação.'); }
    finally { setBusyId(null); }
  }
  function toggleStatus(item: Transacao) {
    if (transactionStatus(item) === 'previsto' && item.data > localDateISO()) {
      confirmAction('Confirmar antecipação', 'Ao confirmar, a data do lançamento será alterada para hoje e o valor entrará no saldo disponível.', [{ label: item.tipo === 'receita' ? 'Confirmar recebimento' : 'Confirmar pagamento', run: () => changeStatus(item) }]);
    } else { void changeStatus(item); }
  }

  return (
    <Screen title="Extrato">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Field style={{ flex: 1 }} value={query} onChangeText={setQuery} placeholder="Buscar descrição ou categoria" accessibilityLabel="Buscar no extrato" />
        <Pressable accessibilityRole="button" accessibilityLabel="Filtros" accessibilityState={{ expanded: filtersOpen }} onPress={() => setFiltersOpen(!filtersOpen)} style={{ minHeight: 48, paddingHorizontal: 14, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: filtersOpen || activeFilterCount ? colors.primary : colors.surfaceLight, borderWidth: 1, borderColor: filtersOpen || activeFilterCount ? colors.primaryLight : colors.border }}>
          <Ionicons name="options-outline" size={20} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>Filtros{activeFilterCount ? ' (' + activeFilterCount + ')' : ''}</Text>
        </Pressable>
      </View>
      {!filtersOpen ? <Text style={{ color: colors.muted, fontSize: 12, textTransform: 'capitalize' }}>{filterSummary} · {visibleTransactions.length} lançamentos</Text> : null}
      {filtersOpen ? <Panel>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Filtrar extrato</Text>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Tipo de movimentação</Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([
          ['todos', 'Tudo'],
          ['despesa', 'Despesas'],
          ['receita', 'Receitas'],
        ] as const).map(([value, label]) => (
          <Pressable key={value} onPress={() => { setTypeFilter(value); setCategoryFilter([]); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 13, alignItems: 'center', backgroundColor: typeFilter === value ? colors.primary : colors.surfaceLight }}>
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

      <Text style={{ color: colors.muted, fontSize: 12 }}>Situação</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>{(['todos', 'previsto', 'realizado'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: statusFilter === value }} onPress={() => setStatusFilter(value)} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: statusFilter === value ? colors.primary : colors.surfaceLight }}><Text style={{ color: colors.text }}>{value === 'todos' ? 'Todas' : value === 'previsto' ? 'Previstos' : 'Realizados'}</Text></Pressable>)}</View>
      <Text style={{ color: colors.muted, fontSize: 12 }}>Categorias · selecione uma ou mais</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Todas categorias" accessibilityState={{ selected: categoryFilter.length === 0 }} onPress={() => setCategoryFilter([])} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: categoryFilter.length === 0 ? colors.primary : colors.surfaceLight }}>
          <Text style={{ color: colors.text, fontSize: 12 }}>Todas categorias</Text>
        </Pressable>
        {categories.filter(category => typeFilter === 'todos' || category.tipo === typeFilter).map((category) => (
          <Pressable key={category.id} accessibilityRole="checkbox" accessibilityLabel={category.nome} accessibilityState={{ checked: categoryFilter.includes(category.id) }} onPress={() => setCategoryFilter(current => current.includes(category.id) ? current.filter(id => id !== category.id) : [...current, category.id])} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: categoryFilter.includes(category.id) ? colors.primary : colors.surfaceLight }}>
            <Text style={{ color: colors.text, fontSize: 12 }}>{categoryFilter.includes(category.id) ? '✓ ' : ''}{category.nome}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Pressable onPress={() => { setStatusFilter('todos'); setQuery(''); setTypeFilter('todos'); setCategoryFilter([]); setSelectedMonth(monthKey(new Date())); setAllMonths(false); }} accessibilityRole="button" style={{ alignSelf: 'flex-end', padding: 10 }}>
        <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '700' }}>Limpar filtros</Text>
      </Pressable>

      <PrimaryButton label="Ver resultados" icon="checkmark" onPress={() => setFiltersOpen(false)} />
      </Panel> : null}

      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {loading && transactions.length === 0 ? <LoadingState /> : null}
      {!loading && !error && visibleTransactions.length === 0 ? <Panel><EmptyState label={transactions.length ? 'Nenhum lançamento corresponde a esses filtros.' : 'Ainda não há lançamentos.'} /></Panel> : null}
      {visibleTransactions.map((item) => (
        <Panel key={item.id} style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.tipo === 'receita' ? colors.successSoft : colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.tipo === 'receita' ? 'arrow-down' : 'arrow-up'} size={18} color={item.tipo === 'receita' ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.descricao}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.categoria?.nome || 'Sem categoria'} · {dateLabel(item.data)}{paymentLabel(item) ? ' · ' + paymentLabel(item) : ''}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={transactionStatus(item) === 'realizado' ? 'Marcar como previsto' : item.tipo === 'receita' ? 'Marcar como recebida' : 'Marcar como paga'} disabled={busyId !== null} onPress={() => toggleStatus(item)} style={{ minHeight: 36, marginTop: 4, flexDirection: 'row', gap: 5, alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, borderRadius: 8, backgroundColor: transactionStatus(item) === 'previsto' ? 'rgba(255,215,64,0.10)' : colors.successSoft, opacity: busyId !== null ? 0.5 : 1 }}>
                <Text style={{ color: transactionStatus(item) === 'previsto' ? colors.warning : colors.success, fontSize: 11, fontWeight: '600' }}>{busyId === item.id ? 'Atualizando...' : statusLabel(item)}</Text>
                <Ionicons name={transactionStatus(item) === 'previsto' ? 'checkmark-circle-outline' : 'refresh-outline'} size={14} color={transactionStatus(item) === 'previsto' ? colors.warning : colors.success} />
              </Pressable>
              {item.grupoParcelamento ? <Text style={{ color: colors.primaryLight, fontSize: 11, marginTop: 3 }}>Parcela {item.numeroParcela}/{item.totalParcelas}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end', gap: 7 }}>
              <Text style={{ color: item.tipo === 'receita' ? colors.success : colors.text, fontWeight: '700' }}>
                {item.tipo === 'despesa' ? '- ' : '+ '}{currency(toAmount(item.valor))}
              </Text>
              <View style={{ flexDirection: 'row', gap: 14 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={'Editar ' + item.descricao} disabled={busyId !== null} onPress={() => router.push('/nova-transacao?id=' + item.id)} hitSlop={8}><Ionicons name="create-outline" size={18} color={colors.primaryLight} /></Pressable>
              <Pressable accessibilityRole="button" disabled={busyId !== null} accessibilityLabel="Excluir lançamento" onPress={() => confirmRemove(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
              </View>
            </View>
          </View>

        </Panel>
      ))}
    </Screen>
  );
}
