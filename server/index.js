require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TO_EMAIL = process.env.TO_EMAIL || 'chido.ukaigwe@sbmediagroup.com';

// Serve static site from project root (one level up)
const staticDir = path.join(__dirname, '..');


// Simple HTML escaper to prevent injection in email bodies
function escapeHtml(input){
  if(input === undefined || input === null) return '';
  return String(input).replace(/[&<>"']/g, function(s){
    switch(s){
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return s;
    }
  });
}


let transporter = null;
let smtpAvailable = false;
if(process.env.SMTP_HOST && process.env.SMTP_USER){
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  transporter.verify()
    .then(()=>{
      smtpAvailable = true;
      console.log('SMTP transporter ready');
    })
    .catch(err=>{
      smtpAvailable = false;
      console.warn('SMTP verify failed — SMTP disabled', err && err.message ? err.message : err);
    });
} else {
  console.log('No SMTP config found — nodemailer disabled.');
}

// AWS SES SDK support (preferred). Use USE_AWS_SDK=true to enable.
let useAwsSdk = process.env.USE_AWS_SDK === 'true' || false;
let awsRegion = process.env.AWS_REGION || 'us-east-1';
let ses = null;
let awsConfigured = false;

// Prefer flexible credential resolution for AWS SDK: try explicit file/env first, but
// allow the AWS SDK default provider chain (shared credentials, environment, EC2/ECS roles).
try{
  const credPath = path.join(__dirname, 'aws-credentials.json');
  if(fs.existsSync(credPath)){
    const creds = JSON.parse(fs.readFileSync(credPath,'utf8'));
    if(creds.aws_access_key_id && creds.aws_secret_access_key){
      AWS.config.update({accessKeyId:creds.aws_access_key_id,secretAccessKey:creds.aws_secret_access_key,region:awsRegion});
      console.log('Loaded AWS credentials from server/aws-credentials.json');
    }
  }
}catch(err){
  console.warn('Failed to read aws-credentials.json',err && err.message ? err.message : err);
}

// If explicit env vars exist, set them (AWS SDK will also pick these up automatically)
if(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY){
  AWS.config.update({accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY,region:awsRegion});
  console.log('Loaded AWS credentials from environment variables');
}

// Initialize SES client if SDK path is desired. AWS SDK will use default provider chain
// if no explicit credentials were provided above (e.g., shared credentials or role).
if(useAwsSdk){
  try{
    ses = new AWS.SES({apiVersion: '2010-12-01', region: awsRegion});
    // quick check to validate credentials and SES access
    ses.getSendQuota().promise().then(()=>{
      awsConfigured = true;
      console.log('AWS SES SDK available and credentials validated');
    }).catch(err=>{
      awsConfigured = false;
      console.warn('AWS SES check failed — SES disabled', err && err.message ? err.message : err);
    });
  }catch(err){
    awsConfigured = false;
    console.warn('Failed to initialize AWS SES SDK', err && err.message ? err.message : err);
  }
} else {
  console.log('AWS SDK SES path not enabled (USE_AWS_SDK=false)');
}

