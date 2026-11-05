const bcrypt = require('bcrypt');

// Custo do salt (10 é o padrão recomendado para um bom equilíbrio entre segurança e performance)
const SALT_ROUNDS = 10;

/**
 * Gera um hash seguro a partir de uma senha em texto plano.
 * @param {string} senha - Senha do usuário.
 * @returns {Promise<string>} Hash gerado.
 */
const gerarHash = async (senha) => {
  return await bcrypt.hash(senha, SALT_ROUNDS);
};

/**
 * Compara uma senha fornecida com o hash armazenado no banco de dados.
 * @param {string} senha - Senha enviada na tentativa de login.
 * @param {string} hash - Hash salvo no banco de dados.
 * @returns {Promise<boolean>} Retorna true se a senha for válida, false caso contrário.
 */
const compararSenha = async (senha, hash) => {
  return await bcrypt.compare(senha, hash);
};

module.exports = {
  gerarHash,
  compararSenha,
};