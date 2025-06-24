const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Setup default uploadDir
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🔹 1. Default PDF Upload Middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const uploadPDF = multer({ storage, fileFilter });

// 🔹 2. Optional: CreateUpload Function (for CSV/XLSX)
function createUpload(folder = '') {
  try{
  const uploadPath = path.join(__dirname, '..', 'uploads', folder);
  fs.mkdirSync(uploadPath, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadPath),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname),
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv and .xlsx files are allowed!'));
    }
  };

  return multer({ storage, fileFilter });
}catch(err){
  console.log(err)
}
}

// ✅ Export both
module.exports = {
  uploadPDF,
  createUpload,
};
