import { subscribeTransactions } from '../../src/transactionEvents';
import { newestCreatedFirst } from '../../src/transactions';
import { paymentLabel } from '../../src/transactions';
import { isRealized, statusLabel } from '../../src/transactions';
import { formatDateBR } from '../../src/date';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect, router } from '../../src/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Cartao, Orcamento, toAmount, Transacao } from '../../src/api';
import { EmptyState, InlineNotice, LoadingState, Panel, Screen, SectionTitle } from '../../src/ui';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateLabel = formatDateBR;

export default function Dashboard() {
  const requestVersion = useRef(0);
  const { usuario } = useAuth();
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [cards, setCards] = useState<Cartao[]>([]);
  const [budgets, setBudgets] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    const results = await Promise.allSettled([
      api.get<Transacao[]>('/transacoes'),
      api.get<Cartao[]>('/cartoes'),
      api.get<Orcamento[]>('/orcamentos'),
    ]);
    if (version !== requestVersion.current) return;
    const [tx, cardList, budgetList] = results;
    if (tx.status === 'fulfilled') setTransactions(tx.value);
    else setError(tx.reason instanceof Error ? tx.reason.message : 'Não foi possível carregar os lançamentos.');
    if (cardList.status === 'fulfilled') setCards(cardList.value);
    if (budgetList.status === 'fulfilled') setBudgets(budgetList.value);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeTransactions(() => { void load(); }), [load]);
  useEffect(() => () => { requestVersion.current += 1; }, []);

  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const current = transactions.filter((t) => t.data.slice(0, 7) === year + '-' + month);
  const income = current.filter((t) => isRealized(t) && t.tipo === 'receita').reduce((sum, t) => sum + toAmount(t.valor), 0);
  const expense = current.filter((t) => isRealized(t) && t.tipo === 'despesa').reduce((sum, t) => sum + toAmount(t.valor), 0);
  const available = transactions.filter(isRealized).reduce((sum, item) => sum + (item.tipo === 'receita' ? 1 : -1) * toAmount(item.valor), 0);
  const pendingIncome = current.filter(t => !isRealized(t) && t.tipo === 'receita').reduce((sum,t) => sum + toAmount(t.valor), 0);
  const pendingExpenses = current.filter(t => !isRealized(t) && t.tipo === 'despesa').reduce((sum,t) => sum + toAmount(t.valor), 0);
  const recent = [...transactions].sort(newestCreatedFirst).slice(0, 4);

  if (loading && transactions.length === 0) return <Screen><LoadingState /></Screen>;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Olá,</Text>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{usuario?.nome?.split(' ')[0] || 'bem-vinda'}</Text>
        </View>
        <Pressable onPress={() => router.push('/perfil')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceLight, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person-outline" size={21} color={colors.primaryLight} />
        </Pressable>
      </View>

      {error ? <InlineNotice>{error}</InlineNotice> : null}

      <Panel style={{ backgroundColor: colors.primary, borderColor: colors.primary }}>
        <Text style={{ color: '#E7D3FF', fontSize: 14 }}>Saldo disponível</Text>
        <Text style={{ color: colors.text, fontSize: 31, fontWeight: '800', marginTop: 4 }}>{currency(available)}</Text>
        <Text style={{ color: '#E7D3FF', fontSize: 12, marginTop: 3 }}>{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
        <Pressable onPress={() => router.push('/nova-transacao')} style={{ position: 'absolute', right: 16, bottom: 17, padding: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)' }}>
          <Ionicons name="add" size={23} color={colors.text} />
        </Pressable>
      </Panel>

      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Panel style={{ flex: 1, padding: 14 }}>
          <Ionicons name="arrow-down-circle-outline" size={23} color={colors.success} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Receitas</Text>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 3 }}>{currency(income)}</Text>
        </Panel>
        <Panel style={{ flex: 1, padding: 14 }}>
          <Ionicons name="arrow-up-circle-outline" size={23} color={colors.danger} />
          <Text style={{ color: colors.muted, fontSize: 12, marginTop: 6 }}>Despesas</Text>
          <Text numberOfLines={1} style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 3 }}>{currency(expense)}</Text>
        </Panel>
      </View>

      <Panel>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Previsto para este mês</Text>
        <Text style={{ color: colors.muted, fontSize: 12 }}>A receber: {currency(pendingIncome)} · A pagar: {currency(pendingExpenses)}</Text>
        <Text style={{ color: colors.muted, fontSize: 11 }}>O saldo disponível considera somente receitas recebidas e despesas pagas até hoje.</Text>
      </Panel>

      <SectionTitle action={<Pressable onPress={() => router.push('/transacoes')}><Text style={{ color: colors.primaryLight }}>Ver todas</Text></Pressable>}>Lançamentos recentes</SectionTitle>
      <Panel>
        {recent.length === 0 ? <EmptyState label="Seus lançamentos aparecerão aqui." /> : recent.map((item) => (
          <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 6 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.tipo === 'receita' ? colors.successSoft : colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.tipo === 'receita' ? 'arrow-down' : 'arrow-up'} size={18} color={item.tipo === 'receita' ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '600' }}>{item.descricao}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.categoria?.nome || 'Sem categoria'} · {dateLabel(item.data)}{paymentLabel(item) ? ' · ' + paymentLabel(item) : ''} · {statusLabel(item)}</Text>
            </View>
            <Text style={{ color: item.tipo === 'receita' ? colors.success : colors.text, fontWeight: '700' }}>
              {item.tipo === 'despesa' ? '- ' : '+ '}{currency(toAmount(item.valor))}
            </Text>
          </View>
        ))}
      </Panel>

      <SectionTitle>Visão geral</SectionTitle>
      <View style={{ flexDirection: 'row', gap: 11 }}>
        <Pressable onPress={() => router.push('/cartoes')} style={{ flex: 1 }}>
          <Panel style={{ alignItems: 'center' }}>
            <Ionicons name="card-outline" size={24} color={colors.primaryLight} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 5 }}>{cards.length}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Cartões</Text>
          </Panel>
        </Pressable>
        <Pressable onPress={() => router.push('/orcamentos')} style={{ flex: 1 }}>
          <Panel style={{ alignItems: 'center' }}>
            <Ionicons name="pie-chart-outline" size={24} color={colors.warning} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 5 }}>{budgets.length}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Orçamentos</Text>
          </Panel>
        </Pressable>
      </View>
      <Pressable onPress={() => router.push('/analises')}>
        <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 }}>
          <Ionicons name="stats-chart-outline" size={22} color={colors.primaryLight} />
          <Text style={{ color: colors.text, flex: 1, fontWeight: '700' }}>Ver análises mensais</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Panel>
      </Pressable>
    </Screen>
  );
}
