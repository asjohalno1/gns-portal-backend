const nodemailer = require("nodemailer");
const generateTemplate = require("../../templates/link.ejs");
const reminderTemplate = require("../../templates/reminder.ejs");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "shaktisainisd@gmail.com",
    pass: "pxrf kfwe yiyo jxjb", // Your Gmail App Password
  },
});

const sendEmail = async (email, subject, link, name,doctitle,deadline,docList,instructions,title,description) => {
  try {
    const htmlContent = await generateTemplate({ name,link,doctitle,deadline,docList,instructions,title,description});

    const info = await transporter.sendMail({
      from: 'shaktisainisd@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


const sendEmailRemainder = async (email, subject, link, name = "User", msg) => {
  try {
    const htmlContent = await reminderTemplate({ name, link, msg });

    const info = await transporter.sendMail({
      from: 'shaktisainisd@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};



module.exports = { sendEmail, sendEmailRemainder };