const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'myfinance-test-secret';

const app = require('../src/app');
const models = require('../src/models');
const { sequelize, Usuario, Categoria, Cartao, Transacao, Orcamento, Fatura } = models;
const { adicionarMeses } = require('../src/services/parcelas');
const { DEFAULT_CATEGORIES, ensureDefaultCategories } = require('../src/services/defaultCategories');
const originalConsoleLog = console.log;

const user = { id: 7, tipoUsuario: 'usuario' };
const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5m' });
const auth = { Authorization: `Bearer ${token}` };

function stub(object, key, replacement) {
  const original = object[key];
  object[key] = replacement;
  return () => { object[key] = original; };
}

before(() => {
  // The API app logs each response; keep the test output focused on assertions.
  console.log = () => {};
});

after(() => {
  // Do not leave a process-wide logger mutation behind when tests are imported elsewhere.
  console.log = originalConsoleLog;
});

test('month addition handles month ends, leap years, and year boundaries', () => {
  assert.equal(adicionarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(adicionarMeses('2023-01-31', 1), '2023-02-28');
  assert.equal(adicionarMeses('2024-12-31', 1), '2025-01-31');
  assert.equal(adicionarMeses('2024-01-31', 2), '2024-03-31');
});

test('health check and unknown routes return stable JSON responses', async () => {
  const health = await request(app).get('/health');
  assert.equal(health.status, 200);
  assert.deepEqual(health.body, { status: 'ok' });

  const missing = await request(app).get('/nao-existe');
  assert.equal(missing.status, 404);
  assert.deepEqual(missing.body, { error: 'Rota nao encontrada' });
});

test('private endpoints reject absent and invalid bearer tokens', async () => {
  const absent = await request(app).get('/cartoes');
  assert.equal(absent.status, 401);
  assert.equal(absent.body.error, 'Token nao fornecido');

  const invalid = await request(app).get('/cartoes').set('Authorization', 'Bearer invalid');
  assert.equal(invalid.status, 401);
  assert.equal(invalid.body.error, 'Token invalido ou expirado');
});

test('authenticated card listing is scoped to the signed-in user', async (t) => {
  let query;
  t.after(stub(Cartao, 'findAll', async (options) => { query = options; return []; }));

  const response = await request(app).get('/cartoes').set(auth);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
  assert.equal(query.where.usuarioId, user.id);
});

test('card creation ignores a forged owner id and binds the record to the token owner', async (t) => {
  let created;
  t.after(stub(Cartao, 'create', async (payload) => { created = payload; return { id: 31, ...payload }; }));

  const response = await request(app).post('/cartoes').set(auth).send({
    nome: 'Cartão principal', limite: 2500, vencimento: 12, usuarioId: 999, campoExtra: 'ignorar'
  });
  assert.equal(response.status, 201);
  assert.deepEqual(created, { nome: 'Cartão principal', limite: 2500, vencimento: 12, usuarioId: user.id });
  assert.equal(response.body.usuarioId, user.id);
});

test('category listing prepares defaults and returns records only for the signed-in user', async (t) => {
  let listQuery;
  t.after(stub(Categoria, 'findAll', async (options) => {
    listQuery = options;
    return [];
  }));
  t.after(stub(Categoria, 'bulkCreate', async () => []));

  const response = await request(app).get('/categorias').set(auth);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, []);
  assert.equal(listQuery.where.usuarioId, user.id);
});

test('budget creation rejects a forged user id and stores only supported fields', async (t) => {
  let payload;
  t.after(stub(Orcamento, 'create', async (values) => { payload = values; return { id: 12, ...values }; }));

  const response = await request(app).post('/orcamentos').set(auth).send({
    valor: 800, mes: 10, ano: 2026, usuarioId: 999, campoExtra: true
  });
  assert.equal(response.status, 201);
  assert.deepEqual(payload, { valor: 800, mes: 10, ano: 2026, usuarioId: user.id });
});

test('invoice creation checks ownership of the linked card', async (t) => {
  let created;
  t.after(stub(Cartao, 'findByPk', async () => ({ id: 3, usuarioId: user.id })));
  t.after(stub(Fatura, 'create', async (payload) => { created = payload; return { id: 15, ...payload }; }));

  const response = await request(app).post('/faturas').set(auth).send({
    valor: 125, vencimento: '2026-10-20', paga: false, cartaoId: 3, usuarioId: 999
  });
  assert.equal(response.status, 201);
  assert.deepEqual(created, { valor: 125, vencimento: '2026-10-20', paga: false, cartaoId: 3, usuarioId: user.id });
});

