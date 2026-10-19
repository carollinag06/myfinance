import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import * as ImagePicker from 'expo-image-picker';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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
import AnalyticsScreen from '../app/analises';
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
    useLocalSearchParams: () => ({}),
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

    await fireEvent.changeText(screen.getByPlaceholderText('Senha atual'), 'senha-atual');
    await fireEvent.changeText(screen.getByPlaceholderText('Nova senha (mínimo 8 caracteres)'), 'nova-senha-123');
    await fireEvent.changeText(screen.getByPlaceholderText('Confirme a nova senha'), 'nova-senha-123');
    await fireEvent.press(screen.getByRole('button', { name: 'Atualizar senha' }));
    await waitFor(() => expect(mockApi.put).toHaveBeenCalledWith('/usuarios/7/senha', {
      senhaAtual: 'senha-atual', novaSenha: 'nova-senha-123',
    }));
    expect(await screen.findByText('Senha alterada com sucesso.')).toBeTruthy();
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
