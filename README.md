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
   GOOGLE_CLIENT_IDS=seu-id-web.apps.googleusercontent.com,seu-id-android.apps.googleusercontent.com
   PASSWORD_RESET_SECRET=outra_chave_aleatoria_longa
   SMTP_HOST=smtp.seuprovedor.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=seu-usuario-smtp
   SMTP_PASS=sua-senha-smtp
   SMTP_FROM=nao-responda@seudominio.com
   APP_NAME=MyFinance
   APP_RESET_PASSWORD_URL=myfinance:///redefinir-senha
   ~~~

   Gere um valor longo e aleatório para JWT_SECRET. Substitua os exemplos de
   GOOGLE_CLIENT_IDS pelos IDs dos clientes Web e Android já existentes no
   projeto Google Cloud. O arquivo .env está no .gitignore e não deve ser
   versionado.

   Para recuperação de senha, configure as credenciais SMTP do seu provedor e
   gere uma chave aleatória exclusiva para PASSWORD_RESET_SECRET. Defina
   APP_RESET_PASSWORD_URL para o link público da tela de redefinição; o padrão
   abre o app pelo esquema myfinance. Sem SMTP e segredo configurados, a API
   desativa a solicitação de recuperação.

3. Se estiver usando um banco já existente, abra o Query Tool do pgAdmin
   conectado ao banco configurado e execute, em ordem, os SQLs em
   `database/migrations/`. Além de completar os enums, a migração mais
   recente adiciona os campos de tipo das categorias e de parcelamento.

4. Inicie a API:

   ~~~bash
   npm start
   ~~~

Na inicialização, a aplicação autentica no PostgreSQL, sincroniza os modelos do Sequelize e aplica as migrações aditivas necessárias, incluindo situação das transações e tokens de recuperação de senha. Em bancos existentes, lançamentos antigos até a data atual são classificados como realizados; os futuros, como previstos. O endpoint GET /health retorna {"status":"ok"} quando o servidor está disponível.

## Autenticação

### Login com Google

O aplicativo Android nativo fica em `frontend-native/`. Registre um cliente
Android com pacote `com.myfinance.finapp` e o SHA-1 da assinatura do APK.
Crie também um cliente OAuth do tipo Aplicativo da Web no mesmo projeto Google
Cloud e coloque seu ID em `frontend-native/src/config.ts` como
`GOOGLE_WEB_CLIENT_ID`. Para esse uso nativo, os campos de origem JavaScript e
URI de redirecionamento do cliente Web podem ficar vazios.

O app Expo em `frontend/` usa o cliente Android em dispositivos Android e o
cliente Web no navegador, configurados em `frontend/.env`. No app nativo CLI, o
Web Client ID é usado para solicitar o `idToken`. Portanto, o allowlist do
backend precisa conter ambos os IDs para aceitar tokens dos dois apps.

No `.env` da API, inclua os dois IDs, separados por vírgula:

~~~env
GOOGLE_CLIENT_IDS=seu-id-web.apps.googleusercontent.com,seu-id-android.apps.googleusercontent.com
~~~

Reinicie a API após configurar. O backend verifica a assinatura, validade, público e
e-mail confirmado do token antes de criar a sessão MyFinance. Contas já
cadastradas com senha precisam continuar entrando com senha; não são
vinculadas automaticamente por e-mail. A migração
`database/migrations/20261023_add_google_sub.sql` é aplicada na inicialização.
Quando o token verificado inclui a declaração `picture`, a API usa a foto do
Google no perfil; uma foto enviada pelo próprio usuário tem prioridade. O claim
`picture` pode não estar presente em todos os logins, conforme a
[documentação do Google](https://developers.google.com/identity/openid-connect/openid-connect).

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
| POST | /usuarios/solicitar-recuperacao | Público; envia link por e-mail |
| POST | /usuarios/redefinir-senha | Público; valida token do link e troca a senha |
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

Na recuperação de senha, configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM, além de APP_RESET_PASSWORD_URL. PASSWORD_RESET_SECRET deve ser uma chave aleatória longa, diferente da senha do banco. O link expira em 30 minutos, só pode ser usado uma vez e pode ser solicitado novamente após um minuto. As respostas de solicitação não informam se o e-mail existe.

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

Execute `npm test` na raiz para verificar a API. O aplicativo Android pode ser compilado em `frontend-native/android` com `gradlew.bat assembleDebug`.

## Aplicativo mobile

O aplicativo Android em React Native CLI fica em `frontend-native/`. Consulte `frontend-native/README.md` para a configuração detalhada. Para iniciar:

1. Inicie a API na raiz do projeto com `npm start`.
2. Entre em `frontend-native/`, ajuste `API_BASE_URL` em `src/config.ts` e rode `npm install`.
3. Rode `npm start` e, em outro terminal, `npm run android`.

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
