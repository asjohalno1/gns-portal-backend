const { request } = require('http');
const resModel = require('../lib/resModel');
let Category = require("../models/category");
let DocumentRequest = require("../models/documentRequest");
const template = require('../models/template');
const jwt = require('../services/jwt.services');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const Client = require('../models/clientModel');




/**
 * @api {post} /api/staff/requestDocument  Document Request
 * @apiName Document Request
 * @apiGroup Staff
 * @apiBody {Array} clientId  client Id.
 * @apiBody {String} categoryId  categoryId.
 * @apiBody {String} subCategoryId  SubCategoryId.
 * @apiBody {String} dueDate  DueDate.
 * @apiBody {String} instructions  Instructions.
 * @apiBody {String} expiration  Expiration.
 * @apiBody {String} linkMethod  Link Method.
 * @apiBody {String} templateId  Template Id.
 * @apiBody {String} notifyMethod Notification method (e.g., email, sms).
 * @apiBody {String} remainderSchedule Reminder schedule (e.g., "ThreeDays", "OneDays","overDue").
 * @apiHeader {String} authorization Authorization.
 * @apiDescription Staff Service...
 * @apiSampleRequest http://localhost:2001/api/staff/requestDocument 
 */


module.exports.documentRequest = async (req, res) => {
    try {
        let {
            templateId,
            clientId,
            categoryId,
            subCategoryId,
            dueDate,
            instructions,
            notifyMethod,
            remainderSchedule,
            expiration,
            linkMethod
        } = req.body;
        let templateData = null;
        // If templateId is provided, try fetching the template
        if (templateId) {
            templateData = await template.findById(templateId);
            // Override only missing fields with template values
            categoryId = templateData.categoryId || categoryId;
            subCategoryId = templateData.subCategoryId || subCategoryId;
            notifyMethod = templateData.notifyMethod || notifyMethod;
            remainderSchedule = templateData.remainderSchedule || remainderSchedule;
            instructions = templateData.message || instructions; "";
        }
        let requestRes;
        for (const client of clientId) {
            const requestInfo = {
                createdBy: req.userInfo.id,
                clientId: client,
                category: categoryId,
                subCategory: subCategoryId,
                dueDate,
                instructions,
                notifyMethod,
                remainderSchedule,
                templateId: templateId || null,
                expiration,
                linkMethod
            };

            const newRequest = new DocumentRequest(requestInfo);
            requestRes = await newRequest.save();
            let clientRes = await Client.findById({ _id: client });
            let tokenInfo = {
                clientId: client,
                userId: req.userInfo.id,
                requestId: requestRes?._id,
                email: clientRes?.email
            }
            let expiresIn = parseInt(expiration)
            let requestLink = await jwt.linkToken(tokenInfo, expiresIn)
          
            if (linkMethod === "email") {
              await mailServices.sendEmail(clientRes?.email,"Document Request",requestLink,clientRes?.name,"shareLink");
            } else {
               // twilioServices(clientRes?.phoneNumber, requestLink)
            }
            //console.log(requestLink)
        }
        if (requestRes) {
            resModel.success = true;
            resModel.message = "Request Added Successfully";
            resModel.data = requestRes
            res.status(200).json(resModel)

        } else {
            resModel.success = false;
            resModel.message = "Error while creating Request";
            resModel.data = null;
            res.status(400).json(resModel);
        }

    } catch (error) {
        resModel.success = false;
        resModel.message = "Internal Server Error";
        resModel.data = null;
        res.status(500).json(resModel);
    }
};
