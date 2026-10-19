import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, Cartao, Categoria } from '../src/api';
import { localDateISO } from '../src/date';
import { Field, InlineNotice, PrimaryButton, Screen } from '../src/ui';
import { colors } from '../src/theme';

export default function NewTransactionScreen() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [cards, setCards] = useState<Cartao[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateISO());
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [parcelada, setParcelada] = useState(false);
  const [totalParcelas, setTotalParcelas] = useState('3');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [cardId, setCardId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([
      api.get<Categoria[]>('/categorias'),
      api.get<Cartao[]>('/cartoes'),
    ]).then(([categoryList, cardList]) => {
      if (active) {
        setCategories(categoryList);
        setCards(cardList);
      }
    }).catch((e) => {
      if (active) setError(e instanceof Error ? e.message : 'Não foi possível carregar as opções.');
    });
    return () => { active = false; };
  }, []));

  async function submit() {
    setError('');
    const numericAmount = Number(amount.trim().replace(',', '.'));
    const installmentCount = Number(totalParcelas);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Informe uma descrição e um valor maior que zero.');
      return;
    }
    if (parcelada && (!Number.isInteger(installmentCount) || installmentCount < 2 || installmentCount > 48 || Math.round(numericAmount * 100) < installmentCount)) {
      setError('Escolha de 2 a 48 parcelas de pelo menos R$ 0,01 cada.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Use a data no formato AAAA-MM-DD.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        descricao: description.trim(),
        valor: numericAmount,
        tipo: type,
        data: date,
        categoriaId: categoryId,
        cartaoId: cardId,
      };
      if (parcelada) {
        await api.post('/transacoes/parceladas', { ...payload, totalParcelas: installmentCount });
      } else {
        await api.post('/transacoes', payload);
      }
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a transação.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen title="Nova transação" subtitle="Registre uma entrada ou saída.">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['despesa', 'receita'] as const).map((item) => (
          <Pressable key={item} onPress={() => { setType(item); setCategoryId(null); if (item === 'receita') setParcelada(false); }} style={{ flex: 1, padding: 13, borderRadius: 13, alignItems: 'center', backgroundColor: type === item ? (item === 'despesa' ? colors.dangerSoft : colors.successSoft) : colors.surface, borderWidth: 1, borderColor: type === item ? (item === 'despesa' ? colors.danger : colors.success) : colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item === 'despesa' ? 'Despesa' : 'Receita'}</Text>
          </Pressable>
        ))}
      </View>
      <Field value={description} onChangeText={setDescription} placeholder="Descrição" maxLength={255} />
      <Field value={amount} onChangeText={setAmount} placeholder={parcelada ? 'Valor total da compra (R$)' : 'Valor (R$)'} keyboardType="decimal-pad" />
      <Field value={date} onChangeText={setDate} placeholder="Data (AAAA-MM-DD)" />

      {type === 'despesa' ? (
        <View style={{ padding: 13, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 10 }}>
          <Pressable onPress={() => setParcelada(!parcelada)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name={parcelada ? 'checkbox' : 'square-outline'} size={22} color={colors.primaryLight} />
            <Text style={{ color: colors.text, fontWeight: '700' }}>Compra parcelada</Text>
          </Pressable>
          {parcelada ? <>
            <Field value={totalParcelas} onChangeText={setTotalParcelas} placeholder="Número de parcelas (2 a 48)" keyboardType="number-pad" />
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>Serão criados lançamentos mensais; os centavos são ajustados para fechar o valor total.</Text>
          </> : null}
        </View>
      ) : null}

      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Categoria</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.filter((item) => item.tipo === type).map((item) => (
          <Pressable key={item.id} onPress={() => setCategoryId(item.id)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: categoryId === item.id ? colors.primary : colors.surfaceLight }}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{item.nome}</Text>
          </Pressable>
        ))}
        {categories.filter((item) => item.tipo === type).length === 0 ? <Text style={{ color: colors.muted }}>Cadastre uma categoria em Mais → Categorias.</Text> : null}
      </View>

      {cards.length > 0 ? (
        <>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 3 }}>Cartão (opcional)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable onPress={() => setCardId(null)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: cardId === null ? colors.primary : colors.surfaceLight }}>
              <Text style={{ color: colors.text, fontSize: 13 }}>Sem cartão</Text>
            </Pressable>
            {cards.map((card) => (
              <Pressable key={card.id} onPress={() => setCardId(card.id)} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 20, backgroundColor: cardId === card.id ? colors.primary : colors.surfaceLight }}>
                <Text style={{ color: colors.text, fontSize: 13 }}>{card.nome}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {error ? <InlineNotice>{error}</InlineNotice> : null}
      <PrimaryButton label="Salvar transação" onPress={submit} loading={loading} />
    </Screen>
  );
}