test('transaction updates cannot change the owner or write unknown properties', async (t) => {
  const values = { id: 6, usuarioId: user.id, descricao: 'Antes', toJSON() { return { ...this }; } };
  let updated;
  t.after(stub(Transacao, 'findByPk', async () => values));
  t.after(stub(values, 'update', async function (payload) { updated = payload; Object.assign(this, payload); }));

  const response = await request(app).put('/transacoes/6').set(auth).send({
    descricao: 'Depois', usuarioId: 999, admin: true
  });
  assert.equal(response.status, 200);
  assert.deepEqual(updated, { descricao: 'Depois' });
  assert.equal(values.usuarioId, user.id);
});

test('registration normalizes the email, assigns a regular role, hashes the password, and omits it from output', async (t) => {
  let createdPayload;
  let categoryRows;
  t.after(stub(Usuario, 'findOne', async () => null));
  t.after(stub(Usuario, 'create', async (payload) => {
    createdPayload = payload;
    return { id: 18, ...payload, toJSON() { return { id: 18, ...payload }; } };
  }));
  t.after(stub(sequelize, 'transaction', async (callback) => callback({ registrationTransaction: true })));
  t.after(stub(Categoria, 'findAll', async () => []));
  t.after(stub(Categoria, 'bulkCreate', async (rows) => { categoryRows = rows; }));

  const response = await request(app).post('/usuarios').send({
    nome: '  Ana Silva  ', email: ' ANA@EXAMPLE.COM ', senha: 'senha-segura-123', tipoUsuario: 'admin'
  });
  assert.equal(response.status, 201);
  assert.equal(createdPayload.nome, 'Ana Silva');
  assert.equal(createdPayload.email, 'ana@example.com');
  assert.equal(createdPayload.tipoUsuario, 'usuario');
  assert.equal(await bcrypt.compare('senha-segura-123', createdPayload.senha), true);
  assert.equal(Object.hasOwn(response.body, 'senha'), false);
  assert.equal(categoryRows.length, DEFAULT_CATEGORIES.length);
});

test('login returns a signed token and never includes the password hash', async (t) => {
  const account = {
    id: user.id, nome: 'Ana', email: 'ana@example.com', tipoUsuario: 'usuario', senha: 'stored-hash',
    toJSON() { return { id: this.id, nome: this.nome, email: this.email, tipoUsuario: this.tipoUsuario, senha: this.senha }; }
  };
  t.after(stub(Usuario, 'findOne', async () => account));
  t.after(stub(bcrypt, 'compare', async () => true));
  t.after(stub(Categoria, 'findAll', async () => DEFAULT_CATEGORIES.map((item, id) => ({ id, ...item, isPadrao: true }))));

  const response = await request(app).post('/usuarios/login').send({ email: ' ANA@EXAMPLE.COM ', senha: 'senha-segura' });
  assert.equal(response.status, 200);
  assert.equal(Object.hasOwn(response.body.usuario, 'senha'), false);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).id, user.id);
});

test('profile update reports duplicate email as a conflict without changing the account', async (t) => {
  let updateCalled = false;
  const account = { id: user.id, usuarioId: user.id, email: 'ana@example.com', update: async () => { updateCalled = true; } };
  t.after(stub(Usuario, 'findByPk', async () => account));
  t.after(stub(Usuario, 'findOne', async () => ({ id: 99 })));

  const response = await request(app).put(`/usuarios/${user.id}`).set(auth).send({ email: 'outro@example.com' });
  assert.equal(response.status, 409);
  assert.equal(updateCalled, false);
});

