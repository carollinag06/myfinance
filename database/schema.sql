-- MyFinance - PostgreSQL
-- Execute no Query Tool do pgAdmin conectado a um BANCO VAZIO.
-- Crie antes um banco e configure DB_NAME no .env com o mesmo nome.
-- Exemplo, executado separadamente: CREATE DATABASE myfinance;
-- Este arquivo cria o esquema atual completo; nao execute as migrations
-- legadas de enums depois dele (os modelos atuais usam VARCHAR).
-- Nao e uma migracao para bancos existentes: CREATE TABLE falhara se ja existirem.
-- A API cria as categorias padrao no cadastro e armazena senhas com bcrypt.
-- Datas created_at/updated_at sao mantidas pelo Sequelize; os defaults
-- abaixo tambem permitem insercoes SQL. UPDATE manual deve atualizar updated_at.
-- Regras de propriedade e protecao de categorias padrao sao aplicadas pela API.

BEGIN;

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    tipo_usuario VARCHAR(50) NOT NULL CHECK (tipo_usuario IN ('usuario', 'admin')),
    foto VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao VARCHAR(255),
    tipo VARCHAR(20) NOT NULL DEFAULT 'despesa' CHECK (tipo IN ('receita', 'despesa')),
    is_padrao BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cartoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    numero VARCHAR(20),
    limite DECIMAL(10,2) NOT NULL DEFAULT 0.00 CHECK (limite >= 0),
    vencimento INTEGER CHECK (vencimento BETWEEN 1 AND 31),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transacoes (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    data DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'previsto' CHECK (status IN ('previsto', 'realizado')),
    forma_pagamento VARCHAR(20) CHECK (forma_pagamento IS NULL OR forma_pagamento IN ('a_vista', 'cartao')),
    grupo_parcelamento UUID,
    numero_parcela INTEGER CHECK (numero_parcela >= 1),
    total_parcelas INTEGER CHECK (total_parcelas BETWEEN 2 AND 48),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    cartao_id INTEGER REFERENCES cartoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orcamentos (
    id SERIAL PRIMARY KEY,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL CHECK (ano BETWEEN 1900 AND 9999),
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    categoria_id INTEGER REFERENCES categorias(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE faturas (
    id SERIAL PRIMARY KEY,
    valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
    vencimento DATE NOT NULL,
    paga BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
    cartao_id INTEGER REFERENCES cartoes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indices para consultas por usuario, periodo e relacionamentos.
CREATE INDEX idx_categorias_usuario ON categorias(usuario_id);
CREATE INDEX idx_cartoes_usuario ON cartoes(usuario_id);
CREATE INDEX idx_transacoes_usuario_data ON transacoes(usuario_id, data);
CREATE INDEX idx_transacoes_categoria ON transacoes(categoria_id);
CREATE INDEX idx_transacoes_cartao ON transacoes(cartao_id);
CREATE INDEX idx_transacoes_grupo_parcelamento ON transacoes(grupo_parcelamento)
    WHERE grupo_parcelamento IS NOT NULL;
CREATE INDEX idx_orcamentos_usuario_periodo ON orcamentos(usuario_id, ano, mes);
CREATE INDEX idx_orcamentos_categoria ON orcamentos(categoria_id);
CREATE INDEX idx_faturas_usuario_vencimento ON faturas(usuario_id, vencimento);
CREATE INDEX idx_faturas_cartao ON faturas(cartao_id);

COMMIT;
