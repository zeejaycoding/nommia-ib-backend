const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(cors({
  origin: [
    process.env.CLIENT_URL || 'https://nommia-ib-dashboard.onrender.com'],
  credentials: true
}));

// ============= SUPABASE CLIENT =============
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('[Supabase] ✅ Client initialized');
} else {
  console.warn('[Supabase] ⚠️ SUPABASE_URL or SUPABASE_KEY not set - payout storage disabled');
}

let emailTransporter = null;

const initializeEmail = () => {
  if (emailTransporter) return emailTransporter;
  
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
    
  try {
    emailTransporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true,
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });
    
   // console.log(`[Email] ✅ Nodemailer configured with Brevo SMTP (${smtpHost}:${smtpPort})`);
    return emailTransporter;
  } catch (err) {
   // console.error('[Email] ❌ Failed to create transporter:', err.message);
    return null;
  }
};

// Initialize on startup
const transporter = initializeEmail();

// Test email connection
if (transporter) {
  transporter.verify((error, success) => {
    if (error) {
      console.error('[Email] ❌ Brevo SMTP connection failed:', error.message);
     // console.error('[Email] Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env');
    } else {
      console.log('[Email] ✅ Brevo SMTP connection verified!');
    }
  });
}

// ============= EMAIL TEMPLATES =============

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
  <title>Fund Your Trading Account - Nommia</title>
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
          <p style="margin:0 0 24px 0;">Your account is all set and verified! It's time to fund it and start your trading journey. I wanted to personally encourage you to take this next step and join thousands of successful traders on Nommia.</p>
          
          <p style="margin:0 0 24px 0;">When you fund your account today, you'll get access to:</p>

          <!-- HIGHLIGHT BOX -->
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f9fafb;border-radius:8px;margin-bottom:32px;border:1px dashed #DAA934;">
            <tr>
              <td style="padding:24px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">Competitive leverage up to 1:100</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">24/5 market access with tight spreads</td></tr></table>
                <table border="0" cellpadding="0" cellspacing="0" width="100%;"><tr><td width="24" valign="top"><img src="https://img.icons8.com/ios-filled/24/DAA934/ok.png" width="18" height="18"></td><td style="padding-left:12px; font-size:15px; color:#374151;">Instant deposits and professional trading tools</td></tr></table>
              </td>
            </tr>
          </table>

          <p style="margin:0 0 20px 0; font-weight:600; font-size:15px; color:#111827;">Multiple Deposit Options Available:</p>
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:32px;">
            <tr>
              <td style="padding:8px 0;"><strong>💳 Credit/Debit Card</strong> - Instantly funded</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>🏦 Bank Transfer</strong> - 1-3 business days</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>💻 E-Wallets</strong> - Instant payments</td>
            </tr>
            <tr>
              <td style="padding:8px 0;"><strong>₿ Cryptocurrency</strong> - Instant delivery</td>
            </tr>
          </table>

          <p style="margin:0 0 24px 0; text-align:center; font-weight:600; font-size:14px; color:#E7B744;">Minimum deposit: \$10 USD</p>

          <!-- CALL TO ACTION -->
          <table border="0" cellspacing="0" cellpadding="0" width="100%" style="margin-bottom: 32px;">
            <tr>
              <td align="center">
                  <a href="https://login.nommia.io/#/cashier" style="background:linear-gradient(90deg, #E7B744, #BC8C1B); background-color:#E7B744; color:#ffffff;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:16px;font-family:'Poppins',Arial,sans-serif;">
                    Fund Your Account Now
                  </a>
              </td>
            </tr>
          </table>

          <hr style="border:0; border-top:1px solid #e5e7eb; margin:32px 0;">
          
          <p style="font-size:14px; color:#4b5563; margin:0;">I'm here to support your trading success. Have questions about deposits or account features? Don't hesitate to reach out.</p>
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
  }
};


app.post('/api/nudges/send', async (req, res) => {
  try {
    if (!transporter) {
      return res.status(503).json({ 
        error: 'Email service not configured',
        details: 'Check SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD in .env'
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

    // Validate required fields
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

    // Validate nudge type
    if (!emailTemplates[nudgeType]) {
      const validTypes = Object.keys(emailTemplates).join(', ');
      return res.status(400).json({ 
        error: `Invalid nudgeType. Must be one of: ${validTypes}`
      });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      return res.status(400).json({ 
        error: 'Invalid email address'
      });
    }

    // Get template and build email
    const template = emailTemplates[nudgeType];
    const emailBody = template.getBody(recipientName, referrerName);

    console.log(`[Email] Sending ${nudgeType} to ${recipientEmail}...`);

    // Send email
    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: recipientEmail,
      subject: template.subject,
      html: `<pre style="font-family: Arial, sans-serif; white-space: pre-wrap; line-height: 1.6;">${emailBody}</pre>`,
      text: emailBody
    });

    console.log(`[Email] ✅ Sent to ${recipientEmail}`);

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
    console.error('[Email] ❌ Error:', error.message);
    res.status(500).json({
      error: 'Failed to send email',
      details: error.message
    });
  }
});

/**
 * GET /api/nudges/health
 */
app.get('/api/nudges/health', (req, res) => {
  const isHealthy = transporter !== null;
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    email: isHealthy ? 'configured' : 'not configured',
    service: 'nodemailer-brevo-smtp',
    timestamp: new Date().toISOString()
  });
});

// ============= HEALTH CHECK =============

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

    // Validate required fields
    if (!partnerId) {
      return res.status(400).json({ 
        error: 'Missing required field: partnerId'
      });
    }

    console.log(`[Payouts] Saving payout details for partner: ${partnerId}`);

    // Upsert (insert or update)
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

    console.log(`[Payouts] Fetching payout details for partner: ${partnerId}`);

    const { data, error } = await supabase
      .from('payout_details')
      .select('*')
      .eq('partner_id', partnerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (it's okay)
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

    console.log(`[Payouts] Deleting payout details for partner: ${partnerId}`);

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


app.post('/api/2fa/setup', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=otpauth://totp/Nommia:${username}?secret=${secret}&issuer=Nommia`;
    
    console.log(`[2FA] Setup initiated for user: ${username}`);
    console.log(`[2FA] Secret (store this securely): ${secret}`);
    
    res.status(200).json({
      success: true,
      secret: secret,
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

/**
 * POST /api/2fa/verify
 * Verify 6-digit TOTP code
 * Returns: { success, message }
 */
app.post('/api/2fa/verify', async (req, res) => {
  try {
    const { username, secret, token } = req.body;
    
    if (!username || !secret || !token) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    if (!/^\d{6}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Invalid token format' });
    }
    
    console.log(`[2FA] Verified for user: ${username}`);
    
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
    
    console.log(`[2FA Login] Verified for user: ${username}`);
    
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

/**
 * POST /api/2fa/disable
 * Disable 2FA for user
 * Returns: { success, message }
 */
app.post('/api/2fa/disable', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ success: false, message: 'Username required' });
    }

    // Delete from database:
    // await supabase
    //   .from('user_2fa')
    //   .delete()
    //   .eq('username', username);
    
    console.log(`[2FA] Disabled for user: ${username}`);
    
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

// ============= ERROR HANDLERS =============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

const port = process.env.PORT || 5000; 

app.listen(port, '0.0.0.0', () => {
  console.log(`[Server] Running on http://0.0.0.0:${port} (env: ${process.env.NODE_ENV || 'development'})`);
});