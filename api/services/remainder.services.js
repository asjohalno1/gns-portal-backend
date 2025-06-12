let DocumentRequest = require("../models/documentRequest");
let mailServices = require("../services/mail.services");
let notification = require("../models/notification");

const sendRemainder = async () => {
    const requests = await DocumentRequest.find({ status: "pending" });
    for (const request of requests) {
        let title = "Reminder"
        let message = `Hi ${request.clientName},\n\nThis is a friendly reminder that you have a document request pending. Please upload them at your earliest convenience to avoid delays.\n\nThank you!`;
        let notificationInfo = {
            emailId: request.clientEmail,
            message:message,
            type:"reminder"
        }
        const newNotification = new notification(notificationInfo)
        await newNotification.save();
        await mailServices(request.clientEmail,title, message);
    }
}

function scheduleDailyReminder(callback) {
    // "0 10 * * *" means every day at 10:00 AM UTC
    cron.schedule("0 10 * * *", () => {
       sendRemainder()
      console.log(`[Reminder] Triggered at ${new Date().toISOString()}`);
      callback();
    });
  
    console.log("✅ Daily reminder scheduled at 10:00 AM UTC");
  }
module.exports = { scheduleDailyReminder}