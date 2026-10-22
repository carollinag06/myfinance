import { Ionicons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React from 'react';
import { Pressable, View } from 'react-native';
import { colors } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: {
          animation: 'timing',
          config: { duration: 180 },
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="transacoes" options={{ title: 'Extrato', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} /> }} />
      <Tabs.Screen
        name="novo"
        options={{
          title: '',
          tabBarLabel: '',
          tabBarButton: () => (
            <Pressable accessibilityRole="button" accessibilityLabel="Nova transação" onPress={() => router.push('/nova-transacao')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 54, height: 54, borderRadius: 27, marginTop: -19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.background }}>
                <Ionicons name="add" size={29} color={colors.text} />
              </View>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen name="analises" options={{ title: 'Análises', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="cartoes" options={{ href: null }} />
      <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}