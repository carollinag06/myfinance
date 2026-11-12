// Configura o envio de e-mails usados pela recuperação de senha.
const nodemailer = require('nodemailer');

function emailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function criarTransportador() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function enviarLinkRecuperacao(to, link) {
  const productName = process.env.APP_NAME || 'MyFinance';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const htmlLink = link.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const transporter = criarTransportador();
  await transporter.sendMail({
    from: { name: productName, address: from },
    to,
    subject: `Link para recuperar sua senha | ${productName}`,
    text: `Abra este link para criar uma nova senha. Ele expira em 30 minutos e só pode ser usado uma vez:\n\n${link}\n\nSe você não pediu para trocar a senha, ignore este e-mail.`,
    html: `<div style="font-family:Arial,sans-serif;color:#211b2b;max-width:520px;margin:auto;padding:28px"><h1 style="font-size:22px">Recupere seu acesso</h1><p>Use o botão abaixo para criar uma nova senha. O link expira em 30 minutos e só pode ser usado uma vez.</p><p style="margin:28px 0"><a href="${htmlLink}" style="background:#8a2be2;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">Criar nova senha</a></p><p style="color:#726b7b;font-size:13px">Se você não pediu para trocar a senha, ignore este e-mail.</p></div>`
  });
}

module.exports = { emailConfigurado, enviarLinkRecuperacao };
