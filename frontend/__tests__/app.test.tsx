import { notifyTransactionChange } from '../src/transactionEvents';
import { FeedbackHost, dismissFeedback } from '../src/feedback';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { api } from '../src/api';
import { useAuth } from '../src/session';
import { PasswordField } from '../src/PasswordField';
import LoginScreen from '../app/(auth)/login';
import RegisterScreen from '../app/(auth)/cadastro';
import Dashboard from '../app/(tabs)/index';
import CardsScreen from '../app/(tabs)/cartoes';
import TransactionsScreen from '../app/(tabs)/transacoes';
import MoreScreen from '../app/(tabs)/mais';
import NewTransactionScreen from '../app/nova-transacao';
import NewCardScreen from '../app/novo-cartao';
import CategoriesScreen from '../app/categorias';
import BudgetsScreen from '../app/orcamentos';
import InvoicesScreen from '../app/faturas';
import AnalyticsScreen from '../app/(tabs)/analises';
import ProfileScreen from '../app/perfil';
import IndexScreen from '../app/index';
import RootLayout from '../app/_layout';
import AuthLayout from '../app/(auth)/_layout';
import TabLayout from '../app/(tabs)/_layout';
import NewShortcut from '../app/(tabs)/novo';

jest.mock('expo-router', () => {
  const ReactModule = require('react');
  const { Text: TextComponent, View: ViewComponent } = require('react-native');
  const router = { push: jest.fn(), back: jest.fn(), replace: jest.fn() };
  let segments = ['index'];
  let params = {};
  const MockTabs: any = ({ children }: { children: React.ReactNode }) => ReactModule.createElement(ViewComponent, null, children);
  MockTabs.Screen = ({ name, options }: { name: string; options?: { tabBarButton?: () => React.ReactNode; tabBarIcon?: (props: { color: string; size: number }) => React.ReactNode } }) => ReactModule.createElement(
    ReactModule.Fragment,
    null,
    ReactModule.createElement(TextComponent, null, name),
    options?.tabBarIcon?.({ color: 'white', size: 20 }),
    options?.tabBarButton?.(),
  );
  const MockStack: any = ({ children }: { children: React.ReactNode }) => ReactModule.createElement(ViewComponent, null, children);
  MockStack.Screen = () => null;
  return {
    router,
    Link: ({ children }: { children: React.ReactNode }) => ReactModule.createElement(TextComponent, null, children),
    Redirect: ({ href }: { href: string }) => ReactModule.createElement(TextComponent, null, href),
    Tabs: MockTabs,
    Stack: MockStack,
    useRouter: () => router,
    useLocalSearchParams: () => params,
    setLocalSearchParams: (value: any) => { params = value; },
    useSegments: () => segments,
    useRootNavigationState: () => ({ key: 'root' }),
    setSegments: (value: string[]) => { segments = value; },
    useFocusEffect: (callback: () => void | (() => void)) => ReactModule.useEffect(callback, []),
  };
});

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('../src/api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), putMultipart: jest.fn(), delete: jest.fn() },
  fotoUsuarioUrl: jest.fn(() => null),
  toAmount: (value: number | string | null | undefined) => {
    const amount = typeof value === 'number' ? value : Number(value ?? 0);
    return Number.isFinite(amount) ? amount : 0;
  },
}));
jest.mock('../src/session', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const mockApi = api as any;
const mockUseAuth = useAuth as unknown as (() => any) & { mockReturnValue: (value: any) => void; mock: { results: { value: any }[] } };
const expoRouterMock: any = jest.requireMock('expo-router');
const mockRouter = expoRouterMock.router;
const mockSetSegments = expoRouterMock.setSegments as (value: string[]) => void;
const mockImagePicker = ImagePicker as any;
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const expenseCategory = { id: 1, nome: 'Alimentação', tipo: 'despesa', usuarioId: 7 };
const incomeCategory = { id: 2, nome: 'Salário', tipo: 'receita', usuarioId: 7 };

beforeEach(() => {
  jest.clearAllMocks();
  mockSetSegments(['index']);
  expoRouterMock.setLocalSearchParams({});
  dismissFeedback();
  mockApi.get.mockResolvedValue([] as never);
  mockApi.post.mockResolvedValue({} as never);
  mockApi.put.mockResolvedValue({} as never);
  mockApi.putMultipart.mockResolvedValue({} as never);
  mockApi.delete.mockResolvedValue(undefined as never);
  mockUseAuth.mockReturnValue({
    usuario: { id: 7, nome: 'Ana Silva', email: 'ana@example.com', tipoUsuario: 'usuario' },
    pronto: true,
    entrar: jest.fn(),
    cadastrar: jest.fn(),
    sair: jest.fn(),
    atualizarUsuario: jest.fn(),
  });
});

describe('authentication screens', () => {
  it('lets the user reveal and hide a password field', async () => {
    await render(<PasswordField value="senha" onChangeText={() => {}} placeholder="Senha" />);
    expect(screen.getByPlaceholderText('Senha').props.secureTextEntry).toBe(true);
    await fireEvent.press(screen.getByLabelText('Mostrar senha'));
    expect(screen.getByPlaceholderText('Senha').props.secureTextEntry).toBe(false);
    expect(screen.getByLabelText('Ocultar senha')).toBeTruthy();
  });

  it('renders the auth navigator without a header', async () => {
    const rendered = await render(<AuthLayout />);
    expect(rendered.root).toBeTruthy();
  });

  it('routes a signed-out user to login and a signed-in user to the tabs', async () => {
    mockUseAuth.mockReturnValue({ pronto: true, usuario: null });
    await render(<IndexScreen />);
    expect(screen.getByText('/(auth)/login')).toBeTruthy();

    mockUseAuth.mockReturnValue({ pronto: true, usuario: { id: 7 } });
    await render(<IndexScreen />);
    expect(screen.getByText('/(tabs)')).toBeTruthy();
  });

  it('blocks login for a malformed email without calling the session', async () => {
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), 'invalido');
    await fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('Confira o formato do e-mail.')).toBeTruthy();
    expect(mockUseAuth.mock.results[0].value.entrar).not.toHaveBeenCalled();
  });

  it('normalizes email before login and presents server errors', async () => {
    const entrar: any = jest.fn(async () => { throw new Error('Credenciais inválidas.'); });
    mockUseAuth.mockReturnValue({ ...mockUseAuth(), entrar });
    await render(<LoginScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), ' ANA@EXAMPLE.COM ');
    await fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha-segura');
    await fireEvent.press(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(entrar).toHaveBeenCalledWith('ana@example.com', 'senha-segura'));
    expect(await screen.findByText('Credenciais inválidas.')).toBeTruthy();
  });

  it('rejects a mismatched registration confirmation before submitting', async () => {
    const cadastrar = jest.fn();
    mockUseAuth.mockReturnValue({ ...mockUseAuth(), cadastrar });
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Nome completo'), 'Ana Silva');
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), 'ana@example.com');
    await fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha1234');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirme a senha'), 'diferente');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar minha conta' }));

    expect(await screen.findByText('As senhas não coincidem.')).toBeTruthy();
    expect(cadastrar).not.toHaveBeenCalled();
  });

  it('trims the registration name and normalizes the email before account creation', async () => {
    const cadastrar = jest.fn();
    mockUseAuth.mockReturnValue({ ...mockUseAuth(), cadastrar });
    await render(<RegisterScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Nome completo'), '  Ana Silva  ');
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), ' ANA@EXAMPLE.COM ');
    await fireEvent.changeText(screen.getByPlaceholderText('Senha'), 'senha-segura-123');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirme a senha'), 'senha-segura-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Criar minha conta' }));

    await waitFor(() => expect(cadastrar).toHaveBeenCalledWith('Ana Silva', 'ana@example.com', 'senha-segura-123'));
  });
});

