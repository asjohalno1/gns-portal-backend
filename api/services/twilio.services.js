
const twilio = require('twilio');

// Twilio credentials from dashboard
const accountSid = "ACe8a5448f3d92c946c407a0eaf70f09f1";
const authToken = "1546b35e584fafd967e15ffe58be4eec";
const client = new twilio(accountSid, authToken);

const sendSmsLink = async (phoneNumber, secureLink) => {
    try {


        let smsBody = `Upload docs securely: ${secureLink}`;
        const message = await client.messages.create({
            body: smsBody,
            from: '+19517245831', // Your Twilio number
            to: `+1${phoneNumber}`      // User's phone number in E.164 format (+91 for India, etc.)
        });
        console.log('SMS sent successfully:', message.sid);

    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}

const sendSmsReminder = async (name, documentTitle, duedate, phoneNumber, link) => {
    try {
        if (phoneNumber) {
            let smsBodys = `Hi ${name}, This is Mia from G&S Accountancy. We've emailed you a list of documents needed for your ${documentTitle}.Please review the email or upload documents using G&S Secure Portal. Let me know if you need assistance.My contact detail is mia@gns-cpas.com or +1 909.217.7855`
            const message = await client.messages.create({
                body: smsBodys,
                from: '+19517245831', // Your Twilio number
                to: `+1${phoneNumber}`      // User's phone number in E.164 format (+91 for India, etc.)
            });
            console.log('SMS sent successfully:', message.sid);
        } else {
            console.log("Phone Number Empty Currently Can't Share SMS");
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
module.exports = { sendSmsLink, sendSmsReminder };

