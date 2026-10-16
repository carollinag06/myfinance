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
   conectado ao banco configurado e execute os SQLs em
   `database/migrations/`. Eles adicionam os valores usados pela API aos
   enums existentes sem remover opções ou registros anteriores.

4. Inicie a API:

   ~~~bash
   npm start
   ~~~

Na inicialização, a aplicação autentica no PostgreSQL e sincroniza os modelos do Sequelize. O endpoint GET /health retorna {"status":"ok"} quando o servidor está disponível.

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
| GET, PUT, DELETE | /transacoes/:id | Autenticado; proprietário ou administrador |
| GET, POST | /orcamentos | Autenticado |
| GET, PUT, DELETE | /orcamentos/:id | Autenticado; proprietário ou administrador |
| GET, POST | /faturas | Autenticado |
| GET, PUT, DELETE | /faturas/:id | Autenticado; proprietário ou administrador |

As listagens podem ser filtradas por usuarioId quando chamadas por um administrador. Usuários comuns veem apenas os próprios registros. Cartões e categorias associados a transações, orçamentos e faturas devem pertencer ao mesmo usuário do registro.

## Regras de dados

- Valores de transação, orçamento e fatura devem ser maiores que zero.
- transacoes.tipo aceita receita ou despesa.
- Datas de transações e vencimentos de faturas usam AAAA-MM-DD.
- orcamentos.mes deve estar entre 1 e 12; orcamentos.ano, entre 1900 e 9999.
- O limite do cartão deve ser zero ou maior. O dia de vencimento, quando informado, deve estar entre 1 e 31.

## Observações

O package.json ainda não define uma suíte de testes; o script npm test é apenas um marcador.

## Aplicativo mobile

O front end Expo fica em `frontend/`. Consulte `frontend/README.md` para a configuração detalhada. Para iniciar:

1. Inicie a API na raiz do projeto com `npm start`.
2. Em outro terminal, entre em `frontend/`, configure `EXPO_PUBLIC_API_URL` no `.env` conforme o emulador ou dispositivo e rode `npm install`.
3. Rode `npx expo start` dentro de `frontend/`.

O aplicativo inclui login e cadastro, resumo financeiro, transações, cartões, categorias, orçamentos e faturas.