describe('application navigation', () => {
  it('waits for session hydration before applying route guards', async () => {
    mockSetSegments(['(tabs)']);
    mockUseAuth.mockReturnValue({ pronto: false, usuario: null });
    await render(<RootLayout />);

    expect(screen.getByText('Preparando sua sessão...')).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('redirects protected and authentication sections to the matching route', async () => {
    mockSetSegments(['(tabs)']);
    mockUseAuth.mockReturnValue({ pronto: true, usuario: null });
    await render(<RootLayout />);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');

    mockRouter.replace.mockClear();
    mockSetSegments(['(auth)']);
    mockUseAuth.mockReturnValue({ pronto: true, usuario: { id: 7 } });
    await render(<RootLayout />);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('keeps the centered new transaction shortcut on the tab bar', async () => {
    await render(<TabLayout />);
    expect(screen.getByText('index')).toBeTruthy();
    expect(screen.getByText('transacoes')).toBeTruthy();
    expect(screen.getByText('cartoes')).toBeTruthy();
    expect(screen.getByText('mais')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Nova transação'));
    expect(mockRouter.push).toHaveBeenCalledWith('/nova-transacao');
  });

  it('keeps the tab route behind its custom central action visually empty', async () => {
    const rendered = await render(<NewShortcut />);
    expect(rendered.root).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});

describe('main finance flows', () => {
  it('lists cards and opens the selected card for editing', async () => {
    mockApi.get.mockResolvedValue([{ id: 9, nome: 'Visa pessoal', limite: '1250', vencimento: 18 }] as never);
    await render(<CardsScreen />);

    expect(await screen.findByText('Visa pessoal')).toBeTruthy();
    expect(screen.getByText('Vencimento dia 18')).toBeTruthy();
    await fireEvent.press(screen.getByText('Visa pessoal'));
    expect(mockRouter.push).toHaveBeenCalledWith('/novo-cartao?id=9');
  });

  it('calculates the dashboard month balance and links the greeting to the account', async () => {
    mockApi.get.mockImplementation(async (path: string) => {
      if (path === '/transacoes') return [
        { id: 1, descricao: 'Salário', tipo: 'receita', valor: '3200', data: `${currentMonth}-04` },
        { id: 2, descricao: 'Mercado', tipo: 'despesa', valor: '200', data: `${currentMonth}-08` },
      ] as never;
      if (path === '/cartoes') return [{ id: 1, nome: 'Visa', limite: 1000 }] as never;
      return [] as never;
    });

    await render(<Dashboard />);
    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText(/3\.000,00/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Ver análises mensais'));
    expect(mockRouter.push).toHaveBeenCalledWith('/analises');
  });

  it('searches the statement by category and filters transaction types', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes'
      ? [
          { id: 1, descricao: 'Compra semanal', valor: 80, tipo: 'despesa', data: `${currentMonth}-10`, categoriaId: 1, categoria: expenseCategory },
          { id: 2, descricao: 'Pagamento', valor: 120, tipo: 'receita', data: `${currentMonth}-11`, categoriaId: 2, categoria: incomeCategory },
        ] as never
      : [expenseCategory, incomeCategory] as never);

    await render(<TransactionsScreen />);
    expect(await screen.findByText('Compra semanal')).toBeTruthy();
    expect(screen.getByText('Pagamento')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Buscar descrição ou categoria'), 'salário');
    expect(screen.getByText('Pagamento')).toBeTruthy();
    expect(screen.queryByText('Compra semanal')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByText('Limpar filtros'));
    await fireEvent.press(screen.getByText('Despesas'));
    expect(screen.getByText('Compra semanal')).toBeTruthy();
    expect(screen.queryByText('Pagamento')).toBeNull();
  });

  it('shows only categories that match the selected transaction type and creates installments', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/categorias'
      ? [expenseCategory, incomeCategory] as never
      : [] as never);
    await render(<NewTransactionScreen />);
    await waitFor(() => expect(mockApi.get).toHaveBeenCalledWith('/categorias'));
    expect(await screen.findByText('Alimentação')).toBeTruthy();
    expect(screen.queryByText('Salário')).toBeNull();
    await fireEvent.press(screen.getByText('Compra parcelada'));
    await fireEvent.changeText(screen.getByPlaceholderText('Descrição'), 'Notebook');
    await fireEvent.changeText(screen.getByPlaceholderText('Valor total da compra (R$)'), '100');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar transação' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/transacoes/parceladas', expect.objectContaining({
      descricao: 'Notebook', valor: 100, tipo: 'despesa', totalParcelas: 3,
    })));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('validates card due day before sending a request', async () => {
    await render(<NewCardScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Nome do cartão'), 'Cartão trabalho');
    await fireEvent.changeText(screen.getByPlaceholderText('Limite (R$)'), '1500');
    await fireEvent.changeText(screen.getByPlaceholderText('Dia do vencimento (opcional)'), '32');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar cartão' }));

    expect(await screen.findByText('O vencimento deve ser um dia entre 1 e 31.')).toBeTruthy();
    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('creates a card with normalized values and an optional empty due day', async () => {
    await render(<NewCardScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Nome do cartão'), '  Cartão trabalho  ');
    await fireEvent.changeText(screen.getByPlaceholderText('Limite (R$)'), '1500,50');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar cartão' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/cartoes', {
      nome: 'Cartão trabalho', limite: 1500.5, vencimento: null,
    }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('creates a trimmed category with the selected type', async () => {
    mockApi.get.mockResolvedValue([] as never);
    await render(<CategoriesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Nova categoria' }));
    await fireEvent.press(screen.getByText('Receita'));
    await fireEvent.changeText(screen.getByPlaceholderText('Nome'), '  Bônus  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar categoria' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/categorias', {
      nome: 'Bônus', descricao: null, tipo: 'receita',
    }));
  });

  it('calculates budget progress from expenses for the selected month', async () => {
    const [year, month] = currentMonth.split('-').map(Number);
    mockApi.get.mockImplementation(async (path: string) => {
      if (path === '/orcamentos') return [{ id: 1, valor: 500, mes: month, ano: year, categoriaId: 1, categoria: expenseCategory }] as never;
      if (path === '/categorias') return [expenseCategory] as never;
      return [{ id: 1, valor: 600, tipo: 'despesa', data: `${currentMonth}-15`, categoriaId: 1 }] as never;
    });

    await render(<BudgetsScreen />);
    expect(await screen.findByText('100%')).toBeTruthy();
    expect(screen.getAllByText(/600,00/).length).toBeGreaterThan(0);
  });

  it('saves a monthly budget with its chosen expense category', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/categorias'
      ? [expenseCategory] as never
      : [] as never);
    const [year, month] = currentMonth.split('-').map(Number);
    await render(<BudgetsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Nova meta' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Limite (R$)'), '450,75');
    await fireEvent.press(screen.getByText('Alimentação'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/orcamentos', {
      valor: 450.75, mes: month, ano: year, categoriaId: expenseCategory.id,
    }));
  });

  it('marks an invoice paid using the API and updates its label', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/faturas'
      ? [{ id: 4, valor: 75, vencimento: '2025-04-10', paga: false, cartao: { id: 1, nome: 'Visa' } }] as never
      : [{ id: 1, nome: 'Visa', limite: 1000 }] as never);

    await render(<InvoicesScreen />);
    expect(await screen.findByText('Visa')).toBeTruthy();
    await fireEvent.press(screen.getByText('Marcar paga'));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/faturas/4', { paga: true }));
    expect(await screen.findByText('Marcar pendente')).toBeTruthy();
  });

  it('creates an invoice linked to the selected card', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/cartoes'
      ? [{ id: 3, nome: 'Visa', limite: 900 }] as never
      : [] as never);
    await render(<InvoicesScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Nova fatura' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Valor (R$)'), '89,90');
    await fireEvent.press(screen.getByText('Visa'));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar fatura' }));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/faturas', expect.objectContaining({
      valor: 89.9, paga: false, cartaoId: 3,
    })));
  });

  it('shows analytics by category and handles a month change', async () => {
    mockApi.get.mockResolvedValue([
      { id: 1, valor: 90, tipo: 'despesa', data: `${currentMonth}-05`, categoria: expenseCategory },
      { id: 2, valor: 120, tipo: 'receita', data: `${currentMonth}-06` },
    ] as never);

    await render(<AnalyticsScreen />);
    expect(await screen.findByText('Alimentação')).toBeTruthy();
    expect(screen.getByText('2 lançamentos')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Mês anterior'));
    expect(await screen.findByText('Não há despesas neste mês.')).toBeTruthy();
  });

  it('renders the signed-in user and navigation links in Mais', async () => {
    await render(<MoreScreen />);
    expect(screen.getByText('Ana Silva')).toBeTruthy();
    expect(screen.getByText('ana@example.com')).toBeTruthy();
    await fireEvent.press(screen.getByText('Metas e orçamentos'));
    expect(mockRouter.push).toHaveBeenCalledWith('/orcamentos');
  });

  it('saves profile details and uses a separate authenticated password change flow', async () => {
    const atualizarUsuario = jest.fn();
    mockUseAuth.mockReturnValue({ ...mockUseAuth(), atualizarUsuario });
    mockApi.put.mockResolvedValueOnce({ id: 7, nome: 'Ana Maria', email: 'ana.maria@example.com', tipoUsuario: 'usuario' } as never);
    await render(<ProfileScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('Nome'), 'Ana Maria');
    await fireEvent.changeText(screen.getByPlaceholderText('E-mail'), 'ANA.MARIA@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar perfil' }));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/usuarios/7', { nome: 'Ana Maria', email: 'ana.maria@example.com' }));
    expect(atualizarUsuario).toHaveBeenCalled();
    expect(await screen.findByText('Perfil atualizado.')).toBeTruthy();

    expect(screen.queryByPlaceholderText('Senha atual')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Mudar senha' }));
    await fireEvent.changeText(screen.getByPlaceholderText('Senha atual'), 'senha-atual');
    await fireEvent.changeText(screen.getByPlaceholderText('Nova senha (mínimo 8 caracteres)'), 'nova-senha-123');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirme a nova senha'), 'nova-senha-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar senha' }));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/usuarios/7/senha', {
      senhaAtual: 'senha-atual', novaSenha: 'nova-senha-123',
    }));
    expect(await screen.findByText('Senha alterada com sucesso.')).toBeTruthy();
    expect(screen.queryByPlaceholderText('Senha atual')).toBeNull();
  });

  it('validates and uploads a selected profile photo with the profile form', async () => {
    const file = new Blob(['image-data'], { type: 'image/png' });
    mockImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ uri: 'blob:profile-image', fileName: 'perfil.png', mimeType: 'image/png', file, fileSize: 64 }],
    });
    await render(<ProfileScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Escolher foto' }));
    expect(await screen.findByText('Trocar foto')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar perfil' }));

    await waitFor(() => expect(mockApi.putMultipart).toHaveBeenCalledWith('/usuarios/7', expect.any(FormData)));
  });
});

