const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup default uploadDir
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🔹 1. Default File Upload Middleware (for PDF, JPG, PNG)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

// Updated file filter for multiple types
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are allowed'), false);
  }
};

const uploadFiles = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// 🔹 2. Specialized Upload for CSV/XLSX
function createUpload(folder = '') {
  try {
    const uploadPath = path.join(__dirname, '..', 'uploads', folder);
    fs.mkdirSync(uploadPath, { recursive: true });

    const storage = multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploadPath),
      filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = ['.csv', '.xlsx','.jpg'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Only .csv and .xlsx files are allowed!'));
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for these files too
    });
  } catch (err) {
    console.error('Error creating upload:', err);
    throw err; // Re-throw to handle at calling level
  }
}

module.exports = {
  uploadPDF: uploadFiles, // Renamed to be more accurate
  createUpload,
};