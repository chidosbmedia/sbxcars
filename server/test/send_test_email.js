require('dotenv').config();
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const path = require('path');

async function sendViaSes() {
  const region = process.env.AWS_REGION || 'us-east-1';
  AWS.config.update({region});
  const ses = new AWS.SES({apiVersion: '2010-12-01', region});
  const source = process.env.SMTP_FROM || process.env.SMTP_USER;
  const to = process.env.TO_EMAIL;
  if(!source || !to) throw new Error('SMTP_FROM/SMTP_USER and TO_EMAIL must be set in environment');
  const params = {
    Source: source,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: 'SBX Test Email' },
      Body: { Text: { Data: 'This is a test email from SBX integration test.' } }
    }
  };
  console.log('Attempting SES send to', to);
  return ses.sendEmail(params).promise();
}

async function sendViaSmtp() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const to = process.env.TO_EMAIL;
  if(!host || !user || !pass || !to) throw new Error('SMTP_HOST/SMTP_USER/SMTP_PASS and TO_EMAIL must be set');
  const transporter = nodemailer.createTransport({
    host, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
  await transporter.verify();
  console.log('SMTP transporter verified');
  return transporter.sendMail({ from, to, subject: 'SBX Test Email', text: 'This is a test email from SBX integration test.' });
}

(async ()=>{
  try{
    if(process.env.USE_AWS_SDK === 'true'){
      await sendViaSes();
      console.log('SES test send successful');
      process.exit(0);
    }
    await sendViaSmtp();
    console.log('SMTP test send successful');
    process.exit(0);
  }catch(err){
    console.error('Test send failed:', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
