const nodemailer = require('nodemailer');
require('dotenv').config();

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'your_email@gmail.com',
    pass: process.env.SMTP_PASS || 'your_app_password'
  }
});

/**
 * Sends a transaction confirmation email (issue or return).
 * @param {Object} details - Transaction details
 */
async function sendTransactionEmail(details) {
  const { toEmail, memberName, bookTitle, authorName, issueDate, dueDate, type } = details;
  if (!toEmail) return;

  const isIssue = type === 'issue';
  const subject = isIssue ? '📚 Book Issued Successfully' : '✅ Book Returned Successfully';
  const titleText = isIssue ? 'Book Issue Confirmation' : 'Book Return Confirmation';
  const warmMessage = isIssue 
    ? 'Thank you for borrowing from our library! We hope you enjoy your read.' 
    : 'Thank you for returning the book. We hope you enjoyed it and look forward to your next visit!';

  const mailOptions = {
    from: `"Library DBMS Assistant" <${process.env.SMTP_USER || 'noreply@libsystem.com'}>`,
    to: toEmail,
    subject: subject,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">${titleText}</h2>
        <p>Dear <strong>${memberName}</strong>,</p>
        <p>${warmMessage}</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Book:</strong> ${bookTitle}</p>
          <p style="margin: 5px 0;"><strong>Author:</strong> ${authorName}</p>
          <p style="margin: 5px 0;"><strong>Issue Date:</strong> ${issueDate}</p>
          <p style="margin: 5px 0;"><strong>Due Date:</strong> <span style="color: #e74c3c; font-weight: bold;">${dueDate}</span></p>
        </div>
        
        <p>Happy Reading!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8rem; color: #888;">This is an automated message from the Library Management System.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ${type} confirmation sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send ${type} confirmation to ${toEmail}:`, error.message);
    return false;
  }
}

/**
 * Sends an overdue notification email to the member.
 */
async function sendOverdueNotification(toEmail, memberName, bookTitle) {
  if (!toEmail) return;

  const mailOptions = {
    from: `"Library DBMS Assistant" <${process.env.SMTP_USER || 'noreply@libsystem.com'}>`,
    to: toEmail,
    subject: '🚨 Overdue Book Alert - Library Notification',
    html: `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #f44336;">Action Required: Overdue Book</h2>
        <p>Dear <strong>${memberName}</strong>,</p>
        <p>This is a formal notice that your checkout for <strong>"${bookTitle}"</strong> is now officially <strong>OVERDUE</strong>.</p>
        <div style="background: #fff5f5; border-left: 4px solid #f44336; padding: 15px; margin: 15px 0;">
            <p style="margin: 0; font-weight: bold; color: #d32f2f;">🚨 IMMEDIATE RETURN REQUIRED</p>
            <p style="margin: 10px 0 0 0;">Your borrowed copy has exceeded the return deadline. Fines are currently accumulating at a rate of <strong>${process.env.FINE_RATE_RS || 50} RS per minute</strong> until the item is successfully checked in.</p>
        </div>
        <p>Thank you for your prompt cooperation.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 0.8rem; color: #888;">This is an automated message from the Oracle DBMS Library Management System.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Overdue notice sent successfully to ${toEmail}`);
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed to send notification to ${toEmail}:`, error.message);
    return false;
  }
}

module.exports = { sendOverdueNotification, sendTransactionEmail };

