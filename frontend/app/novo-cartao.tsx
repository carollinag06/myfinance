import { useLocalSearchParams, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { api, Cartao, toAmount } from '../src/api';
import { Field, InlineNotice, PrimaryButton, Screen } from '../src/ui';

export default function NewCardScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<Cartao[]>('/cartoes')
      .then((items) => {
        const card = items.find((item) => String(item.id) === String(id));
        if (!card) {
          setError('Cartão não encontrado.');
          return;
        }
        setName(card.nome);
        setLimit(String(toAmount(card.limite)));
        setDueDay(card.vencimento ? String(card.vencimento) : '');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Não foi possível carregar o cartão.'));
  }, [id]);

  async function save() {
    setError('');
    const value = Number(limit.trim().replace(',', '.'));
    const day = dueDay.trim() ? Number(dueDay) : null;
    if (!name.trim() || !Number.isFinite(value) || value < 0) {
      setError('Informe o nome e um limite válido.');
      return;
    }
    if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) {
      setError('O vencimento deve ser um dia entre 1 e 31.');
      return;
    }

    setLoading(true);
    try {
      const body = { nome: name.trim(), limite: value, vencimento: day };
      if (id) await api.put('/cartoes/' + id, body);
      else await api.post('/cartoes', body);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar o cartão.');
    } finally {
      setLoading(false);
    }
  }

  function remove() {
    if (!id) return;
    Alert.alert('Excluir cartão', 'Os lançamentos associados continuarão registrados.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/cartoes/' + id);
          router.back();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Não foi possível excluir o cartão.');
        }
      } },
    ]);
  }

  return (
    <Screen title={id ? 'Editar cartão' : 'Novo cartão'} subtitle="Cadastre o apelido, limite e vencimento. Não informe o número completo do cartão.">
      <Field value={name} onChangeText={setName} placeholder="Nome do cartão" maxLength={100} />
      <Field value={limit} onChangeText={setLimit} placeholder="Limite (R$)" keyboardType="decimal-pad" />
      <Field value={dueDay} onChangeText={setDueDay} placeholder="Dia do vencimento (opcional)" keyboardType="number-pad" />
      {error ? <InlineNotice>{error}</InlineNotice> : null}
      <PrimaryButton label={id ? 'Salvar alterações' : 'Adicionar cartão'} onPress={save} loading={loading} />
      {id ? <PrimaryButton label="Excluir cartão" onPress={remove} /> : null}
    </Screen>
  );
}