const createCrudController = ({ model, resourceName, fields, include = [], ownershipRelations = [] }) => {
  const getPayload = (body) => Object.fromEntries(
    Object.entries(body || {}).filter(([key, value]) => fields.includes(key) && value !== undefined)
  );

  const handleError = (res, error, action) => {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Dados invalidos', detalhes: error.errors.map(({ message }) => message) });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Registro ja existente' });
    }

    return res.status(500).json({ error: 'Erro ao ' + action + ' ' + resourceName, detalhes: error.message });
  };

  const isAdmin = (req) => req.usuario && req.usuario.tipoUsuario === 'admin';

  const getIncludes = (req) => {
    if (isAdmin(req) || !fields.includes('usuarioId')) {
      return include;
    }

    return include.map((relation) => {
      if (!relation.model.rawAttributes || !relation.model.rawAttributes.usuarioId) {
        return relation;
      }

      return {
        ...relation,
        required: false,
        where: { ...(relation.where || {}), usuarioId: req.usuario.id }
      };
    });
  };

  const findInvalidOwnershipRelation = async (data, usuarioId) => {
    for (const { field, model: relationModel } of ownershipRelations) {
      const relationId = data[field];
      if (relationId === undefined || relationId === null) {
        continue;
      }

      const relatedRecord = await relationModel.findByPk(relationId, {
        attributes: ['id', 'usuarioId']
      });

      if (!relatedRecord || Number(relatedRecord.usuarioId) !== Number(usuarioId)) {
        return field;
      }
    }

    return null;
  };

  const invalidRelationResponse = (res, field) => (
    res.status(400).json({ error: 'Relacionamento invalido ou nao pertence ao usuario: ' + field })
  );

  const listar = async (req, res) => {
    try {
      const where = {};

      if (fields.includes('usuarioId')) {
        if (isAdmin(req)) {
          if (req.query.usuarioId) {
            where.usuarioId = req.query.usuarioId;
          }
        } else {
          where.usuarioId = req.usuario.id;
        }
      }

      const registros = await model.findAll({ where, include: getIncludes(req), order: [['id', 'ASC']] });
      return res.status(200).json(registros);
    } catch (error) {
      return handleError(res, error, 'listar');
    }
  };

  const buscar = async (req, res) => {
    try {
      const registro = await model.findByPk(req.params.id, { include: getIncludes(req) });
      if (!registro) {
        return res.status(404).json({ error: resourceName + ' nao encontrado' });
      }

      if (!isAdmin(req) && fields.includes('usuarioId') && registro.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      return res.status(200).json(registro);
    } catch (error) {
      return handleError(res, error, 'buscar');
    }
  };

  const criar = async (req, res) => {
    try {
      const payload = getPayload(req.body);

      if (fields.includes('usuarioId') && !isAdmin(req)) {
        payload.usuarioId = req.usuario.id;
      }

      const invalidRelation = await findInvalidOwnershipRelation(payload, payload.usuarioId);
      if (invalidRelation) {
        return invalidRelationResponse(res, invalidRelation);
      }

      const registro = await model.create(payload);
      return res.status(201).json(registro);
    } catch (error) {
      return handleError(res, error, 'criar');
    }
  };

  const atualizar = async (req, res) => {
    try {
      const registro = await model.findByPk(req.params.id);
      if (!registro) {
        return res.status(404).json({ error: resourceName + ' nao encontrado' });
      }

      if (!isAdmin(req) && fields.includes('usuarioId') && registro.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const payload = getPayload(req.body);

      if (fields.includes('usuarioId') && !isAdmin(req)) {
        delete payload.usuarioId;
      }

      if (!Object.keys(payload).length) {
        return res.status(400).json({ error: 'Informe ao menos um campo para atualizar' });
      }

      const relationshipChanged = ownershipRelations.some(({ field }) => (
        Object.prototype.hasOwnProperty.call(payload, field)
      )) || (isAdmin(req) && Object.prototype.hasOwnProperty.call(payload, 'usuarioId'));

      if (relationshipChanged) {
        const finalData = { ...registro.toJSON(), ...payload };
        const invalidRelation = await findInvalidOwnershipRelation(finalData, finalData.usuarioId);
        if (invalidRelation) {
          return invalidRelationResponse(res, invalidRelation);
        }
      }

      await registro.update(payload);
      return res.status(200).json(registro);
    } catch (error) {
      return handleError(res, error, 'atualizar');
    }
  };

  const remover = async (req, res) => {
    try {
      const registro = await model.findByPk(req.params.id);
      if (!registro) {
        return res.status(404).json({ error: resourceName + ' nao encontrado' });
      }

      if (!isAdmin(req) && fields.includes('usuarioId') && registro.usuarioId !== req.usuario.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      await registro.destroy();
      return res.status(204).send();
    } catch (error) {
      return handleError(res, error, 'remover');
    }
  };

  return { listar, buscar, criar, atualizar, remover };
};

module.exports = createCrudController;