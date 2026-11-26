const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Etapas de login pendentes (senha já conferida, aguardando o código do e-mail).
// A chave é um identificador aleatório entregue ao app; nunca o e-mail enviado pelo cliente.
// Em produção, troque por Redis ou outro armazenamento com expiração.
const pendentes = new Map();

const VALIDADE_MS = 10 * 60 * 1000;
const MAX_TENTATIVAS = 5;
const INTERVALO_REENVIO_MS = 60 * 1000;

let transporter = null;
const smtpConfigurado = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

function obterTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
  }
  return transporter;
}

const mailer = {
  async enviar(email, nome, codigo) {
    await obterTransporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: 'Seu código de acesso ao MyFinance',
      text: `Olá, ${nome || ''}\n\nSeu código de acesso é ${codigo}. Ele expira em 10 minutos.\nSe não foi você que tentou entrar, troque sua senha.`,
      html: `<p>Olá, ${String(nome || '').replace(/[<>&"]/g, '')}</p><p>Seu código de acesso é <strong style="font-size:22px;letter-spacing:4px">${codigo}</strong>.</p><p>Ele expira em 10 minutos. Se não foi você que tentou entrar, troque sua senha.</p>`
    });
  }
};

const gerarCodigo = () => crypto.randomInt(0, 1000000).toString().padStart(6, '0');

function limparExpirados(agora = Date.now()) {
  for (const [id, item] of pendentes) {
    if (agora - item.criadoEm > VALIDADE_MS) pendentes.delete(id);
  }
}

/** Cria a etapa pendente para um usuário já validado por senha e envia o código ao e-mail do banco. */
async function iniciar(usuario) {
  limparExpirados();
  // Invalida códigos antigos do mesmo usuário.
  for (const [id, item] of pendentes) if (item.usuarioId === usuario.id) pendentes.delete(id);

  const desafioId = crypto.randomBytes(32).toString('hex');
  const codigo = gerarCodigo();
  const agora = Date.now();
  pendentes.set(desafioId, { usuarioId: usuario.id, email: usuario.email, nome: usuario.nome, codigo, criadoEm: agora, enviadoEm: agora, tentativas: 0 });
  try {
    await mailer.enviar(usuario.email, usuario.nome, codigo);
  } catch (error) {
    pendentes.delete(desafioId);
    throw error;
  }
  return { desafioId, expiraEm: VALIDADE_MS / 1000 };
}

/**
 * Confere o código. Retorna { ok: true, usuarioId } ou { ok: false, status, error, tentativasRestantes? }.
 */
function verificar(desafioId, codigo) {
  const item = typeof desafioId === 'string' ? pendentes.get(desafioId) : undefined;
  if (!item) return { ok: false, status: 400, error: 'Código expirado ou inválido. Entre novamente.' };
  if (Date.now() - item.criadoEm > VALIDADE_MS) {
    pendentes.delete(desafioId);
    return { ok: false, status: 400, error: 'Código expirado. Entre novamente para receber outro.' };
  }
  if (item.tentativas >= MAX_TENTATIVAS) {
    pendentes.delete(desafioId);
    return { ok: false, status: 429, error: 'Muitas tentativas. Entre novamente para receber outro código.' };
  }
  const esperado = Buffer.from(item.codigo);
  const recebido = Buffer.from(String(codigo || ''));
  const confere = recebido.length === esperado.length && crypto.timingSafeEqual(recebido, esperado);
  if (!confere) {
    item.tentativas += 1;
    const tentativasRestantes = MAX_TENTATIVAS - item.tentativas;
    if (tentativasRestantes <= 0) pendentes.delete(desafioId);
    return {
      ok: false,
      status: tentativasRestantes <= 0 ? 429 : 400,
      error: tentativasRestantes <= 0
        ? 'Muitas tentativas. Entre novamente para receber outro código.'
        : `Código incorreto. Tentativas restantes: ${tentativasRestantes}.`,
      tentativasRestantes
    };
  }
  pendentes.delete(desafioId); // uso único
  return { ok: true, usuarioId: item.usuarioId };
}

/** Gera e envia um novo código para uma etapa ainda ativa. */
async function reenviar(desafioId) {
  const item = typeof desafioId === 'string' ? pendentes.get(desafioId) : undefined;
  if (!item || Date.now() - item.criadoEm > VALIDADE_MS) {
    if (item) pendentes.delete(desafioId);
    return { ok: false, status: 400, error: 'Código expirado ou inválido. Entre novamente.' };
  }
  const espera = INTERVALO_REENVIO_MS - (Date.now() - item.enviadoEm);
  if (espera > 0) {
    return { ok: false, status: 429, error: `Aguarde ${Math.ceil(espera / 1000)} segundos para pedir outro código.` };
  }
  item.codigo = gerarCodigo();
  item.criadoEm = Date.now();
  item.enviadoEm = item.criadoEm;
  item.tentativas = 0;
  await mailer.enviar(item.email, item.nome, item.codigo);
  return { ok: true, expiraEm: VALIDADE_MS / 1000 };
}

module.exports = { iniciar, verificar, reenviar, smtpConfigurado, mailer, _pendentes: pendentes };
