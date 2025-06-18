
const mongoose = require('mongoose');

const assignClientSchema = new mongoose.Schema({
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Staff
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
},
{ timestamps: true }
);

module.exports = mongoose.model('assignClient', assignClientSchema);
