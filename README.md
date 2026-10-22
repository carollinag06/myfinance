# MyFinance API

API REST para controle de finanças pessoais, construída com Node.js, Express, Sequelize e PostgreSQL.

## Requisitos

- Node.js
- PostgreSQL

## Configuração

1. Instale as dependências:

   ~~~bash
   npm install
   ~~~

2. Crie um arquivo .env na raiz do projeto:

   ~~~env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=nome_do_banco
   DB_USER=usuario_do_banco
   DB_PASS=senha_do_banco
   JWT_SECRET=chave_aleatoria_longa
   JWT_EXPIRES_IN=7d
   ~~~

   Gere um valor longo e aleatório para JWT_SECRET. O arquivo .env está no .gitignore e não deve ser versionado.

3. Se estiver usando um banco já existente, abra o Query Tool do pgAdmin
   conectado ao banco configurado e execute, em ordem, os SQLs em
   `database/migrations/`. Além de completar os enums, a migração mais
   recente adiciona os campos de tipo das categorias e de parcelamento.

4. Inicie a API:

   ~~~bash
   npm start
   ~~~

Na inicialização, a aplicação autentica no PostgreSQL, sincroniza os modelos do Sequelize e aplica a migração aditiva de situação das transações (`20261022_add_transaction_status.sql`). Em bancos existentes, lançamentos antigos até a data atual são classificados como realizados; os futuros, como previstos. A migração pode ser reexecutada sem sobrescrever as situações escolhidas. O endpoint GET /health retorna {"status":"ok"} quando o servidor está disponível.

## Autenticação

O cadastro e o login são públicos. O cadastro cria sempre um usuário comum, mesmo que o corpo enviado contenha tipoUsuario. Para acessar os demais endpoints, envie o token do login no cabeçalho:

~~~http
Authorization: Bearer <token>
~~~

A API não tem uma rota pública para criar administradores. O primeiro administrador deve ser provisionado por um procedimento controlado no banco; administradores autenticados podem alterar o tipo de usuário pela rota de atualização de usuário.

## Endpoints

| Método | Caminho | Acesso |
| --- | --- | --- |
| POST | /usuarios | Público; aceita foto opcional como multipart/form-data |
| POST | /usuarios/login | Público |
| GET | /usuarios | Administrador |
| GET, PUT, DELETE | /usuarios/:id | Próprio usuário ou administrador |
| GET, POST | /categorias | Autenticado |
| GET, PUT, DELETE | /categorias/:id | Autenticado; proprietário ou administrador |
| GET, POST | /cartoes | Autenticado |
| GET, PUT, DELETE | /cartoes/:id | Autenticado; proprietário ou administrador |
| GET, POST | /transacoes | Autenticado |
| POST | /transacoes/parceladas | Autenticado; cria de 2 a 48 parcelas em uma operação atômica |
| DELETE | /transacoes/grupos/:grupoId | Autenticado; remove todas as parcelas do grupo |
| GET, PUT, DELETE | /transacoes/:id | Autenticado; proprietário ou administrador |
| GET, POST | /orcamentos | Autenticado |
| GET, PUT, DELETE | /orcamentos/:id | Autenticado; proprietário ou administrador |
| GET, POST | /faturas | Autenticado |
| GET, PUT, DELETE | /faturas/:id | Autenticado; proprietário ou administrador |

As listagens podem ser filtradas por usuarioId quando chamadas por um administrador. Usuários comuns veem apenas os próprios registros. Cartões e categorias associados a transações, orçamentos e faturas devem pertencer ao mesmo usuário do registro.

## Regras de dados

- Valores de transação, orçamento e fatura devem ser maiores que zero.
- transacoes.tipo aceita receita ou despesa.
- categorias.tipo aceita receita ou despesa; isPadrao é definido pela API.
- Compras parceladas geram lançamentos mensais com valores em centavos ajustados para que a soma seja igual ao total informado; são aceitas de 2 a 48 parcelas.
- Novas contas recebem categorias padrão de receitas e despesas. Categorias padrão não podem ser editadas nem excluídas.
- Datas de transações e vencimentos de faturas usam AAAA-MM-DD.
- orcamentos.mes deve estar entre 1 e 12; orcamentos.ano, entre 1900 e 9999.
- O limite do cartão deve ser zero ou maior. O dia de vencimento, quando informado, deve estar entre 1 e 31.

## Observações

Execute `npm test` na raiz para verificar a API. No frontend, execute `npm run typecheck` e `npm test -- --watch=false`.

## Aplicativo mobile

O front end Expo fica em `frontend/`. Consulte `frontend/README.md` para a configuração detalhada. Para iniciar:

1. Inicie a API na raiz do projeto com `npm start`.
2. Em outro terminal, entre em `frontend/`, configure `EXPO_PUBLIC_API_URL` no `.env` conforme o emulador ou dispositivo e rode `npm install`.
3. Rode `npx expo start` dentro de `frontend/`.

O aplicativo inclui login e cadastro, resumo financeiro, análises mensais, extrato com busca e filtros, lançamentos parcelados, cartões, categorias padrão, metas/orçamentos e faturas.

## Situação e edição de transações

- `status` aceita `previsto` ou `realizado`. Novas requisições da API sem esse campo usam `previsto`.
- No aplicativo, uma transação de hoje começa como realizada; ao escolher uma data futura, passa para prevista. É possível registrar uma pendência em uma data passada.
- O saldo disponível acumula apenas receitas recebidas e despesas pagas até hoje. O painel também mostra o que falta receber e pagar no mês. Orçamentos consideram despesas realizadas.
- Extrato e análises permitem filtrar previstos e realizados. A opção Todos nas análises é uma projeção, incluindo os dois estados.
- Para antecipar um lançamento futuro no extrato, o aplicativo confirma a ação e troca sua data para hoje.
- O botão de edição no extrato permite corrigir descrição, valor, tipo, data, categoria, cartão e situação. Em parcelamentos, a edição é individual; não redistribui os valores das demais parcelas.
- Ao criar uma compra parcelada, apenas a primeira parcela pode começar como realizada; as outras ficam previstas.
- Exclusões de transações, categorias, cartões, faturas e orçamentos usam uma confirmação compartilhada com cancelamento, processamento e tentativa novamente em caso de erro.

## Forma de pagamento das despesas

No cadastro e na edição, escolha À vista ou Cartão. Cartão pode ser usado sem um cartão cadastrado; vincular um cartão específico é opcional. Receitas não exibem essa seleção. O extrato mostra a forma e o nome do cartão, quando disponível.

O campo formaPagamento aceita a_vista ou cartao para despesas e é nulo em receitas. Clientes antigos que enviam somente cartaoId continuam compatíveis. A migração 20261022_add_payment_method.sql é aplicada na inicialização; registros existentes com cartão são classificados como cartão, e despesas sem cartão como à vista. A forma registrada é mantida mesmo se o cartão for removido posteriormente.
