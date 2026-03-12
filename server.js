const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const speakeasy = require('speakeasy');
require('dotenv').config();

console.log(`[STARTUP] Port: ${process.env.PORT || 5000}`);
console.log(`[STARTUP] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log('[STARTUP] Loading modules...');
console.log('========================================\n');

const app = express();

app.use(express.json({ limit: '50mb' }));

// ============= CORS CONFIGURATION =============
const allowedOrigins = [
  'https://nommia-ib-dashboard.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  process.env.CLIENT_URL || 'https://nommia-ib-dashboard.onrender.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400
}));

// Handle OPTIONS requests explicitly
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] ✅ Client initialized');
} else {
  console.warn('[Supabase] ⚠️ SUPABASE_URL or SUPABASE_KEY not set - payout storage disabled');
}

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const EMAIL_CONFIG = {
  from: process.env.SMTP_FROM,
  fromName: process.env.SMTP_FROM_NAME
};

// Test Brevo API connection
if (BREVO_API_KEY) {
  console.log('[Email] ✅ Using Brevo REST API for email sending (suitable for Render deployment)');
} else {
  console.error('[Email] ❌ BREVO_API_KEY not set in .env');
}

const sendEmailWithRetry = async (mailOptions, maxRetries = 3) => {
  let lastError;
  
  const recipientEmails = Array.isArray(mailOptions.to) ? mailOptions.to : [mailOptions.to];
  
  const brevoPayload = {
    sender: {
      name: EMAIL_CONFIG.fromName,
      email: EMAIL_CONFIG.from
    },
    to: recipientEmails.map(email => ({
      email: email,
      name: email.split('@')[0]
    })),
    subject: mailOptions.subject,
    htmlContent: mailOptions.html || mailOptions.text,
    textContent: mailOptions.text
  };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(BREVO_API_URL, brevoPayload, {
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json'
        }
      });
      
      console.log(`[Email] ✅ Email sent successfully (Message ID: ${response.data.messageId})`);
      return { messageId: response.data.messageId };
    } catch (error) {
      lastError = error;
      const errorMsg = error.response?.data?.message || error.message;
      console.warn(`[Email] ⚠️ Attempt ${attempt} failed: ${errorMsg}`);
      
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
};


const emailTemplates = {
  'Complete KYC': {
    subject: 'Complete Your KYC Verification - Nommia IB',
    getBody: (recipientName, referrerName) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Complete Your KYC Verification - Nommia</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style>
    table, td, div, h1, h2, h3, p, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    body, #bodyTable, #bodyCell { height: 100% !important; margin: 0; padding: 0; width: 100% !important; }
    table { border-collapse: collapse; }
    img, a img { border: 0; outline: none; text-decoration: none; }
    h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    p { margin: 1em 0; padding: 0; }
    a { text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;" bgcolor="#f3f4f6">
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <center>
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:672px;margin:32px auto;background-color:#ffffff;border-radius:8px;border: 1px solid #e5e7eb;">
      <!-- HEADER -->
      <tr>
        <td align="center" style="background-color:#111827;padding:32px;border-top-left-radius:8px;border-top-right-radius:8px;">
          <img src="http://img.mailinblue.com/9801547/images/68ad3f184a732_1756184344.png" alt="Nommia Logo" width="180" style="display:block;width:180px;height:auto;border:0;">
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:40px 48px;color:#111827;font-family:'Poppins',Arial,sans-serif;font-size:16px;line-height:1.625;">
          <!-- Partner Badge -->
          <div style="margin-bottom: 24px;">
            <span style="background-color:#E7B744; color:#111827; font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px; text-transform:uppercase; letter-spacing:1px; display:inline-block;">
              Partner Message
            </span>
          </div>

          <p style="margin:0 0 16px 0;">Hi ${recipientName},</p>
          <p style="margin:0 0 16px 0;">My name is <strong>${referrerName}</strong>, and I'm a Nommia partner associated with your account.</p>
          <p style="margin:0 0 24px 0;">I noticed you recently started your journey with Nommia but haven't quite finished your account verification (KYC) yet. I wanted to reach out personally to see if you needed any help getting over the finish line.</p>
          
          <p style="margin:0 0 24px 0;">Completing this step is the only thing standing between you and the markets. Once verified, you'll unlock:</p>

          <!-- HIGHLIGHT BOX -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb;border-radius:8px;margin-bottom:32px;border:1px dashed #DAA934;">
            <tr>
              <td style="padding:24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">Full access to live trading and deposits</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">World-class risk management tools</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">Social trading and managed account options</td></tr></table>
              </td>
            </tr>
          </table>

          <!-- CALL TO ACTION -->
          <table border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom: 32px;">
            <tr>
              <td align="center">
                  <a href="https://login.nommia.io/#/login" style="background:linear-gradient(90deg, #E7B744, #BC8C1B); background-color:#E7B744; color:#ffffff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:16px;font-family:'Poppins',Arial,sans-serif;">
                    Complete My Verification
                  </a>
              </td>
            </tr>
          </table>

          <!-- VIDEO GUIDE SMALL -->
          <p style="text-align:center; font-size:14px; color:#4b5563; margin-bottom:12px;">Unsure how to upload your documents?</p>
          <div style="text-align:center;">
            <a href="https://vimeo.com/nommia/howtokyc?share=copy" style="color:#4f46e5; text-decoration:underline; font-weight:600; font-size:14px;">Watch the 2-minute KYC Guide</a>
          </div>
          
          <hr style="border:0; border-top:1px solid #e5e7eb; margin:32px 0;">
          
          <p style="font-size:14px; color:#4b5563; margin:0;">I'm here for your trading journey. If you have any questions about the platform or getting started, feel free to reach out.</p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color:#f9fafb;text-align:center;padding:32px 48px;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
          <p style="margin:0;font-size:14px;color:#111827;font-weight:600;font-family:'Poppins',Arial,sans-serif;">${referrerName}</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;font-family:'Poppins',Arial,sans-serif;">Nommia Authorized Independent Partner</p>
          
          <p style="margin:24px 0 16px 0;font-size:11px;color:#9ca3af;font-family:'Poppins',Arial,sans-serif;line-height:1.6; text-align: justify;">
            <strong>Risk Warning:</strong> Trading financial instruments involves significant risk and may not be suitable for all investors. You could lose more than your initial deposit. Please ensure you fully understand the risks involved. <strong>Disclaimer:</strong> This message is sent to you by an Independent Partner of Nommia. Independent Partners are not employees, agents, or representatives of Nommia Ltd.
          </p>
          
          <p style="margin:0;font-size:11px;color:#9ca3af;font-family:'Poppins',Arial,sans-serif;">
            Nommia Ltd
          </p>
          
          <p style="margin:16px 0 0 0;font-size:11px;font-family:'Poppins',Arial,sans-serif;">
            <a href="https://nommia.io/unsubscribe" style="color:#6b7280; text-decoration:underline;">Unsubscribe from Partner communications</a>
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
    `
  },
  
  'Fund Account': {
    subject: 'Fund Your Trading Account - Start Trading Today with Nommia',
    getBody: (recipientName, referrerName) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <!--[if !mso]><!-->
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--<![endif]-->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>A Message from your Nommia Partner</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <style>
    table, td, div, h1, h2, h3, p, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style>
    /* Client-specific resets */
    body, #bodyTable, #bodyCell { height: 100% !important; margin: 0; padding: 0; width: 100% !important; }
    table { border-collapse: collapse; }
    img, a img { border: 0; outline: none; text-decoration: none; }
    h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
    p { margin: 1em 0; padding: 0; }
    a { text-decoration: none; }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;" bgcolor="#f3f4f6">
  <!-- Outlook DPI Fix -->
  <!--[if mso]>
  <xml>
    <o:OfficeDocumentSettings>
      <o:AllowPNG/>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml>
  <![endif]-->
  <center>
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:672px;margin:32px auto;background-color:#ffffff;border-radius:8px;border: 1px solid #e5e7eb;">
      <!-- HEADER -->
      <tr>
        <td align="center" style="background-color:#111827;padding:32px;border-top-left-radius:8px;border-top-right-radius:8px;">
          <img src="http://img.mailinblue.com/9801547/images/68ad3f184a732_1756184344.png" alt="Nommia Logo" width="180" style="display:block;width:180px;height:auto;border:0;">
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:40px 48px;color:#111827;font-family:'Poppins',Arial,sans-serif;font-size:16px;line-height:1.625;">
          <!-- Partner Badge -->
          <div style="margin-bottom: 24px;">
            <span style="background-color:#E7B744; color:#111827; font-family:'Poppins',Arial,sans-serif; font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px; text-transform:uppercase; letter-spacing:1px; display:inline-block;">
              Partner Message
            </span>
          </div>

          <p style="margin:0 0 16px 0;">Hi @firstName@,</p>
          <p style="margin:0 0 16px 0;">My name is <strong>@ibName@</strong>, and I’m a Nommia partner associated with your account.</p>
          <p style="margin:0 0 24px 0;">I noticed your account is fully verified—congratulations! You are now just one final step away from the live markets. To start trading, you simply need to fund your account.</p>
          
          <p style="margin:0 0 24px 0;">Once your deposit is confirmed, you'll unlock our full proprietary suite including:</p>

          <!-- HIGHLIGHT BOX -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb;border-radius:8px;margin-bottom:32px;border:1px dashed #DAA934;">
            <tr>
              <td style="padding:24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/conference-call.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;"><strong>Social Trading:</strong> Copy top-performing strategies automatically</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/combo-chart.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;"><strong>Live Market Analysis:</strong> Real-time professional dashboards</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/settings.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;"><strong>Expert Insight Tools:</strong> World-class risk management at your fingertips</td></tr></table>
              </td>
            </tr>
          </table>

          <!-- Demo Account Suggestion -->
          <p style="margin:0 0 24px 0; font-size:15px; color:#4b5563; text-align:center; font-style: italic;">
            New to the markets? If you have never traded before, I recommend starting with a <strong>Demo Account</strong> to practice your strategies in a risk-free environment.
          </p>

          <!-- CALL TO ACTION -->
          <table border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom: 32px;">
            <tr>
              <td align="center">
                  <a href="https://login.nommia.io/#/login" style="background:linear-gradient(90deg, #E7B744, #BC8C1B); background-color:#E7B744; color:#ffffff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:16px;font-family:'Poppins',Arial,sans-serif;">
                    Fund My Account & Trade
                  </a>
              </td>
            </tr>
          </table>

          <!-- VIDEO GUIDE SMALL -->
          <p style="text-align:center; font-size:14px; color:#4b5563; margin-bottom:12px;">Need help with your first deposit?</p>
          <div style="text-align:center;">
            <a href="https://vimeo.com/nommia/howtotopupyourtradingaccount?fl=tl&fe=ec" style="color:#4f46e5; text-decoration:underline; font-weight:600; font-size:14px;">Watch the Deposit Video Guide</a>
          </div>
          
          <hr style="border:0; border-top:1px solid #e5e7eb; margin:32px 0;">
          
          <p style="font-size:14px; color:#4b5563; margin:0;">I'm here for your trading journey. If you have any questions about the platform or getting started, feel free to reach out.</p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color:#f9fafb;text-align:center;padding:32px 48px;border-bottom-left-radius:8px;border-bottom-right-radius:8px;">
          <p style="margin:0;font-size:14px;color:#111827;font-weight:600;font-family:'Poppins',Arial,sans-serif;">@ibName@</p>
          <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;font-family:'Poppins',Arial,sans-serif;">Nommia Authorized Independent Partner</p>
          
          <p style="margin:24px 0 16px 0;font-size:11px;color:#9ca3af;font-family:'Poppins',Arial,sans-serif;line-height:1.6; text-align: justify;">
            <strong>Risk Warning:</strong> Trading financial instruments involves significant risk and may not be suitable for all investors. You could lose more than your initial deposit. Please ensure you fully understand the risks involved. <strong>Disclaimer:</strong> This message is sent to you by an Independent Partner of Nommia. Independent Partners are not employees, agents, or representatives of Nommia Ltd.
          </p>
          
          <p style="margin:0;font-size:11px;color:#9ca3af;font-family:'Poppins',Arial,sans-serif;">
            Nommia Ltd
          </p>
          
          <p style="margin:16px 0 0 0;font-size:11px;font-family:'Poppins',Arial,sans-serif;">
            <a href="@unsubscribeLink@" style="color:#6b7280; text-decoration:underline;">Unsubscribe from Partner communications</a>
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>    `
  }
};


app.post('/api/nudges/send', async (req, res) => {
  try {
    if (!BREVO_API_KEY) {
      return res.status(503).json({ 
        error: 'Email service not configured',
        details: 'Check BREVO_API_KEY in .env'
      });
    }

    const { 
      recipientEmail, 
      recipientName, 
      referrerName, 
      nudgeType, 
      tier, 
      partnerId 
    } = req.body;

    const missing = [];
    if (!recipientEmail) missing.push('recipientEmail');
    if (!recipientName) missing.push('recipientName');
    if (!referrerName) missing.push('referrerName');
    if (!nudgeType) missing.push('nudgeType');
    if (!tier) missing.push('tier');
    if (!partnerId) missing.push('partnerId');

    if (missing.length > 0) {
      return res.status(400).json({ 
        error: `Missing required fields: ${missing.join(', ')}`
      });
    }

    if (!emailTemplates[nudgeType]) {
      const validTypes = Object.keys(emailTemplates).join(', ');
      return res.status(400).json({ 
        error: `Invalid nudgeType. Must be one of: ${validTypes}`
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ 
        error: 'Invalid email address'
      });
    }

    const template = emailTemplates[nudgeType];
    const emailBody = template.getBody(recipientName, referrerName);

    const info = await sendEmailWithRetry({
      from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
      to: recipientEmail,
      subject: template.subject,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6;">${emailBody}</pre>`,
      text: emailBody
    });

     console.log(`[Nudge] ✅ Nudge sent to ${recipientEmail} via Brevo SMTP`);

    res.status(200).json({
      success: true,
      message: `${nudgeType} nudge sent to ${recipientEmail}`,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
      recipientEmail,
      nudgeType,
      tier
    });

  } catch (error) {
    console.error('[Nudge] ❌ Error:', error.message);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

app.get('/api/nudges/health', (req, res) => {
  const isHealthy = BREVO_API_KEY !== undefined && BREVO_API_KEY !== '';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    email: isHealthy ? 'configured' : 'not configured',
    service: 'brevo-rest-api',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'nommia-nudge-backend',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/payouts/save', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured',
        details: 'Set SUPABASE_URL and SUPABASE_KEY in .env'
      });
    }

    const { partnerId, bankName, accountNumber, iban, swiftCode, usdtTrc20, usdtErc20, usdcPolygon, usdcErc20, preferredMethod } = req.body;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required field: partnerId'
      });
    }

    const { data, error } = await supabase
      .from('payout_details')
      .upsert({
        partner_id: partnerId,
        bank_name: bankName || null,
        account_number: accountNumber || null,
        iban: iban || null,
        swift_code: swiftCode || null,
        usdt_trc20: usdtTrc20 || null,
        usdt_erc20: usdtErc20 || null,
        usdc_polygon: usdcPolygon || null,
        usdc_erc20: usdcErc20 || null,
        preferred_method: preferredMethod || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'partner_id' })
      .select();

    if (error) {
      console.error('[Payouts] ❌ Save failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to save payout details',
        details: error.message
      });
    }

    console.log('[Payouts] ✅ Saved successfully');
    res.status(200).json({
      success: true,
      message: 'Payout details saved successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('[Payouts] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.get('/api/payouts/:partnerId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured'
      });
    }

    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: partnerId'
      });
    }

    // console.log(`[Payouts] Fetching payout details for partner: ${partnerId}`);

    const { data, error } = await supabase
      .from('payout_details')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Payouts] ❌ Fetch failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to fetch payout details',
        details: error.message
      });
    }

    console.log('[Payouts] ✅ Fetched successfully');
    res.status(200).json({
      success: true,
      data: data || null,
      message: data ? 'Payout details found' : 'No payout details saved yet'
    });
  } catch (err) {
    console.error('[Payouts] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.delete('/api/payouts/:partnerId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured'
      });
    }

    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: partnerId'
      });
    }

    // console.log(`[Payouts] Deleting payout details for partner: ${partnerId}`);

    const { error } = await supabase
      .from('payout_details')
      .delete()
      .eq('partner_id', partnerId);

    if (error) {
      console.error('[Payouts] ❌ Delete failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to delete payout details',
        details: error.message
      });
    }

    console.log('[Payouts] ✅ Deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Payout details deleted successfully'
    });
  } catch (err) {
    console.error('[Payouts] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.post('/api/payout/save', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured'
      });
    }

    const { partnerId, email, bankName, accountNum, bic, usdtTrc, usdtErc, usdcPol, usdcErc, preferredMethod } = req.body;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required field: partnerId'
      });
    }

    const { data, error } = await supabase
      .from('payout_details')
      .upsert({
        partner_id: partnerId,
        email: email || null,
        bank_name: bankName || null,
        account_number: accountNum || null,
        bic: bic || null,
        usdt_trc20: usdtTrc || null,
        usdt_erc20: usdtErc || null,
        usdc_polygon: usdcPol || null,
        usdc_erc20: usdcErc || null,
        preferred_method: preferredMethod || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'partner_id' })
      .select();

    if (error) {
      console.error('[Payout] ❌ Save failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to save payout details',
        details: error.message
      });
    }

    console.log('[Payout] ✅ Saved successfully');
    res.status(200).json({
      success: true,
      message: 'Payout details saved successfully',
      data: data[0]
    });
  } catch (err) {
    console.error('[Payout] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.get('/api/payout/:partnerId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured'
      });
    }

    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: partnerId'
      });
    }

    // console.log(`[Payout] Fetching payout details for partner: ${partnerId}`);

    const { data, error } = await supabase
      .from('payout_details')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[Payout] ❌ Fetch failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to fetch payout details',
        details: error.message
      });
    }

    console.log('[Payout] ✅ Fetched successfully');
    res.status(200).json({
      success: true,
      data: data || null,
      message: data ? 'Payout details found' : 'No payout details saved yet'
    });
  } catch (err) {
    console.error('[Payout] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.delete('/api/payout/:partnerId', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ 
        error: 'Supabase not configured'
      });
    }

    const { partnerId } = req.params;

    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: partnerId'
      });
    }

    // console.log(`[Payout] Deleting payout details for partner: ${partnerId}`);

    const { error } = await supabase
      .from('payout_details')
      .delete()
      .eq('partner_id', partnerId);

    if (error) {
      console.error('[Payout] ❌ Delete failed:', error.message);
      return res.status(400).json({ 
        error: 'Failed to delete payout details',
        details: error.message
      });
    }

    console.log('[Payout] ✅ Deleted successfully');
    res.status(200).json({
      success: true,
      message: 'Payout details deleted successfully'
    });
  } catch (err) {
    console.error('[Payout] ❌ Error:', err.message);
    res.status(500).json({
      error: 'Internal server error',
      details: err.message
    });
  }
});