test('password change requires the current password and persists only a newly hashed password', async (t) => {
  const account = { id: user.id, senha: 'old-hash', save: async () => { account.saved = true; } };
  let comparisons = 0;
  t.after(stub(Usuario, 'findByPk', async () => account));
  t.after(stub(bcrypt, 'compare', async () => { comparisons += 1; return comparisons === 1; }));
  t.after(stub(bcrypt, 'hash', async () => 'new-hash'));

  const response = await request(app).put(`/usuarios/${user.id}/senha`).set(auth).send({
    senhaAtual: 'old-password', novaSenha: 'new-password-123'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.mensagem, 'Senha alterada com sucesso.');
  assert.equal(account.senha, 'new-hash');
  assert.equal(account.saved, true);
});

test('transaction creation rejects a category owned by another user', async (t) => {
  let createCalled = false;
  t.after(stub(Categoria, 'findByPk', async () => ({ id: 5, usuarioId: 99 })));
  t.after(stub(Transacao, 'create', async () => { createCalled = true; return {}; }));

  const response = await request(app).post('/transacoes').set(auth).send({
    descricao: 'Compra', valor: 20, tipo: 'despesa', data: '2025-01-15', categoriaId: 5
  });
  assert.equal(response.status, 400);
  assert.match(response.body.error, /categoriaId/);
  assert.equal(createCalled, false);
});

test('installment creation splits cents exactly and preserves the requested monthly dates', async (t) => {
  let savedRows;
  t.after(stub(Categoria, 'findOne', async () => ({ id: 4, usuarioId: user.id, tipo: 'despesa' })));
  t.after(stub(sequelize, 'transaction', async (callback) => callback({ testTransaction: true })));
  t.after(stub(Transacao, 'bulkCreate', async (rows, options) => {
    savedRows = rows;
    assert.deepEqual(options, { transaction: { testTransaction: true }, returning: true, validate: true });
    return rows.map((row, index) => ({ id: index + 1, ...row }));
  }));

  const response = await request(app).post('/transacoes/parceladas').set(auth).send({
    descricao: 'Compra parcelada', valor: 100, tipo: 'despesa', data: '2024-01-31', categoriaId: 4, totalParcelas: 3
  });
  assert.equal(response.status, 201);
  assert.equal(response.body.length, 3);
  assert.deepEqual(savedRows.map((item) => item.valor), [33.34, 33.33, 33.33]);
  assert.deepEqual(savedRows.map((item) => item.data), ['2024-01-31', '2024-02-29', '2024-03-31']);
  assert.deepEqual(savedRows.map((item) => item.numeroParcela), [1, 2, 3]);
  assert.equal(new Set(savedRows.map((item) => item.grupoParcelamento)).size, 1);
});

test('installment creation rejects invalid counts before writing rows', async (t) => {
  let writes = 0;
  t.after(stub(Transacao, 'bulkCreate', async () => { writes += 1; return []; }));

  const response = await request(app).post('/transacoes/parceladas').set(auth).send({
    descricao: 'Compra', valor: 10, tipo: 'despesa', data: '2024-01-31', totalParcelas: 49
  });
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
});

test('default category setup creates missing entries and promotes existing matches without duplicating them', async (t) => {
  const updates = [];
  const seeded = [{
    id: 22, nome: 'Alimentação', tipo: 'despesa', isPadrao: false, descricao: '',
    update: async function (values, options) { updates.push({ values, options }); Object.assign(this, values); }
  }];
  let createdRows = [];
  let findCalls = 0;
  t.after(stub(Categoria, 'findAll', async () => {
    findCalls += 1;
    return findCalls === 1 ? seeded : [
      ...seeded,
      ...DEFAULT_CATEGORIES.filter(({ nome, tipo }) => !(nome === 'Alimentação' && tipo === 'despesa'))
        .map((item, index) => ({ id: 30 + index, ...item, isPadrao: true }))
    ];
  }));
  t.after(stub(Categoria, 'bulkCreate', async (rows) => { createdRows = rows; }));

  await ensureDefaultCategories(user.id);
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].values, { isPadrao: true, descricao: 'Categoria padrao' });
  assert.equal(createdRows.length, DEFAULT_CATEGORIES.length - 1);
  assert.ok(createdRows.every((item) => item.usuarioId === user.id && item.isPadrao));

  createdRows = [];
  await ensureDefaultCategories(user.id);
  assert.equal(createdRows.length, 0);
});

test('transaction status defaults to planned and rejects unknown or future realized states', async () => {
  const base = { descricao: 'Validacao', valor: 10, tipo: 'despesa', data: '2024-01-01' };
  assert.equal(Transacao.build(base).status, 'previsto');
  await Transacao.build({ ...base, status: 'realizado' }).validate();
  await assert.rejects(Transacao.build({ ...base, status: 'invalido' }).validate(), /Validation/);
  await assert.rejects(Transacao.build({ ...base, data: '9999-01-01', status: 'realizado' }).validate(), /futuro/);
  await Transacao.build({ ...base, data: '9999-01-01', status: 'previsto' }).validate();
});

