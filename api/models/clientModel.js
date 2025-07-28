// models/Notification.js
const mongoose = require('mongoose');
const folder = require('./folder');

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
    company: {
        type: String,
    },
    status: {
        type: Boolean,
        default: false,
    },
    isGoogleDrive: {
        type: Boolean,
        default: false,
    },
    notes: {
        type: String,
    },
    folderId: {
        type: String,
    },
    profilePicture: {
        type: String,
        default: 'default-profile.png',
    },
    dateOfBirth: {
        type: Date,
    },

    createdAt: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model('Client', clientSchema);