app.post('/api/2fa/setup', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }
    
    const secret = speakeasy.generateSecret({
      name: `Nommia (${username})`,
      issuer: 'Nommia',
      length: 32
    });
    
    // Generate QR code URL - encode the secret properly
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      `otpauth://totp/Nommia:${username}?secret=${secret.base32}&issuer=Nommia`
    )}`;
    
    // console.log(`[2FA] Setup initiated for user: ${username}`);
    // console.log(`[2FA] Secret: ${secret.base32}`);
    // console.log(`[2FA] QR URL generated: ${qrCodeUrl.substring(0, 80)}...`);
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from('user_2fa')
          .upsert({
            username: username,
            secret: secret.base32,
            enabled: false,  // Not enabled until verified
            updated_at: new Date().toISOString()
          }, { onConflict: 'username' });
        
        if (error) {
          console.warn(`[2FA] Warning saving to DB: ${error.message}`);
        } else {
        }
      } catch (dbErr) {
        console.warn(`[2FA] Database error: ${dbErr.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      secret: secret.base32,
      qrCodeUrl: qrCodeUrl,
      message: 'Secret generated. Scan QR code with authenticator app.'
    });
  } catch (err) {
    console.error('[2FA Setup] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA: ' + err.message
    });
  }
});

app.post('/api/2fa/verify', async (req, res) => {
  try {
    const { username, secret, token } = req.body;
    
    if (!username || !secret || !token) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Invalid token format' });
    }
    
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2  // Allow 30 seconds before/after
    });
    
    if (!verified) {
      // console.log(`[2FA] Verification failed for user: ${username} - invalid code`);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid authenticator code. Check your app and try again.' 
      });
    }
    
    if (supabase) {
      try {
        const { error } = await supabase
          .from('user_2fa')
          .update({
            enabled: true,  
            updated_at: new Date().toISOString()
          })
          .eq('username', username);
        
        if (error) {
          console.warn(`[2FA] Warning enabling in DB: ${error.message}`);
          // Still return success to user
        } else {
          // console.log(`[2FA] 2FA enabled for user: ${username}`);
        }
      } catch (dbErr) {
        console.warn(`[2FA] Database error enabling: ${dbErr.message}`);
      }
    }
    
    // console.log(`[2FA] Verified and enabled for user: ${username}`);
    
    res.status(200).json({
      success: true,
      message: '2FA enabled successfully'
    });
  } catch (err) {
    console.error('[2FA Verify] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Verification failed: ' + err.message
    });
  }
});

