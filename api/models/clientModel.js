// models/Notification.js
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    phoneNumber: {
        type: String,
    },
    address: {
        type: String,
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
    zipCode: {
        type: String,
    },
    status: {
        type: Boolean,
        default: false,
    },
    // clientType: {
    //     type: String,
    //     enum: ['individual', 'smallBusiness', 'corporation'],
    //     default: 'pending'
    // },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('client', clientSchema);
