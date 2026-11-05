const { Categoria } = require('../models');
const { Op } = require('sequelize');

const DEFAULT_CATEGORIES = [
  { nome: 'Alimentação', tipo: 'despesa' },
  { nome: 'Transporte', tipo: 'despesa' },
  { nome: 'Moradia', tipo: 'despesa' },
  { nome: 'Saúde', tipo: 'despesa' },
  { nome: 'Lazer', tipo: 'despesa' },
  { nome: 'Educação', tipo: 'despesa' },
  { nome: 'Outros', tipo: 'despesa' },
  { nome: 'Salário', tipo: 'receita' },
  { nome: 'Freelance', tipo: 'receita' },
  { nome: 'Investimento', tipo: 'receita' },
  { nome: 'Presente', tipo: 'receita' }
];

async function ensureDefaultCategories(usuarioId, transaction) {
  const options = transaction ? { transaction } : {};
  const existing = await Categoria.findAll({
    where: {
      usuarioId,
      [Op.or]: DEFAULT_CATEGORIES.map(({ nome, tipo }) => ({ nome, tipo }))
    },
    attributes: ['id', 'nome', 'tipo', 'isPadrao', 'descricao'],
    ...options
  });

  const keyFor = ({ nome, tipo }) => `${tipo}\u0000${nome}`;
  const existingByKey = new Map();
  for (const category of existing) {
    const key = keyFor(category);
    if (!existingByKey.has(key) || category.isPadrao) existingByKey.set(key, category);
  }

  const missing = [];
  for (const category of DEFAULT_CATEGORIES) {
    const existingCategory = existingByKey.get(keyFor(category));
    if (existingCategory) {
      if (!existingCategory.isPadrao) {
        await existingCategory.update({
          isPadrao: true,
          descricao: existingCategory.descricao || 'Categoria padrao'
        }, options);
      }
      continue;
    }

    missing.push({ ...category, descricao: 'Categoria padrao', usuarioId, isPadrao: true });
  }

  if (missing.length) await Categoria.bulkCreate(missing, options);
}

module.exports = { DEFAULT_CATEGORIES, ensureDefaultCategories };
