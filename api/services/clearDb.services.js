let category = require("../models/category");
const subCategory = require('../models/subCategory');
const assignClient = require('../models/assignClients');
const uploadDocuments = require('../models/uploadDocuments');
const logModel = require('../models/userLog');
const requestDocument = require('../models/documentRequest');
const template = require('../models/template');
const DocumentSubCategory = require('../models/documentSubcategory');
const Reminder = require('../models/remainer');
const clients = require('../models/clientModel');
const { message } = require("../lib/resModel");


module.exports.handleDelete = async (req,res) => {
    try {
        await category.deleteMany({});
        await subCategory.deleteMany({});
        await assignClient.deleteMany({});
        await uploadDocuments.deleteMany({});
        await logModel.deleteMany({});
        await requestDocument.deleteMany({});
        await clients.deleteMany({});
        await DocumentSubCategory.deleteMany({});
        await template.deleteMany({});
        await Reminder.deleteMany({});
        res.status(200).json({ success: true, message: `All deleted successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: `Failed to delete ${modelName}`, error: error.message });
    }
};