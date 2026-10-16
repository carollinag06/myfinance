import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useAuth } from '../../src/session';
import { colors } from '../../src/theme';
import { Panel, Screen } from '../../src/ui';

const links = [
  { title: 'Categorias', subtitle: 'Organize suas movimentações', icon: 'pricetag-outline' as const, path: '/categorias' as const },
  { title: 'Orçamentos', subtitle: 'Acompanhe seus limites mensais', icon: 'pie-chart-outline' as const, path: '/orcamentos' as const },
  { title: 'Faturas', subtitle: 'Veja vencimentos e pagamentos', icon: 'receipt-outline' as const, path: '/faturas' as const },
  { title: 'Meu perfil', subtitle: 'Dados da sua conta', icon: 'person-outline' as const, path: '/perfil' as const },
];

export default function MoreScreen() {
  const { usuario } = useAuth();
  return (
    <Screen title="Mais" subtitle="Ajustes e ferramentas da sua conta.">
      <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(138,43,226,0.2)', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="person" size={22} color={colors.primaryLight} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{usuario?.nome}</Text>
          <Text style={{ color: colors.muted, marginTop: 3 }}>{usuario?.email}</Text>
        </View>
      </Panel>
      {links.map((item) => (
        <Pressable key={item.title} onPress={() => router.push(item.path)}>
          <Panel style={{ flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 14 }}>
            <Ionicons name={item.icon} size={22} color={colors.primaryLight} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>{item.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Panel>
        </Pressable>
      ))}
    </Screen>
  );
}