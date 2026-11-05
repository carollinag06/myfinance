const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, `${crypto.randomUUID()}${extensionByMimeType[file.mimetype] || '.img'}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 10,
    parts: 11
  },
  fileFilter: (req, file, cb) => {
    if (!extensionByMimeType[file.mimetype]) {
      const error = new Error('Formato de foto não suportado.');
      error.code = 'INVALID_IMAGE_TYPE';
      return cb(error);
    }
    return cb(null, true);
  }
});

module.exports = upload;
