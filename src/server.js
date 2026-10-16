require('dotenv').config();
const app = require('./app');
const { sequelize } = require('./models');

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log('Conexão com o PostgreSQL realizada com sucesso.');

    await sequelize.sync();

    app.listen(PORT, () => {
      console.log('Servidor rodando na porta ' + PORT);
    });
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
}

iniciarServidor();