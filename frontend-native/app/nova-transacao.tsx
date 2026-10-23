import { showSuccess } from '../src/feedback';
import { transactionStatus } from '../src/transactions';
import { DateField } from '../src/DateField';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { useFocusEffect, useLocalSearchParams, router } from '../src/navigation';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { api, Cartao, Categoria, Transacao, toAmount } from '../src/api';
import { localDateISO } from '../src/date';
import { Field, InlineNotice, PrimaryButton, Screen, LoadingState } from '../src/ui';
import { colors } from '../src/theme';

function categoryIcon(name: string, type: string): React.ComponentProps<typeof Ionicons>['name'] {
  const icons: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
    alimentacao: 'restaurant-outline', transporte: 'bus-outline', moradia: 'home-outline',
    saude: 'medkit-outline', lazer: 'game-controller-outline', educacao: 'school-outline',
    salario: 'briefcase-outline', freelance: 'laptop-outline', investimento: 'trending-up-outline',
    presente: 'gift-outline', outros: 'ellipsis-horizontal-circle-outline',
  };
  const key = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return icons[key] || (type === 'receita' ? 'wallet-outline' : 'pricetag-outline');
}

export default function NewTransactionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [status, setStatus] = useState<'previsto' | 'realizado'>('realizado');
  const [editingInstallment, setEditingInstallment] = useState(false);
  const [formLoading, setFormLoading] = useState(!!id);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [cards, setCards] = useState<Cartao[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(localDateISO());
  const [type, setType] = useState<'despesa' | 'receita'>('despesa');
  const [parcelada, setParcelada] = useState(false);
  const [totalParcelas, setTotalParcelas] = useState('3');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'a_vista' | 'cartao'>('a_vista');
  const [cardId, setCardId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setFormLoading(!!id); setLoadFailed(false); setError('');
    Promise.all([
      api.get<Categoria[]>('/categorias'),
      api.get<Cartao[]>('/cartoes'),
      id ? api.get<Transacao>('/transacoes/' + id) : Promise.resolve(null),
    ]).then(([categoryList, cardList, transaction]) => {
      if (active) {
        setCategories(categoryList);
        setCards(cardList);
        if (transaction) {
          setDescription(transaction.descricao); setAmount(String(toAmount(transaction.valor)));
          setDate(transaction.data); setType(transaction.tipo); setStatus(transactionStatus(transaction));
          setCategoryId(transaction.categoriaId ?? null); setCardId(transaction.cartaoId ?? null);
          setPaymentMethod(transaction.formaPagamento || (transaction.cartaoId != null ? 'cartao' : 'a_vista'));
          setEditingInstallment(!!transaction.grupoParcelamento);
        }
        setFormLoading(false);
      }
    }).catch((e) => {
      if (active) { setLoadFailed(true); setFormLoading(false); setError(e instanceof Error ? e.message : 'Não foi possível carregar as opções.'); }
    });
    return () => { active = false; };
  }, [id, loadVersion]));

  async function submit() {
    if (loading || formLoading || loadFailed) return;
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
      setError('Selecione uma data no calendário.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        descricao: description.trim(),
        valor: numericAmount,
        tipo: type,
        data: date,
        status,
        categoriaId: categoryId,
        cartaoId: type === 'despesa' && paymentMethod === 'cartao' ? cardId : null,
        formaPagamento: type === 'despesa' ? paymentMethod : null,
      };
      if (id) {
        await api.put('/transacoes/' + id, payload);
      } else if (parcelada) {
        await api.post('/transacoes/parceladas', { ...payload, totalParcelas: installmentCount });
      } else {
        await api.post('/transacoes', payload);
      }
      showSuccess(id ? 'Transação atualizada.' : parcelada ? 'Parcelas cadastradas.' : 'Transação cadastrada.');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar a transação.');
    } finally {
      setLoading(false);
    }
  }

  if (formLoading) return <Screen title="Editar transação"><LoadingState label="Carregando transação..." /></Screen>;
  if (loadFailed) return <Screen title={id ? 'Editar transação' : 'Nova transação'}><InlineNotice>{error}</InlineNotice><PrimaryButton label="Tentar novamente" onPress={() => setLoadVersion(value => value + 1)} /></Screen>;

  return (
    <Screen title={id ? 'Editar transação' : 'Nova transação'} subtitle="Registre uma entrada ou saída.">
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(['despesa', 'receita'] as const).map((item) => (
          <Pressable key={item} disabled={editingInstallment && item === 'receita'} onPress={() => { setType(item); setCategoryId(null); if (item === 'receita') { setParcelada(false); setCardId(null); setPaymentMethod('a_vista'); } }} style={{ flex: 1, padding: 13, borderRadius: 13, alignItems: 'center', backgroundColor: type === item ? (item === 'despesa' ? colors.dangerSoft : colors.successSoft) : colors.surface, borderWidth: 1, borderColor: type === item ? (item === 'despesa' ? colors.danger : colors.success) : colors.border }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{item === 'despesa' ? 'Despesa' : 'Receita'}</Text>
          </Pressable>
        ))}
      </View>
      <Field value={description} onChangeText={setDescription} placeholder="Descrição" maxLength={255} />
      <Field value={amount} onChangeText={setAmount} placeholder={parcelada ? 'Valor total da compra (R$)' : 'Valor (R$)'} keyboardType="decimal-pad" />
      <DateField value={date} onChange={value => { setDate(value); if (value > localDateISO()) setStatus('previsto'); }} label="Data" />
      {type === 'despesa' && !id ? (
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

      <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 15, paddingVertical: 12, gap: 9 }}>
        <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ gap: 4, flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Categoria</Text>
          </View>
          <Ionicons name="pricetags-outline" size={22} color={colors.primaryLight} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 4, gap: 8 }}>
          {[{ id: null, nome: 'Sem categoria', tipo: type }, ...categories.filter(item => item.tipo === type)].map(item => {
            const selected = categoryId === item.id;
            return <Pressable
              key={item.id ?? 'none'}
              accessibilityRole="radio"
              accessibilityLabel={item.nome}
              accessibilityState={{ checked: selected }}
              onPress={() => setCategoryId(item.id)}
              style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1, borderColor: selected ? colors.primaryLight : colors.border, backgroundColor: selected ? 'rgba(138,43,226,0.18)' : colors.surfaceLight, opacity: pressed ? 0.75 : 1 })}
            >
              <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={item.id === null ? 'remove-outline' : categoryIcon(item.nome, item.tipo)} size={18} color={selected ? colors.text : colors.primaryLight} />
              </View>
              <Text numberOfLines={1} style={{ color: selected ? colors.text : '#CCCCCC', fontSize: 12, fontWeight: selected ? '700' : '500', textAlign: 'center' }}>{item.nome}</Text>
              {selected ? <Ionicons name="checkmark" size={15} color={colors.primaryLight} /> : null}
            </Pressable>;
          })}
        </ScrollView>
        {categories.filter(item => item.tipo === type).length === 0 ? <Text style={{ paddingHorizontal: 16, color: colors.muted, fontSize: 11 }}>Cadastre uma categoria em Mais → Categorias.</Text> : null}
      </View>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>{parcelada ? 'Situação da primeira parcela' : 'Situação'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['previsto', 'realizado'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={value === 'previsto' ? 'Previsto' : type === 'receita' ? 'Recebida' : 'Paga'} accessibilityState={{ checked: status === value, disabled: value === 'realizado' && date > localDateISO() }} disabled={value === 'realizado' && date > localDateISO()} hitSlop={{ top: 6, bottom: 6 }} onPress={() => setStatus(value)} style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: status === value ? colors.primary : colors.surfaceLight, opacity: value === 'realizado' && date > localDateISO() ? 0.45 : 1 }}><Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{value === 'previsto' ? 'Previsto' : type === 'receita' ? 'Recebida' : 'Paga'}</Text></Pressable>)}
        </View>
        {date > localDateISO() ? <Text style={{ color: colors.muted, fontSize: 13 }}>Datas futuras ficam previstas e não alteram o saldo disponível.</Text> : null}
        {editingInstallment ? <InlineNotice tone="info">Você está editando apenas esta parcela; as demais permanecem como estão.</InlineNotice> : null}
      </View>

      {type === 'despesa' ? <View style={{ gap: 10 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>Forma de pagamento</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['a_vista', 'cartao'] as const).map(method => <Pressable key={method} accessibilityRole="radio" accessibilityLabel={method === 'a_vista' ? 'À vista' : 'Cartão'} accessibilityState={{ checked: paymentMethod === method }} onPress={() => { setPaymentMethod(method); if (method === 'a_vista') setCardId(null); }} style={{ flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: paymentMethod === method ? colors.primaryLight : colors.border, backgroundColor: paymentMethod === method ? 'rgba(138,43,226,0.18)' : colors.surface }}>
            <Ionicons name={method === 'a_vista' ? 'cash-outline' : 'card-outline'} size={19} color={paymentMethod === method ? colors.primaryLight : colors.muted} />
            <Text style={{ color: colors.text, fontWeight: '600' }}>{method === 'a_vista' ? 'À vista' : 'Cartão'}</Text>
          </Pressable>)}
        </View>
        {paymentMethod === 'cartao' ? <>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Vincular cartão (opcional)</Text>
          {cards.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable accessibilityRole="radio" accessibilityLabel="Sem vínculo com cartão" accessibilityState={{ checked: cardId === null }} onPress={() => setCardId(null)} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, backgroundColor: cardId === null ? colors.primary : colors.surfaceLight }}><Text style={{ color: colors.text, fontSize: 13 }}>Não informar</Text></Pressable>
            {cards.map(card => <Pressable key={card.id} accessibilityRole="radio" accessibilityLabel={'Usar cartão ' + card.nome} accessibilityState={{ checked: cardId === card.id }} onPress={() => setCardId(card.id)} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: cardId === card.id ? colors.primary : colors.surfaceLight }}>
              <Text style={{ color: colors.text, fontSize: 13 }}>{card.nome}</Text>
              {cardId === card.id ? <Ionicons name="checkmark" size={15} color={colors.text} /> : null}
            </Pressable>)}
          </View> : <Text style={{ color: colors.muted, fontSize: 12 }}>Você pode salvar como cartão sem cadastrar um.</Text>}
          <Pressable accessibilityRole="button" onPress={() => router.push('/novo-cartao')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}><Text style={{ color: colors.primaryLight, fontWeight: '600' }}>Cadastrar cartão</Text></Pressable>
        </> : null}
      </View> : null}

      {error ? <InlineNotice>{error}</InlineNotice> : null}
      <PrimaryButton label={id ? 'Salvar alterações' : 'Salvar transação'} onPress={submit} loading={loading} />
    </Screen>
  );
}
