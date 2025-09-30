const mongoose = require('mongoose');

const esrpHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adpFileName: {
    type: String,
    required: true
  },
  calChoiceFileName: {
    type: String,
    default: null
  },
  downloadFileName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for better query performance
esrpHistorySchema.index({ userId: 1, uploadDate: -1 });
esrpHistorySchema.index({ uploadDate: -1 });

module.exports = mongoose.model('ESRPHistory', esrpHistorySchema);
