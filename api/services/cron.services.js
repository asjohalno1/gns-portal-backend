const cron = require('node-cron');
const Client = require('../models/clientModel');
const documentRequests = require('../models/documentRequest');
const mailServices = require('../services/mail.services');
const twilioServices = require('../services/twilio.services');
const mongoose = require('mongoose');

async function scheduleDailyReminder(expression, clientIds, notifyMethod, documentId, documentTitle, duedate) {
  if (documentId) {
    const document = await documentRequests.findOne({ _id: documentId });
    if (!document) {
      console.error(`[Reminder Cron] Document not found for ID: ${documentId}`);
      return;
    }

    // 👇 Add timezone here
    cron.schedule(expression, async () => {
      try {
        const documents = await documentRequests.findOne({ _id: documentId });
        const { doctitle, requestLink } = documents;
        const clients = await Client.find({ _id: { $in: clientIds } });
        for (const client of clients) {
          const { email, name } = client;
          if (notifyMethod.includes("email")) {
            const subject = `Reminder: Upload ${doctitle}`;
            await mailServices.sendEmailRemainder(email, subject, requestLink, name, duedate, documentTitle);
            console.log(`[Email Reminder] Sent to ${email}`);
          }
          if (notifyMethod.includes("sms")) {
            await twilioServices.sendSmsReminder(name, documentTitle, duedate, client?.phoneNumber, requestLink);
            console.log(`[SMS Reminder] Sent to client ${name}`);
          }
        }
      } catch (error) {
        console.error("[Reminder Cron Error]", error);
      }
    }, {
      timezone: "America/Los_Angeles"   // ✅ Run in PST/PDT timezone
    });

  } else {
    cron.schedule(expression, async () => {
      try {
        const client = await Client.findOne({ _id: clientIds });
        if (!client) return;

        const { email, name } = client;
        const document = await documentRequests.findOne({ _id: documentId });
        if (!document) {
          console.error(`[Reminder Cron] Document not found for ID: ${documentId}`);
          return;
        }
        const { doctitle, requestLink } = document;

        if (notifyMethod.includes("email")) {
          const subject = `Reminder: Upload ${doctitle}`;
          await mailServices.sendEmailRemainder(email, subject, requestLink, name, duedate, documentTitle);
          console.log(`[Email Reminder] Sent to ${email}`);
        }
        if (notifyMethod.includes("sms")) {
          await twilioServices.sendSmsReminder(name, documentTitle, duedate, client?.phoneNumber, requestLink);
          console.log(`[SMS Reminder] Sent to client ${name}`);
        }

      } catch (error) {
        console.error("[Reminder Cron Error]", error);
      }
    }, {
      timezone: "America/Los_Angeles"   // ✅ Run in PST/PDT timezone
    });
  }
}

module.exports = scheduleDailyReminder;
