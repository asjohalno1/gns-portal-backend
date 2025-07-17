const cron = require('node-cron');
const Client = require('../models/clientModel'); // Adjust to your path
const documentRequests = require('../models/documentRequest');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const mongoose = require('mongoose')


async function scheduleDailyReminder(expression, clientIds, templateId, notifyMethod, documentId,dueDate) {
  if(documentId){
  const document = await documentRequests.findOne({ _id: documentId });
  if (!document) {
    console.error(`[Reminder Cron] Document not found for ID: ${documentId}`);
    return;
  }
  cron.schedule(expression, async () => {
    try {
      const { name: doctitle, requestLink, dueDate } = document;
      const clients = await Client.find({ _id: { $in: clientIds } });
      for (const client of clients) {
        const { _id: clientId, email, name } = client;
        if (notifyMethod[0] === "email") {
          const subject = `Reminder: Upload ${doctitle}`;
          const msg = `Dear ${name},\n\nPlease upload the document "${doctitle}" by ${dueDate?.toDateString() || 'the due date'}.\n\nClick here to upload: ${requestLink}`;
          await mailServices.sendEmailRemainder(email, subject, requestLink, name, msg);
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
}else{
  cron.schedule(expression, async () => {
    try {
      const client = await Client.findOne({ _id: clientIds  });
        const { _id: clientId, email, name } = client;
        if (notifyMethod[0] === "email") {
          const subject = `Reminder: Upload ${templateId}`;
          const msg = `Dear ${name},\n\nPlease upload the document "${templateId}" by ${dueDate || 'the due date'}.\n\nClick here to upload: ${requestLink}`;
          await mailServices.sendEmailRemainder(email, subject, "", name, msg);
          console.log(`[Email Reminder] Sent to ${email}`);
        } else if (notifyMethod === "sms") {
          await twilioServices(clientId, templateId, documentId);
          console.log(`[SMS Reminder] Sent to client ${clientId}`);
        }
      
      
    } catch (error) {
      console.error("[Reminder Cron Error]", error);
    }
    
  });
}
}


module.exports = scheduleDailyReminder;
