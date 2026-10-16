import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api, Transacao, toAmount } from '../../src/api';
import { EmptyState, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../../src/ui';
import { colors } from '../../src/theme';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const dateLabel = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return Number.isFinite(day) ? new Date(year, month - 1, day).toLocaleDateString('pt-BR') : value;
};

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Transacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<Transacao[]>('/transacoes');
      setTransactions([...result].sort((a, b) => b.data.localeCompare(a.data)));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o extrato.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  function remove(item: Transacao) {
    Alert.alert('Excluir lançamento', 'Deseja remover “' + item.descricao + '”?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/transacoes/' + item.id);
          setTransactions((current) => current.filter((t) => t.id !== item.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível excluir.');
        }
      } },
    ]);
  }

  return (
    <Screen title="Extrato" subtitle="Acompanhe suas receitas e despesas.">
      <PrimaryButton label="Nova transação" icon="add" onPress={() => router.push('/nova-transacao')} />
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {loading && transactions.length === 0 ? <LoadingState /> : null}
      {!loading && transactions.length === 0 ? <Panel><EmptyState label="Ainda não há lançamentos." /></Panel> : null}
      {transactions.map((item) => (
        <Panel key={item.id} style={{ padding: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: item.tipo === 'receita' ? colors.successSoft : colors.dangerSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.tipo === 'receita' ? 'arrow-down' : 'arrow-up'} size={18} color={item.tipo === 'receita' ? colors.success : colors.danger} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.descricao}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.categoria?.nome || 'Sem categoria'} · {dateLabel(item.data)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 7 }}>
              <Text style={{ color: item.tipo === 'receita' ? colors.success : colors.text, fontWeight: '700' }}>
                {item.tipo === 'despesa' ? '- ' : '+ '}{currency(toAmount(item.valor))}
              </Text>
              <Pressable accessibilityLabel="Excluir transação" onPress={() => remove(item)} hitSlop={8}>
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
            </View>
          </View>
        </Panel>
      ))}
    </Screen>
  );
}