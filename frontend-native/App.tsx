import 'react-native-gesture-handler';
import React from 'react';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { AuthProvider, useAuth } from './src/session';
import { FeedbackHost } from './src/feedback';
import { navigationRef, router } from './src/navigation';
import { colors } from './src/theme';
import Login from './app/(auth)/login';
import Cadastro from './app/(auth)/cadastro';
import Inicio from './app/(tabs)/index';
import Transacoes from './app/(tabs)/transacoes';
import Analises from './app/(tabs)/analises';
import Mais from './app/(tabs)/mais';
import Cartoes from './app/(tabs)/cartoes';
import NovaTransacao from './app/nova-transacao';
import NovoCartao from './app/novo-cartao';
import Categorias from './app/categorias';
import Orcamentos from './app/orcamentos';
import Faturas from './app/faturas';
import Perfil from './app/perfil';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primaryLight,
    tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 68, paddingTop: 7, paddingBottom: 8 } }}>
    <Tabs.Screen name="Inicio" component={Inicio} options={{ title: 'Início', tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="Transacoes" component={Transacoes} options={{ title: 'Extrato', tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="Novo" component={View} options={{ title: '', tabBarButton: () => <Pressable accessibilityRole="button" accessibilityLabel="Nova transação" onPress={() => router.push('/nova-transacao')} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 54, height: 54, borderRadius: 27, marginTop: -19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.background }}><Ionicons name="add" color={colors.text} size={29} /></View></Pressable> }} />
    <Tabs.Screen name="Analises" component={Analises} options={{ title: 'Análises', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="Mais" component={Mais} options={{ title: 'Mais', tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" color={color} size={size} /> }} />
  </Tabs.Navigator>;
}

function Navigation() {
  const { usuario, pronto } = useAuth();
  if (!pronto) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}><Text style={{ color: colors.text, textAlign: 'center' }}>Preparando sua sessão...</Text></View>;
  return <NavigationContainer ref={navigationRef}>
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      {usuario ? <>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Cartoes" component={Cartoes} />
        <Stack.Screen name="NovaTransacao" component={NovaTransacao} options={{ presentation: 'modal' }} />
        <Stack.Screen name="NovoCartao" component={NovoCartao} options={{ presentation: 'modal' }} />
        <Stack.Screen name="Categorias" component={Categorias} />
        <Stack.Screen name="Orcamentos" component={Orcamentos} />
        <Stack.Screen name="Faturas" component={Faturas} />
        <Stack.Screen name="Perfil" component={Perfil} />
      </> : <>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Cadastro" component={Cadastro} />
      </>}
    </Stack.Navigator>
  </NavigationContainer>;
}

export default function App() {
  return <SafeAreaProvider><AuthProvider><StatusBar barStyle="light-content" backgroundColor={colors.background} /><Navigation /><FeedbackHost /></AuthProvider></SafeAreaProvider>;
}
