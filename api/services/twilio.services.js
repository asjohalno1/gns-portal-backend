
const twilio = require('twilio');

// Twilio credentials from dashboard
const accountSid = "ACf9281843367b1f0bb793c25c6ceced83";
const authToken = "f1adaa6124649e817cd477ca91c2e02f";
const client = new twilio(accountSid, authToken);

const sendSmsLink = async (phoneNumber, secureLink) => {
    try {


        let smsBody = `Upload docs securely: ${secureLink}`;
        const message = await client.messages.create({
            body: smsBody,
            from: '+18148854108', // Your Twilio number
            to: `+91${phoneNumber}`      // User's phone number in E.164 format (+91 for India, etc.)
        });
        console.log('SMS sent successfully:', message.sid);

    } catch (error) {
        console.error('Error sending SMS:', error);
    }
}
module.exports = { sendSmsLink };

// Example usage
// sendSmsLink('+919876543210', 'https://example.com/upload/secure-token');