app.post('/api/sell', async (req, res) => {
  const body = req.body || {};
  const fields = {
    transactionType: body.transactionType || '',
    year: body.year || '', make: body.make || '', model: body.model || '', mileage: body.mileage || '',
    location: body.location || '',
    vin: body.vin || '', currency: body.currency || '$', expectedPrice: body.expectedPrice || '',
    fullName: body.fullName || '', email: body.email || ''
  };

  // Honeypot anti-spam: hidden field `hp_name` should be empty
  if((body.hp_name || '').trim() !== ''){
    return res.status(400).send('Spam detected');
  }
  // Basic validation
  // Require the newly-added fields as well: transactionType and location
  if(!fields.transactionType || !fields.year || !fields.make || !fields.model || !fields.location || !fields.fullName || !fields.email){
    return res.status(400).send('Missing required fields');
  }

  // Optional reCAPTCHA verification
  if(body.recaptchaToken && process.env.RECAPTCHA_SECRET){
    try{
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST', headers: {'Content-Type':'application/x-www-form-urlencoded'},
        body: `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET)}&response=${encodeURIComponent(body.recaptchaToken)}`
      });
      const j = await verifyRes.json();
      if(!j.success){
        return res.status(400).send('reCAPTCHA verification failed');
      }
    }catch(err){
      console.warn('reCAPTCHA verify error',err.message);
    }
  }

  const subject = `${fields.transactionType ? fields.transactionType.toUpperCase() + ' - ' : ''}New Submission — ${fields.make} ${fields.model} (${fields.year})`;
  const text = Object.keys(fields).map(k=>`${k}: ${fields[k]}`).join('\n');
  const html = `<h2>New Submission</h2><p><strong>Details</strong></p><ul>${Object.keys(fields).map(k=>`<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(fields[k])}</li>`).join('')}</ul>`;

  // If AWS SDK is configured and enabled, use SES SDK to send
  if(useAwsSdk && awsConfigured && ses){
    const params = {
      Source: process.env.SMTP_FROM || process.env.SMTP_USER || `no-reply@${process.env.TO_EMAIL?.split('@')[1] || 'example.com'}`,
      Destination: { ToAddresses: [TO_EMAIL] },
      ReplyToAddresses: [ fields.email || process.env.SMTP_FROM || process.env.SMTP_USER ],
      Message: {
        Subject: { Data: subject },
        Body: { Html: { Data: html }, Text: { Data: text } }
      }
    };
    try{
      await ses.sendEmail(params).promise();
      return res.status(200).json({ok:true,via:'ses-sdk'});
    }catch(err){
      console.error('SES sendEmail error',err);
      return res.status(500).send('SES send failed');
    }
  }

  // If nodemailer transporter is available and verified, use SMTP path
  if(transporter && transporter.sendMail && smtpAvailable){
    try{
      await transporter.sendMail({from: process.env.SMTP_FROM || process.env.SMTP_USER, to: TO_EMAIL, subject, text, html, replyTo: fields.email || process.env.SMTP_FROM});
      return res.status(200).json({ok:true,via:'smtp'});
    }catch(err){
      console.error('sendMail error',err);
      return res.status(500).send('Email send failed');
    }
  }

  // No email provider available — do NOT silently succeed. Return 5xx so caller knows.
  console.error('No email provider configured: neither AWS SES nor SMTP available');
  console.error('Sell submission content:', text);
  return res.status(500).send('No email provider configured');
});

// Contact form endpoint removed — not required for current site.

// Serve static files with HTML extension fallback so clean URLs like '/contact' work
app.use(express.static(staticDir, { extensions: ['html'] }));

// Health endpoint for deployments to check SES/SMTP readiness
// Liveness endpoint: simple 200 so load balancers know the process is alive
app.get('/server/alive', (req, res) => res.status(200).json({ alive: true, timestamp: new Date().toISOString() }));

// Readiness endpoint: reports SES/SMTP readiness for deploy platform readiness checks
app.get('/server/ready', (req, res) => {
  const status = {
    uptime: process.uptime(),
    awsSdkEnabled: useAwsSdk,
    awsConfigured: !!awsConfigured,
    smtpConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    smtpAvailable: !!smtpAvailable,
    verifiedSender: !!(process.env.SMTP_FROM || process.env.SMTP_USER),
    toEmail: TO_EMAIL || null,
    timestamp: new Date().toISOString()
  };

  const healthy = (useAwsSdk && awsConfigured) || smtpAvailable;
  return res.status(healthy ? 200 : 503).json({ healthy, details: status });
});

// Backwards-compatibility: keep /server/health as an alias to /server/ready
app.get('/server/health', (req, res) => res.redirect(307, '/server/ready'));

// Fallback to index.html so single-page navigation still works
app.get('*', (req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

app.listen(PORT, ()=>console.log(`Form server listening on ${PORT}`));