test('transaction editing accepts status and editable fields without changing installment metadata or owner', async (t) => {
  const values = { id: 44, usuarioId: user.id, grupoParcelamento: 'grupo-preservado', numeroParcela: 2, totalParcelas: 3, toJSON() { return { ...this }; } };
  let updated;
  t.after(stub(Transacao, 'findByPk', async () => values));
  t.after(stub(values, 'update', async function(payload) { updated = payload; Object.assign(this,payload); }));
  const response = await request(app).put('/transacoes/44').set(auth).send({ descricao: 'Corrigida', valor: 22, data: '2024-01-02', status: 'realizado', grupoParcelamento: 'forjado', totalParcelas: 48, usuarioId: 999 });
  assert.equal(response.status, 200);
  assert.deepEqual(updated, { descricao: 'Corrigida', valor: 22, data: '2024-01-02', status: 'realizado' });
  assert.equal(values.grupoParcelamento, 'grupo-preservado');
  assert.equal(values.numeroParcela, 2);
  assert.equal(values.totalParcelas, 3);
  assert.equal(values.usuarioId, user.id);
});

test('installments realize only the first installment when requested', async (t) => {
  let rows;
  t.after(stub(sequelize, 'transaction', async cb => cb({})));
  t.after(stub(Transacao, 'bulkCreate', async (items, options) => { rows = items; assert.equal(options.validate, true); return items; }));
  const response = await request(app).post('/transacoes/parceladas').set(auth).send({ descricao: 'Notebook', valor: 100, tipo: 'despesa', data: '2024-01-01', status: 'realizado', totalParcelas: 3 });
  assert.equal(response.status, 201);
  assert.deepEqual(rows.map(item => item.status), ['realizado', 'previsto', 'previsto']);
});

test('status updates preserve authorization and reject other users', async (t) => {
  let written = false;
  t.after(stub(Transacao, 'findByPk', async () => ({ id: 1, usuarioId: 999, update: async () => { written = true; } })));
  const response = await request(app).put('/transacoes/1').set(auth).send({ status: 'realizado' });
  assert.equal(response.status, 403);
  assert.equal(written, false);
});

test('payment methods are validated and removed cards do not erase historical method', async () => {
  const base = { descricao: 'Compra', valor: 10, tipo: 'despesa', data: '2024-01-01', status: 'previsto' };
  const cash = Transacao.build(base);
  await cash.validate();
  assert.equal(cash.formaPagamento, 'a_vista');
  await Transacao.build({ ...base, formaPagamento: 'cartao' }).validate();
  await assert.rejects(Transacao.build({ ...base, formaPagamento: 'a_vista', cartaoId: 3 }).validate(), /não devem ter cartão/);
  await Transacao.build({ ...base, formaPagamento: 'cartao', cartaoId: 3 }).validate();
  const historical = Transacao.build({ ...base, formaPagamento: 'cartao', cartaoId: null }, { isNewRecord: false, raw: true });
  historical.changed(false);
  historical.status = 'realizado';
  await historical.validate();
  assert.equal(historical.formaPagamento, 'cartao');
});

test('payment method is persisted by the API and legacy card-only requests infer it', async (t) => {
  let created;
  t.after(stub(Cartao, 'findByPk', async () => ({ id: 3, usuarioId: user.id })));
  t.after(stub(Transacao, 'create', async payload => { created = payload; return payload; }));
  let response = await request(app).post('/transacoes').set(auth).send({ descricao:'Compra',valor:10,tipo:'despesa',data:'2024-01-01',cartaoId:3 });
  assert.equal(response.status, 201);
  assert.equal(created.formaPagamento,'cartao');
  response = await request(app).post('/transacoes').set(auth).send({ descricao:'Compra',valor:10,tipo:'despesa',data:'2024-01-01',formaPagamento:'a_vista',cartaoId:null });
  assert.equal(response.status, 201);
  assert.equal(created.formaPagamento,'a_vista');
});

test('card installments allow an unspecified card and persist the payment method', async (t) => {
  let rows;
  t.after(stub(sequelize, 'transaction', async cb => cb({})));
  t.after(stub(Transacao, 'bulkCreate', async items => { rows = items; return items; }));
  const response = await request(app).post('/transacoes/parceladas').set(auth).send({descricao:'Compra sem vinculo',valor:100,tipo:'despesa',data:'2024-01-01',formaPagamento:'cartao',totalParcelas:3});
  assert.equal(response.status,201);
  assert.ok(rows.every(row => row.formaPagamento === 'cartao' && row.cartaoId === null));
});
