const fs = require('fs/promises');
const multer = require('multer');
const upload = require('../config/multer');

function assinaturaValida(buffer, mimeType, bytesRead) {
  if (mimeType === 'image/jpeg') {
    return bytesRead >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mimeType === 'image/webp') {
    return bytesRead >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
  }
  return false;
}

async function validatePhoto(req, res, next) {
  if (!req.file) return next();

  let fileHandle;
  try {
    fileHandle = await fs.open(req.file.path, 'r');
    const header = Buffer.alloc(12);
    const { bytesRead } = await fileHandle.read(header, 0, header.length, 0);
    await fileHandle.close();
    fileHandle = null;

    if (!assinaturaValida(header, req.file.mimetype, bytesRead)) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({ error: 'O arquivo enviado não corresponde a uma imagem JPEG, PNG ou WebP válida.' });
    }

    res.once('finish', () => {
      if (res.statusCode >= 400) void fs.unlink(req.file.path).catch(() => {});
    });
    return next();
  } catch (error) {
    if (fileHandle) await fileHandle.close().catch(() => {});
    await fs.unlink(req.file.path).catch(() => {});
    console.error('Falha ao validar foto:', error.name, error.message);
    return res.status(500).json({ error: 'Não foi possível validar a foto.' });
  }
}

function fotoUpload(req, res, next) {
  upload.single('foto')(req, res, (error) => {
    if (!error) return validatePhoto(req, res, next);
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'A foto deve ter no máximo 5 MB.' });
    }
    if (error.code === 'INVALID_IMAGE_TYPE') {
      return res.status(400).json({ error: 'Envie uma imagem JPEG, PNG ou WebP.' });
    }
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: 'Não foi possível processar o arquivo enviado.' });
    }
    return res.status(500).json({ error: 'Não foi possível processar a foto.' });
  });
}

module.exports = fotoUpload;
