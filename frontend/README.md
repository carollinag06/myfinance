# MyFinance Mobile

Aplicativo mobile Expo para o backend MyFinance. Oferece login, dashboard, análises mensais, extrato com busca e filtros, transações parceladas, cartões, categorias padrão e personalizadas, metas/orçamentos e faturas.

## Executar

1. Inicie o backend na raiz do projeto com npm start.
2. Neste diretório, instale dependências com npm install.
3. Copie .env.example para .env e ajuste EXPO_PUBLIC_API_URL.
4. Inicie o Expo com npx expo start.

O emulador Android normalmente acessa o computador pelo endereço http://10.0.2.2:3000. No simulador iOS use http://localhost:3000. Em um celular físico, configure o IP local do computador e mantenha ambos na mesma rede.

## API usada

O app consome POST /usuarios, POST /usuarios/login, GET e PUT /usuarios/:id, POST /transacoes/parceladas e as rotas de CRUD de /transacoes, /cartoes, /categorias, /orcamentos e /faturas. As chamadas autenticadas enviam Authorization: Bearer <token>.

Em bancos já existentes, aplique todos os arquivos de `database/migrations/` antes de iniciar a API. A migração `20261019_add_analysis_and_installments.sql` adiciona os tipos e indicadores de categoria e os campos usados para agrupar parcelas.

As respostas e requisições usam os nomes do backend, como nome, valor, tipo, categoriaId e cartaoId. O app não coleta o número completo do cartão.

## Sessão

No iOS e Android, a sessão com o token é guardada pelo expo-secure-store. Na versão web, é usada a sessão de armazenamento local do navegador. A senha não é persistida pelo aplicativo.
