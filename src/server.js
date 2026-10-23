require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  let server;

  try {
    await sequelize.authenticate();
    console.log('Conexão com o PostgreSQL realizada com sucesso.');

    await sequelize.sync();
    // Atualizacao aditiva para bancos que ja existiam antes do campo status.
    const fs = require('fs');
    const path = require('path');
    await sequelize.query(fs.readFileSync(path.join(__dirname, '../database/migrations/20261022_add_transaction_status.sql'), 'utf8'));

    await sequelize.query(fs.readFileSync(path.join(__dirname, '../database/migrations/20261022_add_payment_method.sql'), 'utf8'));
    await sequelize.query(fs.readFileSync(path.join(__dirname, '../database/migrations/20261023_add_google_sub.sql'), 'utf8'));

    server = app.listen(PORT);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });

    const portaAtiva = server.address().port;
    console.log('Servidor rodando na porta ' + portaAtiva);
  } catch (error) {
    console.error('Não foi possível iniciar o servidor:', error);
    process.exitCode = 1;
  }
}

iniciarServidor();
