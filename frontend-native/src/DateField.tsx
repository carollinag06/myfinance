import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDateBR, localDateISO } from './date';
import { colors } from './theme';

export function DateField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(new Date());
  function show() {
    const [year, monthIndex, day] = value.split('-').map(Number);
    setMonth(new Date(year, monthIndex - 1, day));
    setOpen(true);
  }
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const offset = new Date(year, monthIndex, 1).getDay();
  const count = new Date(year, monthIndex + 1, 0).getDate();
  function move(delta: number) { setMonth(new Date(year, monthIndex + delta, 1)); }
  function select(date: Date) { onChange(localDateISO(date)); setOpen(false); }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${formatDateBR(value)}. Abrir calendário`} onPress={show} style={styles.field}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={styles.text}>{formatDateBR(value)}</Text>
      </View>
      <Ionicons name="calendar-outline" size={24} color={colors.primaryLight} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <View style={styles.calendar} accessibilityViewIsModal>
          <Text style={[styles.text, { fontWeight: '700' }]}>Selecionar {label.toLowerCase()}</Text>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" onPress={() => move(-1)} style={styles.control}><Ionicons name="chevron-back" size={24} color={colors.text} /></Pressable>
            <Text style={[styles.text, { textTransform: 'capitalize' }]}>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => move(1)} style={styles.control}><Ionicons name="chevron-forward" size={24} color={colors.text} /></Pressable>
          </View>
          <View style={styles.grid}>
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => <View key={day} style={styles.cell}><Text style={{ color: colors.muted }}>{day}</Text></View>)}
            {Array.from({ length: offset }, (_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
            {Array.from({ length: count }, (_, index) => {
              const date = new Date(year, monthIndex, index + 1);
              const selected = localDateISO(date) === value;
              return <Pressable key={index} accessibilityRole="button" accessibilityLabel={formatDateBR(localDateISO(date))} accessibilityState={{ selected }} onPress={() => select(date)} style={[styles.cell, selected && { backgroundColor: colors.primary, borderRadius: 12 }]}><Text style={styles.text}>{index + 1}</Text></Pressable>;
            })}
          </View>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" onPress={() => select(new Date())} style={styles.control}><Text style={{ color: colors.primaryLight }}>Hoje</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={styles.control}><Text style={styles.text}>Cancelar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, borderRadius: 13 },
  text: { color: colors.text, fontSize: 15 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.7)' },
  calendar: { width: '100%', maxWidth: 380, padding: 16, borderRadius: 20, backgroundColor: colors.surface, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  control: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', padding: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285714%', minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