describe('expanded analytics', () => {
  it('shows category shares and filters the largest expenses', async () => {
    mockApi.get.mockResolvedValue([
      { id: 51, descricao: 'Supermercado', valor: 90, tipo: 'despesa', data: `${currentMonth}-05`, categoria: expenseCategory },
      { id: 52, descricao: 'Cinema', valor: 30, tipo: 'despesa', data: `${currentMonth}-06`, categoria: { id: 8, nome: 'Lazer', tipo: 'despesa' } },
      { id: 53, descricao: 'Salário', valor: 200, tipo: 'receita', data: `${currentMonth}-01` },
    ] as never);
    await render(<AnalyticsScreen />);
    expect(await screen.findByText('Como foi o seu mês')).toBeTruthy();
    expect(screen.getByText('40,0%')).toBeTruthy();
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.getByText('Cinema')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Filtrar categoria Alimentação'));
    expect(screen.getByText('Supermercado')).toBeTruthy();
    expect(screen.queryByText('Cinema')).toBeNull();
    await fireEvent.press(screen.getByText('Alimentação · Limpar filtro'));
    expect(screen.getByText('Cinema')).toBeTruthy();
  });

  it('ends the six-month history at the selected month', async () => {
    mockApi.get.mockResolvedValue([] as never);
    await render(<AnalyticsScreen />);
    await screen.findByText('Receitas × despesas');
    const [year, month] = currentMonth.split('-').map(Number);
    const title = (offset: number) => new Date(year, month - 1 + offset, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    expect(screen.getByLabelText('Ver ' + title(0))).toBeTruthy();
    expect(screen.getByLabelText('Ver ' + title(-5))).toBeTruthy();
    expect(screen.queryByLabelText('Ver ' + title(1))).toBeNull();
    await fireEvent.press(screen.getByLabelText('Ver ' + title(-1)));
    expect(screen.queryByLabelText('Ver ' + title(0))).toBeNull();
  });
});

describe('analytics type reports', () => {
  it('filters categories, history and transactions by income or expenses and restores overview', async () => {
    mockApi.get.mockResolvedValue([
      { id: 71, descricao: 'Pagamento mensal', valor: 1000, tipo: 'receita', data: `${currentMonth}-01`, categoria: incomeCategory },
      { id: 72, descricao: 'Compra mensal', valor: 100, tipo: 'despesa', data: `${currentMonth}-02`, categoria: expenseCategory },
    ] as never);
    await render(<AnalyticsScreen />);
    await screen.findByText('Maiores gastos');
    await fireEvent.press(screen.getByLabelText('Filtrar categoria Alimentação'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver relatório de receitas' }));
    expect(screen.getByText('Receitas do período')).toBeTruthy();
    expect(screen.getByText('Receitas por categoria')).toBeTruthy();
    expect(screen.getByText('Pagamento mensal')).toBeTruthy();
    expect(screen.queryByText('Compra mensal')).toBeNull();
    expect(screen.queryByLabelText('Filtrar categoria Alimentação')).toBeNull();
    expect(screen.getByLabelText('Filtrar categoria Salário')).toBeTruthy();
    expect(screen.queryByText('● Despesas')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver relatório de despesas' }));
    expect(screen.getByText('Despesas do período')).toBeTruthy();
    expect(screen.getByText('Compra mensal')).toBeTruthy();
    expect(screen.queryByText('Pagamento mensal')).toBeNull();
    expect(screen.queryByLabelText('Filtrar categoria Salário')).toBeNull();
    expect(screen.queryByText('● Receitas')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Ver visão geral' }));
    expect(screen.getByText('Saldo do período')).toBeTruthy();
    expect(screen.getByText('● Receitas')).toBeTruthy();
    expect(screen.getByText('● Despesas')).toBeTruthy();
  });
});

describe('compact statement filters', () => {
  it('keeps filters collapsed and preserves the selection after showing results', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [
      { id: 81, descricao: 'Mercado da semana', valor: 50, tipo: 'despesa', data: `${currentMonth}-10`, categoriaId: 1, categoria: expenseCategory },
      { id: 82, descricao: 'Recebimento mensal', valor: 500, tipo: 'receita', data: `${currentMonth}-11`, categoriaId: 2, categoria: incomeCategory },
    ] as never : [expenseCategory, incomeCategory] as never);
    await render(<TransactionsScreen />);
    await screen.findByText('Mercado da semana');
    expect(screen.queryByText('Filtrar extrato')).toBeNull();
    expect(screen.queryByText('Limpar filtros')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByText('Despesas'));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.queryByText('Filtrar extrato')).toBeNull();
    expect(screen.getByText('Filtros (1)')).toBeTruthy();
    expect(screen.getByText('Mercado da semana')).toBeTruthy();
    expect(screen.queryByText('Recebimento mensal')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar filtros' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.getByText('Recebimento mensal')).toBeTruthy();
    expect(screen.getByText('Filtros')).toBeTruthy();
  });
});

describe('statement category multiselect', () => {
  it('includes either selected category and allows deselecting and resetting', async () => {
    const leisure = { id: 9, nome: 'Lazer', tipo: 'despesa' };
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [
      { id: 91, descricao: 'Compra de alimentos', valor: 50, tipo: 'despesa', data: `${currentMonth}-10`, categoriaId: expenseCategory.id, categoria: expenseCategory },
      { id: 92, descricao: 'Entrada mensal', valor: 500, tipo: 'receita', data: `${currentMonth}-11`, categoriaId: incomeCategory.id, categoria: incomeCategory },
      { id: 93, descricao: 'Ingresso cinema', valor: 30, tipo: 'despesa', data: `${currentMonth}-12`, categoriaId: 9, categoria: leisure },
    ] as never : [expenseCategory, incomeCategory, leisure] as never);
    await render(<TransactionsScreen />);
    await screen.findByText('Compra de alimentos');
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Alimentação' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Lazer' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.getByText('Compra de alimentos')).toBeTruthy();
    expect(screen.getByText('Ingresso cinema')).toBeTruthy();
    expect(screen.queryByText('Entrada mensal')).toBeNull();
    expect(screen.getByText(/2 categorias/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Alimentação' }));
    expect(screen.queryByText('Compra de alimentos')).toBeNull();
    expect(screen.getByText('Ingresso cinema')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Todas categorias' }));
    expect(screen.getByText('Compra de alimentos')).toBeTruthy();
    expect(screen.getByText('Entrada mensal')).toBeTruthy();
  });
});

describe('realized and planned transactions', () => {
  it('keeps planned and future amounts out of available balance', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [
      { id: 101, descricao: 'Recebida', tipo: 'receita', valor: 1000, data: `${currentMonth}-01`, status: 'realizado' },
      { id: 102, descricao: 'Paga', tipo: 'despesa', valor: 100, data: `${currentMonth}-01`, status: 'realizado' },
      { id: 103, descricao: 'Prevista', tipo: 'receita', valor: 500, data: `${currentMonth}-01`, status: 'previsto' },
      { id: 104, descricao: 'Futura', tipo: 'receita', valor: 9999, data: '9999-01-01', status: 'realizado' },
    ] as never : [] as never);
    await render(<Dashboard />);
    await screen.findByText('Saldo disponível');
    expect(screen.getByText(/900,00/)).toBeTruthy();
    expect(screen.getByText(/A receber:/).props.children.join('')).toContain('500,00');
  });

  it('opens editing from the statement and marks an expense paid', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [{ id: 110, descricao: 'Conta de luz', tipo: 'despesa', valor: 100, data: `${currentMonth}-01`, status: 'previsto' }] as never : [] as never);
    await render(<TransactionsScreen />);
    await screen.findByText('Conta de luz');
    await fireEvent.press(screen.getByRole('button', { name: 'Editar Conta de luz' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/nova-transacao?id=110');
    await fireEvent.press(screen.getByRole('button', { name: 'Marcar como paga' }));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/transacoes/110', { status: 'realizado', data: `${currentMonth}-01` }));
    expect(screen.getByText('Paga')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Marcar como previsto' })).toBeTruthy();
  });

  it('loads an installment for editing and saves just that record', async () => {
    expoRouterMock.setLocalSearchParams({ id: '120' });
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes/120' ? {
      id: 120, descricao: 'Notebook', tipo: 'despesa', valor: 100, data: `${currentMonth}-01`, status: 'previsto', categoriaId: 1, cartaoId: null, grupoParcelamento: 'grupo', numeroParcela: 2, totalParcelas: 3,
    } as never : path === '/categorias' ? [expenseCategory] as never : [] as never);
    await render(<NewTransactionScreen />);
    expect(await screen.findByDisplayValue('Notebook')).toBeTruthy();
    expect(screen.getByText(/Você está editando apenas esta parcela/)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Descrição'), 'Notebook corrigido');
    await fireEvent.changeText(screen.getByPlaceholderText('Valor (R$)'), '90,50');
    await fireEvent.press(screen.getByRole('radio', { name: 'Paga' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/transacoes/120', { descricao: 'Notebook corrigido', valor: 90.5, tipo: 'despesa', data: `${currentMonth}-01`, status: 'realizado', categoriaId: 1, cartaoId: null, formaPagamento: 'a_vista' }));
    expect(mockApi.post).not.toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('filters analytics including the history by transaction status', async () => {
    mockApi.get.mockResolvedValue([
      { id: 131, descricao: 'Pago agora', valor: 100, tipo: 'despesa', data: `${currentMonth}-01`, status: 'realizado', categoria: expenseCategory },
      { id: 132, descricao: 'A pagar depois', valor: 200, tipo: 'despesa', data: `${currentMonth}-01`, status: 'previsto', categoria: { id: 9, nome: 'Lazer', tipo: 'despesa' } },
    ] as never);
    await render(<AnalyticsScreen />);
    await screen.findByText('Pago agora');
    await fireEvent.press(screen.getByRole('radio', { name: 'Realizados' }));
    expect(screen.getByText('Pago agora')).toBeTruthy();
    expect(screen.queryByText('A pagar depois')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Previstos' }));
    expect(screen.queryByText('Pago agora')).toBeNull();
    expect(screen.getByText('A pagar depois')).toBeTruthy();
  });
});

describe('consistent confirmation dialogs', () => {
  it('requires confirmation, preserves records on errors and allows retrying deletion', async () => {
    mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [{ id: 140, descricao: 'Teste exclusão', tipo: 'despesa', valor: 50, data: `${currentMonth}-01`, status: 'previsto' }] as never : [] as never);
    await render(<><TransactionsScreen /><FeedbackHost /></>);
    await screen.findByText('Teste exclusão');
    await fireEvent.press(screen.getByLabelText('Excluir lançamento'));
    expect(mockApi.delete).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Teste exclusão')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Excluir lançamento'));
    mockApi.delete.mockRejectedValueOnce(new Error('Falha na conexão.'));
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByText('Falha na conexão.')).toBeTruthy();
    expect(screen.getByText('Teste exclusão')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Excluir' }));
    await waitFor(() => expect(screen.queryByText('Teste exclusão')).toBeNull());
    expect(screen.getByText('Lançamento excluído.')).toBeTruthy();
  });
});

it('keeps the edit form and its values when a save fails', async () => {
  expoRouterMock.setLocalSearchParams({ id: '150' });
  mockApi.get.mockImplementation(async (path: string) => path === '/transacoes/150' ? { id: 150, descricao: 'Original', tipo: 'receita', valor: 100, data: `${currentMonth}-01`, status: 'previsto' } as never : [] as never);
  mockApi.put.mockRejectedValueOnce(new Error('Não foi possível salvar agora.'));
  await render(<NewTransactionScreen />);
  await screen.findByDisplayValue('Original');
  await fireEvent.changeText(screen.getByPlaceholderText('Descrição'), 'Correção preservada');
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar alterações' }));
  expect(await screen.findByText('Não foi possível salvar agora.')).toBeTruthy();
  expect(screen.getByDisplayValue('Correção preservada')).toBeTruthy();
  expect(mockRouter.back).not.toHaveBeenCalled();
});

it('requires confirmation before anticipating a future receipt and uses today as the actual date', async () => {
  mockApi.get.mockImplementation(async (path: string) => path === '/transacoes' ? [{ id: 160, descricao: 'Receita futura', tipo: 'receita', valor: 50, data: '9999-01-01', status: 'previsto' }] as never : [] as never);
  await render(<><TransactionsScreen /><FeedbackHost /></>);
  await screen.findByText('Nenhum lançamento corresponde a esses filtros.');
  await fireEvent.press(screen.getByRole('button', { name: 'Filtros' }));
  await fireEvent.press(screen.getByText(/de \d{4}/));
  await fireEvent.press(screen.getByRole('button', { name: 'Ver resultados' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Marcar como recebida' }));
  expect(mockApi.put).not.toHaveBeenCalled();
  expect(screen.getByText('Confirmar antecipação')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Confirmar recebimento' }));
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/transacoes/160', { status: 'realizado', data: todayISO }));
  expect(screen.getByText('Recebida')).toBeTruthy();
});

it('allows card payment without a linked card and clears the link when switching to cash', async () => {
  mockApi.get.mockImplementation(async (path: string) => path === '/cartoes' ? [{ id: 3, nome: 'Visa pessoal', limite: 1000 }] as never : [] as never);
  await render(<NewTransactionScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Descrição'), 'Compra');
  await fireEvent.changeText(screen.getByPlaceholderText('Valor (R$)'), '30');
  await fireEvent.press(screen.getByRole('radio', { name: 'Cartão' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar transação' }));
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/transacoes', expect.objectContaining({ formaPagamento: 'cartao', cartaoId: null })));
  mockApi.post.mockClear();
  await fireEvent.press(screen.getByRole('radio', { name: 'Usar cartão Visa pessoal' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar transação' }));
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/transacoes', expect.objectContaining({ formaPagamento: 'cartao', cartaoId: 3 })));
  mockApi.post.mockClear();
  await fireEvent.press(screen.getByRole('radio', { name: 'À vista' }));
  expect(screen.queryByText('Vincular cartão (opcional)')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar transação' }));
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/transacoes', expect.objectContaining({ formaPagamento: 'a_vista', cartaoId: null })));
});

it('restores the card payment selection when editing an expense', async () => {
  expoRouterMock.setLocalSearchParams({ id: '170' });
  mockApi.get.mockImplementation(async (path: string) => path === '/transacoes/170' ? { id: 170, descricao: 'Compra Visa', tipo: 'despesa', valor: 30, data: `${currentMonth}-01`, status: 'realizado', formaPagamento: 'cartao', cartaoId: 3 } as never : path === '/cartoes' ? [{ id: 3, nome: 'Visa pessoal', limite: 1000 }] as never : [] as never);
  await render(<NewTransactionScreen />);
  await screen.findByDisplayValue('Compra Visa');
  expect(screen.getByRole('radio', { name: 'Cartão' }).props.accessibilityState.checked).toBe(true);
  expect(screen.getByRole('radio', { name: 'Usar cartão Visa pessoal' }).props.accessibilityState.checked).toBe(true);
});

it('saves card payment when the account has no registered cards', async () => {
  mockApi.get.mockResolvedValue([] as never);
  await render(<NewTransactionScreen />);
  await fireEvent.changeText(screen.getByPlaceholderText('Descrição'), 'Compra sem vínculo');
  await fireEvent.changeText(screen.getByPlaceholderText('Valor (R$)'), '25');
  await fireEvent.press(screen.getByRole('radio', { name: 'Cartão' }));
  expect(screen.getByText('Você pode salvar como cartão sem cadastrar um.')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: 'Salvar transação' }));
  await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/transacoes', expect.objectContaining({ formaPagamento: 'cartao', cartaoId: null })));
});

describe('recent transaction refresh and ordering', () => {
  it('shows latest registrations and refreshes after a transaction changes', async () => {
    let rows = Array.from({length:6},(_,index)=>({id:index+1,descricao:'Lançamento '+(index+1),tipo:'despesa',valor:10,data:`${currentMonth}-01`,status:'realizado'}));
    mockApi.get.mockImplementation(async (path:string)=>path==='/transacoes'?rows as never:[] as never);
    await render(<Dashboard />);
    await screen.findByText('Lançamento 6');
    expect(screen.getAllByText(/^Lançamento \d$/).map(node=>node.props.children)).toEqual(['Lançamento 6','Lançamento 5','Lançamento 4','Lançamento 3']);
    rows=[...rows,{id:7,descricao:'Cadastro novo retroativo',tipo:'despesa',valor:20,data:'2024-01-01',status:'realizado'}];
    await act(async()=>{notifyTransactionChange();});
    expect(await screen.findByText('Cadastro novo retroativo')).toBeTruthy();
    expect(screen.queryByText('Lançamento 3')).toBeNull();
  });
  it('refreshes transactions even if a secondary dashboard request fails', async () => {
    mockApi.get.mockImplementation(async(path:string)=>{
      if(path==='/cartoes') throw new Error('Falha nos cartões');
      if(path==='/transacoes') return [{id:1,descricao:'Recente disponível',valor:10,tipo:'receita',data:`${currentMonth}-01`,status:'realizado'}] as never;
      return [] as never;
    });
    await render(<Dashboard />);
    expect(await screen.findByText('Recente disponível')).toBeTruthy();
  });
  it('orders the statement by date and newest registration for equal dates', async () => {
    mockApi.get.mockImplementation(async(path:string)=>path==='/transacoes'?[
      {id:1,descricao:'Ordem antigo',valor:10,tipo:'despesa',data:`${currentMonth}-01`},
      {id:2,descricao:'Ordem anterior',valor:10,tipo:'despesa',data:`${currentMonth}-02`},
      {id:3,descricao:'Ordem recente',valor:10,tipo:'despesa',data:`${currentMonth}-02`},
    ] as never:[] as never);
    await render(<TransactionsScreen />);
    await screen.findByText('Ordem recente');
    expect(screen.getAllByText(/^Ordem /).map(node=>node.props.children)).toEqual(['Ordem recente','Ordem anterior','Ordem antigo']);
  });
});