app.post('/api/2fa/verify-login', async (req, res) => {
  try {
    const { username, token } = req.body;
    
    if (!username || !token) {
      return res.status(400).json({ success: false, message: 'Missing username or token' });
    }

    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Invalid token' });
    }
    
    if (!supabase) {
      return res.status(500).json({ success: false, message: '2FA service unavailable' });
    }
    
    const { data, error } = await supabase
      .from('user_2fa')
      .select('secret, enabled')
      .eq('username', username)
      .single();
    
    if (error || !data) {
      console.warn(`[2FA Login] User not found or 2FA not enabled: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: '2FA not enabled for this account' 
      });
    }
    
    if (!data.enabled) {
      console.warn(`[2FA Login] 2FA is disabled for user: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: '2FA is not enabled for this account' 
      });
    }
    
    const verified = speakeasy.totp.verify({
      secret: data.secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      // console.log(`[2FA Login] Invalid code for user: ${username}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authenticator code.' 
      });
    }
    
    // console.log(`[2FA Login] Verified successfully for user: ${username}`);
    
    res.status(200).json({
      success: true,
      message: 'Login verified with 2FA'
    });
  } catch (err) {
    console.error('[2FA Login Verify] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Login verification failed: ' + err.message
    });
  }
});

app.post('/api/2fa/disable', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }

    if (supabase) {
      try {
        const { error } = await supabase
          .from('user_2fa')
          .delete()
          .eq('username', username);
        
        if (error) {
          console.warn(`[2FA] Warning disabling: ${error.message}`);
        } else {
          // console.log(`[2FA] Disabled for user: ${username}`);
        }
      } catch (dbErr) {
        console.warn(`[2FA] Database error disabling: ${dbErr.message}`);
      }
    }
    
    res.status(200).json({
      success: true,
      message: '2FA disabled successfully'
    });
  } catch (err) {
    console.error('[2FA Disable] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA: ' + err.message
    });
  }
});

