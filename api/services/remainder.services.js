const cron = require("node-cron");
const moment = require("moment");
const DocumentRequest = require("../models/documentRequest");
const mailServices = require("../services/mail.services");
const Notification = require("../models/notification");
const twilioServices = require("../services/twilio.services");
const Client = require("../models/clientModel");

const sendRemainder = async () => {
    const today = moment().startOf("day");
    const requests = await DocumentRequest.find({ status: "pending" });

    for (const request of requests) {
        const dueDate = moment(request.dueDate).startOf("day");
        const diffDays = dueDate.diff(today, "days");

        let type = "";
        if (diffDays === 3 && !request.reminderStatus?.includes("ThreeDays")) {
            type = "ThreeDays";
        } else if (diffDays === 1 && !request.reminderStatus?.includes("OneDays")) {
            type = "OneDays";
        } else if (diffDays < 0 && !request.reminderStatus?.includes("overDue")) {
            type = "overDue";
        } else {
            continue; // No reminder needed or already sent
        }

        const title = "Reminder";
        const message = `Hi ${request.name},\n\nThis is a ${
            type === "overDue" ? "final" : "friendly"
        } reminder that you have a document request pending${
            request.dueDate ? ` (Due: ${dueDate.format("YYYY-MM-DD")})` : ""
        }. Please upload the required documents at your earliest convenience.\n\nThank you!`;

        // Save notification
        const notificationInfo = {
            emailId: request.clientEmail,
            message,
            type,
        };
        const newNotification = new Notification(notificationInfo);
        await newNotification.save();

        // Send reminder
        if (request.notifyMethod === "email") {
            await mailServices.sendEmailRemainder(request?.email,title,request?.requestLink,request?.name,"sendReminder",message);
        } else {
            const client = await Client.findById(request.clientId);
            if (client?.phoneNumber) {
                await twilioServices(client.phoneNumber, title, message);
            }
        }

        // Update reminder status
        request.reminderStatus = request.reminderStatus || [];
        request.reminderStatus.push(type);
        await request.save();
    }
};

function scheduleDailyReminder(callback = () => {}) {
    cron.schedule("0 0 * * *", async () => {
        await sendRemainder();
        console.log(`[Reminder] Triggered at ${new Date().toISOString()}`);
        callback();
    });

    console.log("✅ reminder scheduled at 00:00 UTC");
}

module.exports = { scheduleDailyReminder };
