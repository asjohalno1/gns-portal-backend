let DocumentRequest = require("../models/documentRequest");
let mailServices = require("../services/mail.services");
let notification = require("../models/notification");
let twilioServices = require("../services/twilio.services");
const Client = require("../models/clientModel");

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
        if (request.notifyMethod === "email") {
            await mailServices(request.clientEmail,title, message);
        }else{
            let clientRes = await Client.findById({_id:request.clientId});
            await twilioServices(clientRes.phoneNumber,title, message);
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