app.post('/api/2fa/check', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }

    if (!supabase) {
      return res.status(200).json({ success: true, enabled: false, message: '2FA service unavailable' });
    }
    
    const { data, error } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('username', username)
      .single();
    
    const is2FAEnabled = data && data.enabled === true;
    // console.log(`[2FA Check] User ${username} - 2FA enabled: ${is2FAEnabled}`);
    
    res.status(200).json({
      success: true,
      enabled: is2FAEnabled
    });
  } catch (err) {
    console.warn(`[2FA Check] Error: ${err.message}`);
    res.status(200).json({
      success: true,
      enabled: false  // Fail open - don't require 2FA if there's an error
    });
  }
});

const otpStore = new Map();

app.post('/api/otp/send', async (req, res) => {
  try {
    // console.log('[OTP Send] Request received. Body:', JSON.stringify(req.body));
    
    let { email, type } = req.body;

    email = email ? email.trim() : '';

    // console.log(`[OTP Send] Extracted email: "${email}", type: "${type}"`);

    if (!email || email === '') {
      console.warn('[OTP Send] ❌ Email is missing or empty');
      return res.status(400).json({ 
        error: 'Missing required field: email',
        received: { email: email || 'undefined', type }
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.toLowerCase())) {
      console.warn(`[OTP Send] ❌ Invalid email format: "${email}"`);
      // console.log(`[OTP Send] Debug - email length: ${email.length}, chars: ${email.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(', ')}`) ;
      return res.status(400).json({ 
        error: 'Invalid email format',
        received: email,
        debug: `Length: ${email.length}`
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const timestamp = Date.now();
    const expiryTime = 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), {
      code: otp,
      timestamp: timestamp,
      expiry: timestamp + expiryTime,
      type: type || 'verification'
    });

    // console.log(`[OTP] ✅ Generated OTP for ${email}: ${otp} (expires in 10 min)`);

    try {
      const mailOptions = {
        from: `"${EMAIL_CONFIG.fromName}" <${EMAIL_CONFIG.from}>`,
        to: email,
        subject: 'Your Nommia Security Code',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
              .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
              .header { color: #1a1a1a; margin-bottom: 20px; }
              .code-box { background-color: #f0f0f0; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; color: #ffa500; letter-spacing: 5px; }
              .expiry { color: #888; font-size: 12px; margin-top: 10px; }
              .footer { color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="header">🔐 Security Verification</h1>
              <p>You requested a security code to verify your identity. Please use this code to proceed:</p>
              <div class="code-box">
                <div class="code">${otp}</div>
                <div class="expiry">This code expires in 10 minutes</div>
              </div>
              <p>If you did not request this code, please ignore this email.</p>
              <div class="footer">
                <p>${EMAIL_CONFIG.fromName} | Security Team</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      if (BREVO_API_KEY) {
        try {
          await sendEmailWithRetry(mailOptions);
          // console.log(`[OTP] ✅ OTP sent successfully to ${email} via Brevo API`);
        } catch (sendErr) {
          console.warn(`[OTP] ⚠️ Failed to send OTP email after 3 retries: ${sendErr.message}`);
        }
      } else {
        console.warn(`[OTP] ⚠️ Brevo API key not configured. OTP for ${email}: ${otp} (would be sent via Brevo)`);
      }
    } catch (emailErr) {
      console.error('[OTP] ⚠️ Error preparing email:', emailErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Security code sent to ${email}`
    });
  } catch (err) {
    console.error('[OTP Send] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP: ' + err.message
    });
  }
});

app.post('/api/otp/verify', async (req, res) => {
  try {
    let { email, code } = req.body;

    email = email ? email.trim().toLowerCase() : '';

    if (!email || !code) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, code'
      });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).json({ 
        success: false,
        message: 'No OTP found for this email. Request a new one.'
      });
    }

    if (Date.now() > storedOtp.expiry) {
      otpStore.delete(email);
      return res.status(400).json({ 
        success: false,
        message: 'OTP has expired. Request a new one.'
      });
    }

    if (code.toString() !== storedOtp.code) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    otpStore.delete(email);

    // console.log(`[OTP] Successfully verified OTP for ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      verified: true
    });
  } catch (err) {
    console.error('[OTP Verify] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to verify OTP: ' + err.message
    });
  }
});

app.post('/api/password/reset', async (req, res) => {
  try {
    let { email, oldPassword, newPassword, code } = req.body;

    email = email ? email.trim().toLowerCase() : '';

    if (!email || !oldPassword || !newPassword || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, oldPassword, newPassword, code'
      });
    }

    const storedOtp = otpStore.get(email);

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: 'No OTP found for this email. Request a new one.'
      });
    }

    if (Date.now() > storedOtp.expiry) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Request a new one.'
      });
    }

    if (code.toString() !== storedOtp.code) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please try again.'
      });
    }

    otpStore.delete(email);

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.'
      });
    }

    if (oldPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from old password.'
      });
    }

    // console.log(`[Password Reset] OTP verified for ${email}. Frontend will now update password via XValley API.`);

    res.status(200).json({
      success: true,
      message: 'OTP verified. You may now update your password.',
      otpVerified: true
    });
  } catch (err) {
    console.error('[Password Reset] Error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password: ' + err.message
    });
  }
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

const port = process.env.PORT || 5000;
const host = '0.0.0.0';

// Start server with detailed logging
const server = app.listen(port, host, () => {
  console.log('\n========================================');
  console.log(`[Server] ✅ RUNNING on http://${host}:${port}`);
 // console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  //console.log('[Server] Ready to accept requests');
  console.log('========================================\n');
});

// Handle server errors
server.on('error', (err) => {
  console.error('[Server] ❌ Error:', err.message);
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server] Port ${port} already in use`);
  }
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Process] ❌ Uncaught exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Process] ❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});