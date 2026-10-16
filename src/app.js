const express = require('express');
const cors = require('cors');
const path = require('path');
const usuarioRoutes = require('./routes/usuarioRoutes');
const categoriaRoutes = require('./routes/categoriaRoutes');
const cartaoRoutes = require('./routes/cartaoRoutes');
const transacaoRoutes = require('./routes/transacaoRoutes');
const orcamentoRoutes = require('./routes/orcamentoRoutes');
const faturaRoutes = require('./routes/faturaRoutes');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/usuarios', usuarioRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/cartoes', cartaoRoutes);
app.use('/transacoes', transacaoRoutes);
app.use('/orcamentos', orcamentoRoutes);
app.use('/faturas', faturaRoutes);

app.get('/health', (req, res) => {
	res.status(200).json({ status: 'ok' });
});

app.use((req, res) => {
	res.status(404).json({ error: 'Rota nao encontrada' });
});

module.exports = app;