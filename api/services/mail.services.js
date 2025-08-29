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

    // Remove the unwanted text from the template
    dbTemplate = dbTemplate.replace(/" rel="noopener noreferrer" target="_blank">Secure Upload Link:/g, '');

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

    // Create email-client compatible button
    const buttonHtml = `
      <table cellpadding="0" cellspacing="0" border="0" style="margin: 15px 0;">
        <tr>
          <td align="center" bgcolor="#007bff" style="border-radius: 4px;">
            <a href="${link}" target="_blank" style="font-size: 16px; font-family: Helvetica, Arial, sans-serif; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 4px; display: inline-block; font-weight: bold;">
              Upload Documents
            </a>
          </td>
        </tr>
      </table>
    `;

    // Alternative text link for email clients that struggle with HTML
    const textLink = `
      <p style="margin:10px 0; font-size:12px; color:#666;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        ${link}
      </p>
    `;

    // inject into template
    const htmlContent = dbTemplate
      .replace(/{{name}}/g, name)
      .replace(/{{title}}/g, doctitle)
      .replace(/{{deadline}}/g, deadline)
      .replace(/{{documentList}}/g, formattedDocList)
      .replace(/{{instructions}}/g, instructions)
      .replace(/{{link}}/g, `${buttonHtml}`);

    // send email
    const info = await transporter.sendMail({
      from: "shaktisainisd@gmail.com",
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", info.messageId);

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