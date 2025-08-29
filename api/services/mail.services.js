const nodemailer = require("nodemailer");
const generateTemplate = require("../../templates/link.ejs");
const reminderTemplate = require("../../templates/reminder.ejs");
const emailTemplate = require("../models/emailTemplates.js");
const generateAddStaffTemplate = require("../../templates/staffAdded.ejs");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "shaktisainisd@gmail.com",
    pass: "pxrf kfwe yiyo jxjb", // Your Gmail App Password
  },
});

const sendEmail = async (email, subject, link, name, doctitle, deadline, docLists, instructions, title, description, linkNote) => {
  try {
    // remove category "Others" if exists
    let docList = Array.isArray(docLists)
      ? docLists.filter(group => group.category !== "Others")
      : [];

    // fetch email template from DB
    let dataRes = await emailTemplate.findOne({ listType: "Document Request" });
    let dbTemplate = `${dataRes?.description}`;

    // sanitize quill HTML to remove extra spacing
    dbTemplate = dbTemplate
      .replace(/<p>/g, '<p style="margin:0; padding:0;">') // remove default margins
      .replace(/<div>/g, '<div style="margin:0; padding:0;">') // same for divs
      .replace(/<br>/g, '<br style="line-height:1;">'); // control line height

    // format document list with categories
    const formattedDocList = docList
      .map(group => {
        const items = group.items
          .map(item => `<li style="margin:0; padding:2px 0;">${item}</li>`)
          .join("");
        return `<p style="margin:0; padding:4px 0;"><strong>${group.category}</strong></p><ul style="margin:0; padding-left:15px;">${items}</ul>`;
      })
      .join("");

    // inject into template
    const htmlContent = dbTemplate
      .replace(/{{name}}/g, name)
      .replace(/{{title}}/g, doctitle)
      .replace(/{{deadline}}/g, deadline)
      .replace(/{{documentList}}/g, formattedDocList)
      .replace(/{{instructions}}/g, instructions)
      .replace(/{{link}}/g, link);

    // send email
    const info = await transporter.sendMail({
      from: "shaktisainisd@gmail.com",
      to: email,
      subject: subject,
      html: htmlContent,
    });

  } catch (error) {
    console.error("Error sending email:", error);
  }
};



const sendEmailRemainder = async (email, subject, link, name = "User", deadline, title) => {
  try {
    let dataRes = await emailTemplate.findOne({ listType: "Reminder" });
    let dbTemplate = `${dataRes?.description}`;

    // sanitize quill HTML to remove extra spacing (same as sendEmail)
    dbTemplate = dbTemplate
      .replace(/<p>/g, '<p style="margin:0; padding:0;">')
      .replace(/<div>/g, '<div style="margin:0; padding:0;">')
      .replace(/<br>/g, '<br style="line-height:1;">');

    // replace variables
    let htmlContent = dbTemplate
      .replace(/{{name}}/g, name)
      .replace(/{{title}}/g, title)
      .replace(/{{deadline}}/g, deadline)
      .replace(/{{link}}/g, link);

    // final cleanup (extra whitespace between tags)
    htmlContent = htmlContent
      .replace(/\n+/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/>\s+</g, "><")
      .trim();

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




const sendStaffAddedEmail = async (email, name, password, loginLink) => {
  try {
    const subject = "Welcome to Our Team - Account Created Successfully";
    const htmlContent = await generateAddStaffTemplate({
      name,
      email,
      password,
      loginLink
    });

    const info = await transporter.sendMail({
      from: 'shaktisainisd@gmail.com',
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log("Staff welcome email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending staff welcome email:", error);
    return false;
  }
};


module.exports = { sendEmail, sendEmailRemainder, sendStaffAddedEmail };