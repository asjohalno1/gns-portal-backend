const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",       // Replace with your SMTP host
  port: 587,                      // Use 465 for SSL, 587 for TLS
  secure: false,                  // Set true for port 465, false for other ports
  auth: {
    user: "shaktisainisd@gmail.com",  // SMTP username
    pass: "Welcome@1",     // SMTP password
  },
});

// Send mail
const sendEmail= async(email,subject,link)=> {
  try {
    const info = await transporter.sendMail({
      from: 'shaktisainisd@gmail.com',
      to: email,
      subject: subject,
      text: link,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = sendEmail;
