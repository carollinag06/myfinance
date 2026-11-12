import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Cartao, toAmount } from '../../src/api';
import { EmptyState, InlineNotice, LoadingState, Panel, PrimaryButton, Screen } from '../../src/ui';
import { colors } from '../../src/theme';

const currency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function CardsScreen() {
  const [cards, setCards] = useState<Cartao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCards(await api.get<Cartao[]>('/cartoes'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar os cartões.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <Screen title="Meus cartões" subtitle="Gerencie os cartões usados nos seus lançamentos.">
      <PrimaryButton label="Adicionar cartão" icon="add" onPress={() => router.push('/novo-cartao')} />
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      {loading && cards.length === 0 ? <LoadingState /> : null}
      {!loading && cards.length === 0 ? <Panel><EmptyState label="Nenhum cartão cadastrado." /></Panel> : null}
      {cards.map((card) => (
        <Pressable key={card.id} onPress={() => router.push('/novo-cartao?id=' + card.id)}>
          <Panel style={{ backgroundColor: '#25153A' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(164,80,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="card-outline" size={22} color={colors.primaryLight} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{card.nome}</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Limite disponível cadastrado</Text>
            <Text style={{ color: colors.text, fontSize: 23, fontWeight: '800' }}>{currency(toAmount(card.limite))}</Text>
            {card.vencimento ? <Text style={{ color: '#D5B4FF', fontSize: 12 }}>Vencimento dia {card.vencimento}</Text> : null}
          </Panel>
        </Pressable>
      ))}
    </Screen>
  );
}