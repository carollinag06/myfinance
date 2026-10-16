import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { api, Cartao, Fatura, toAmount } from '../src/api';
import { localDateISO } from '../src/date';
import { colors } from '../src/theme';
import { Field, InlineNotice, Panel, PrimaryButton, Screen } from '../src/ui';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function InvoicesScreen() {
  const [items, setItems] = useState<Fatura[]>([]);
  const [cards, setCards] = useState<Cartao[]>([]);
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState(localDateISO());
  const [cardId, setCardId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [invoices, cardList] = await Promise.all([
        api.get<Fatura[]>('/faturas'),
        api.get<Cartao[]>('/cartoes'),
      ]);
      setItems(invoices);
      setCards(cardList);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar as faturas.');
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  async function add() {
    const value = Number(amount.trim().replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
      setError('Informe um valor válido e vencimento no formato AAAA-MM-DD.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/faturas', { valor: value, vencimento: due, paga: false, cartaoId: cardId });
      setAmount('');
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar a fatura.');
    } finally {
      setLoading(false);
    }
  }

  async function togglePaid(item: Fatura) {
    try {
      await api.put('/faturas/' + item.id, { paga: !item.paga });
      setItems((current) => current.map((fatura) => fatura.id === item.id ? { ...fatura, paga: !item.paga } : fatura));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível atualizar a fatura.');
    }
  }

  function remove(item: Fatura) {
    Alert.alert('Excluir fatura', 'Deseja remover esta fatura?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/faturas/' + item.id);
          setItems((current) => current.filter((fatura) => fatura.id !== item.id));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível excluir a fatura.');
        }
      } },
    ]);
  }

  return (
    <Screen title="Faturas" subtitle="Acompanhe vencimentos e marque pagamentos.">
      <PrimaryButton label={showForm ? 'Fechar formulário' : 'Nova fatura'} icon={showForm ? 'close' : 'add'} onPress={() => setShowForm(!showForm)} />
      {showForm ? (
        <Panel>
          <Field value={amount} onChangeText={setAmount} placeholder="Valor (R$)" keyboardType="decimal-pad" />
          <Field value={due} onChangeText={setDue} placeholder="Vencimento (AAAA-MM-DD)" />
          {cards.length > 0 ? (
            <>
              <Text style={{ color: colors.text, fontWeight: '700' }}>Cartão</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pressable onPress={() => setCardId(null)} style={{ padding: 9, borderRadius: 18, backgroundColor: cardId === null ? colors.primary : colors.surfaceLight }}>
                  <Text style={{ color: colors.text }}>Sem cartão</Text>
                </Pressable>
                {cards.map((card) => (
                  <Pressable key={card.id} onPress={() => setCardId(card.id)} style={{ padding: 9, borderRadius: 18, backgroundColor: cardId === card.id ? colors.primary : colors.surfaceLight }}>
                    <Text style={{ color: colors.text }}>{card.nome}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          <PrimaryButton label="Salvar fatura" onPress={add} loading={loading} />
        </Panel>
      ) : null}
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {items.map((item) => (
        <Panel key={item.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: item.paga ? colors.successSoft : 'rgba(255,215,64,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={item.paga ? 'checkmark-circle-outline' : 'time-outline'} size={22} color={item.paga ? colors.success : colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.cartao?.nome || 'Fatura'}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>Vencimento: {item.vencimento}</Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{currency(toAmount(item.valor))}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable onPress={() => void togglePaid(item)} style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: item.paga ? colors.surfaceLight : colors.successSoft }}>
              <Ionicons name={item.paga ? 'refresh-outline' : 'checkmark-outline'} size={17} color={item.paga ? colors.muted : colors.success} />
              <Text style={{ color: item.paga ? colors.muted : colors.success, fontWeight: '700' }}>{item.paga ? 'Marcar pendente' : 'Marcar paga'}</Text>
            </Pressable>
            <Pressable onPress={() => void remove(item)} style={{ padding: 10, borderRadius: 12, backgroundColor: colors.surfaceLight }}>
              <Ionicons name="trash-outline" size={17} color={colors.muted} />
            </Pressable>
          </View>
        </Panel>
      ))}
      {items.length === 0 && !showForm ? <Panel><Text style={{ color: colors.muted, textAlign: 'center' }}>Nenhuma fatura cadastrada.</Text></Panel> : null}
    </Screen>
  );
}