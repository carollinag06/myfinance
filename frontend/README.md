# Carolbeck Mobile

Aplicativo mobile Expo para o backend Carolbeck. O visual usa o tema escuro roxo do layout de referência e oferece login, cadastro, dashboard, extrato, cartões, categorias, orçamentos e faturas.

## Executar

1. Inicie o backend na raiz do projeto com npm start.
2. Neste diretório, instale dependências com npm install.
3. Copie .env.example para .env e ajuste EXPO_PUBLIC_API_URL.
4. Inicie o Expo com npx expo start.

O emulador Android normalmente acessa o computador pelo endereço http://10.0.2.2:3000. No simulador iOS use http://localhost:3000. Em um celular físico, configure o IP local do computador e mantenha ambos na mesma rede.

## API usada

O app consome POST /usuarios, POST /usuarios/login, GET e PUT /usuarios/:id e as rotas de CRUD de /transacoes, /cartoes, /categorias, /orcamentos e /faturas. As chamadas autenticadas enviam Authorization: Bearer <token>.

As respostas e requisições usam os nomes do backend, como nome, valor, tipo, categoriaId e cartaoId. O app não coleta o número completo do cartão.

## Sessão

No iOS e Android, a sessão com o token é guardada pelo expo-secure-store. Na versão web, é usada a sessão de armazenamento local do navegador. A senha não é persistida pelo aplicativo.