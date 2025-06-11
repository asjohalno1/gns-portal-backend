const multer = require('multer');
const path = require('path');
const fs = require('fs');

let uploadDir;

try {
  // Define and ensure 'uploads/' directory exists
  uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.error('Failed to set up uploads directory:', err.message);
  throw err; // Re-throw to prevent server from running with broken config
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      cb(null, uploadDir);
    } catch (err) {
      cb(new Error('Failed to set upload destination'), null);
    }
  },
  filename: (req, file, cb) => {
    try {
      const ext = path.extname(file.originalname);
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      cb(null, uniqueName);
    } catch (err) {
      cb(new Error('Failed to generate filename'), null);
    }
  }
});

const fileFilter = (req, file, cb) => {
  try {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  } catch (err) {
    cb(new Error('File filter error'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
