import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { colors } from './theme';
import { InlineNotice, PrimaryButton } from './ui';

type Choice = { label: string; run: () => Promise<void>; destructive?: boolean };
type Confirmation = { title: string; message: string; choices: Choice[] };
let state: { message: string; confirmation: Confirmation | null } = { message: '', confirmation: null };
const listeners = new Set<() => void>();
function publish(next: typeof state) { state = next; listeners.forEach(listener => listener()); }
export function dismissFeedback() { publish({ message: '', confirmation: null }); }
export function showSuccess(message: string) { publish({ ...state, message }); }
export function confirmAction(title: string, message: string, choices: Choice[]) {
  if (state.confirmation) return;
  publish({ ...state, confirmation: { title, message, choices } });
}
export function FeedbackHost() {
  const snapshot = useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => state);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!snapshot.message) return;
    const timeout = setTimeout(() => publish({ ...state, message: '' }), 4500);
    return () => clearTimeout(timeout);
  }, [snapshot.message]);
  useEffect(() => { setError(''); }, [snapshot.confirmation]);
  function close() { if (busy === null) publish({ ...state, confirmation: null }); }
  async function execute(choice: Choice, index: number) {
    if (busy !== null) return;
    setBusy(index); setError('');
    try { await choice.run(); publish({ ...state, confirmation: null }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.'); }
    finally { setBusy(null); }
  }
  return <>
    {snapshot.message ? <View pointerEvents="box-none" style={{ position: 'absolute', top: 50, left: 20, right: 20, alignItems: 'center', zIndex: 1000 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar mensagem de sucesso" accessibilityLiveRegion="polite" onPress={() => publish({ ...state, message: '' })} style={{ width: '100%', maxWidth: 520, padding: 16, borderRadius: 14, backgroundColor: '#163A29', borderColor: colors.success, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
        <Text style={{ color: colors.text, flex: 1 }}>{snapshot.message}</Text><Ionicons name="close" size={18} color={colors.text} />
      </Pressable>
    </View> : null}
    <Modal visible={!!snapshot.confirmation} transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 420, padding: 22, backgroundColor: colors.surface, borderRadius: 20, gap: 16 }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>{snapshot.confirmation?.title}</Text>
          <Text style={{ color: colors.muted, lineHeight: 21 }}>{snapshot.confirmation?.message}</Text>
          {error ? <InlineNotice>{error}</InlineNotice> : null}
          {snapshot.confirmation?.choices.map((choice, index) => <View key={choice.label} style={choice.destructive ? { borderWidth: 1, borderColor: colors.danger, borderRadius: 16 } : undefined}><PrimaryButton label={choice.label} tone={choice.destructive ? 'danger' : 'primary'} loading={busy === index} disabled={busy !== null} onPress={() => void execute(choice, index)} /></View>)}
          <Pressable accessibilityRole="button" disabled={busy !== null} onPress={close} style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: busy !== null ? 0.5 : 1 }}><Text style={{ color: colors.text }}>Cancelar</Text></Pressable>
        </View>
      </View>
    </Modal>
  </>;
}
