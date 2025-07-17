const cron = require('node-cron');
const Client = require('../models/clientModel'); // Adjust to your path
const UploadedDocument = require('../models/uploadDocuments');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const mongoose = require('mongoose')


async function scheduleDailyReminder(expression, clientIds, templateId, notifyMethod, documentId) {
  const document = await UploadedDocument.findOne({ request: documentId });
  if (!document) {
    console.error(`[Reminder Cron] Document not found for ID: ${documentId}`);
    return;
  }
  cron.schedule(expression, async () => {
    try {
     const { name: docName, link, dueDate } = document;
      const clients = await Client.find({ _id: { $in: clientIds } });
      for (const client of clients) {
        const { _id: clientId, email, name } = client;

        if (notifyMethod[0] === "email") {
          const subject = `Reminder: Upload ${docName}`;
          const msg = `Dear ${name},\n\nPlease upload the document "${docName}" by ${dueDate?.toDateString() || 'the due date'}.\n\nClick here to upload: ${link}`;

          await mailServices.sendEmailRemainder(email, subject, link, name, msg);
          console.log(`[Email Reminder] Sent to ${email}`);
        } else if (notifyMethod === "sms") {
          await twilioServices(clientId, templateId, documentId);
          console.log(`[SMS Reminder] Sent to client ${clientId}`);
        }
      }
    } catch (error) {
      console.error("[Reminder Cron Error]", error);
    }
  });
}


module.exports = scheduleDailyReminder;
