const { processESRPFiles } = require('../services/esrp.services');
const { createUpload } = require('../services/multer.services');
const ESRPHistory = require('../models/esrpHistory');
const path = require('path');
const fs = require('fs');

// Create multer upload middleware for ESRP files
const uploadESRP = createUpload('esrp');

const handleESRPUpload = async (req, res) => {
  try {
    console.log('ESRP Upload Request received');
    console.log('req.files:', req.files);
    console.log('req.body:', req.body);
    
    const { adpFile, calChoiceFile } = req.files || {};
    const { customFilename } = req.body || {};
    const userId = req.userInfo?.id;

    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
        data: null
      });
    }

    if (!req.files || !adpFile[0]) {
      console.log('No ADP file found in request');
      return res.status(400).json({
        status: false,
        message: "No ADP file uploaded",
        data: null
      });
    }
    
    const result = await processESRPFiles(adpFile[0], calChoiceFile?.[0], customFilename);

    // Save upload history to database
    try {
      const historyRecord = new ESRPHistory({
        userId: userId,
        adpFileName: adpFile[0].originalname,
        calChoiceFileName: calChoiceFile?.[0]?.originalname || null,
        downloadFileName:result.filename
      });

      await historyRecord.save();
      console.log('✅ ESRP upload history saved successfully');
    } catch (historyError) {
      console.error('❌ Error saving ESRP history:', historyError);
      // Don't fail the main request if history saving fails
    }

    return res.status(200).json({
      status: true,
      message: result.message,
      data: {
        filename: result.filename,
        downloadUrl: result.downloadUrl
      }
    });

  } catch (err) {
    console.error("❌ ESRP Controller Error:", err);
    return res.status(500).json({
      status: false,
      message: err.message || "Internal server error",
      data: null
    });
  }
};

const downloadESRPFile = async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('api/uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        status: false,
        message: "File not found",
        data: null
      });
    }

    // Set appropriate headers for file download
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    // Clean up file after download (optional)
    fileStream.on('end', () => {
      // Optionally delete the file after successful download
      // fs.unlinkSync(filePath);
    });

  } catch (err) {
    console.error("❌ ESRP Download Error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to download file",
      data: null
    });
  }
};

const getESRPHealth = async (req, res) => {
  return res.status(200).json({
    status: true,
    message: "ESRP service is healthy",
    data: {
      timestamp: new Date().toISOString(),
      service: "ESRP"
    }
  });
};

const getESRPHistory = async (req, res) => {
  try {
    const userId = req.userInfo?.id;
    
    if (!userId) {
      return res.status(401).json({
        status: false,
        message: "User authentication required",
        data: null
      });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await ESRPHistory.countDocuments({ userId: userId });

    // Get history records with pagination
    const historyRecords = await ESRPHistory.find({ userId: userId })
      .sort({ uploadDate: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean();

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      status: true,
      message: "ESRP history retrieved successfully",
      data: {
        records: historyRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: totalPages,
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit)
        }
      }
    });

  } catch (err) {
    console.error("❌ ESRP History Error:", err);
    return res.status(500).json({
      status: false,
      message: "Failed to retrieve ESRP history",
      data: null
    });
  }
};

module.exports = {
  handleESRPUpload,
  downloadESRPFile,
  getESRPHealth,
  getESRPHistory,
  uploadESRP
};
