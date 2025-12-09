interface SendInviteEmailOptions {
  to: string;
  profileName: string;
  inviterName: string;
  inviteToken: string;
  inviteUrl: string;
}

let transporter: any = null;

// Initialize email transporter only if credentials are provided
if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  try {
    const nodemailer = require('nodemailer');
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  } catch (err) {
    console.warn('Nodemailer not available, email service disabled');
  }
}

export async function sendInviteEmail({
  to,
  profileName,
  inviterName,
  inviteToken,
  inviteUrl
}: SendInviteEmailOptions): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const subject = `You're invited to join "${profileName}" on Gobusker!`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">You're Invited! 🎵</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hi there!
        </p>

        <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
          <strong>${inviterName}</strong> has invited you to join <strong>"${profileName}"</strong> on Gobusker.
        </p>

        <p style="font-size: 14px; color: #555; margin-bottom: 30px;">
          Gobusker is the platform for musicians and artists to manage tips, share revenue, and grow together!
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
            Accept Invitation
          </a>
        </div>

        <p style="font-size: 12px; color: #999; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          This invitation will expire in 30 days. If you don't recognize this invitation, you can safely ignore this email.
        </p>

        <p style="font-size: 11px; color: #bbb; margin-top: 10px;">
          Or copy this link: <code style="background: #f0f0f0; padding: 2px 5px; border-radius: 3px;">${inviteUrl}</code>
        </p>
      </div>
    </div>
  `;

  const textContent = `
You're invited to join "${profileName}" on Gobusker!

${inviterName} has invited you to join "${profileName}".

Accept the invitation here:
${inviteUrl}

This invitation will expire in 30 days.
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent,
      text: textContent
    });
  } catch (error) {
    console.error('Failed to send invite email:', error);
    throw error;
  }
}

export async function sendWelcomeEmail(
  to: string,
  name: string,
  profileName: string
): Promise<void> {
  if (!transporter) {
    throw new Error('Email service not configured');
  }

  const subject = `Welcome to ${profileName} on Gobusker!`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px;">Welcome! 🎉</h1>
      </div>

      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none;">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Hi ${name},
        </p>

        <p style="font-size: 14px; color: #555; margin-bottom: 10px;">
          You've successfully joined <strong>"${profileName}"</strong> on Gobusker!
        </p>

        <p style="font-size: 14px; color: #555; margin-bottom: 20px;">
          You can now:
        </p>

        <ul style="font-size: 14px; color: #555; margin-bottom: 30px;">
          <li>📥 Receive tips and contributions</li>
          <li>👥 See all band members and their revenue shares</li>
          <li>💸 Track your earnings</li>
          <li>🏦 Withdraw your share whenever you're ready</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.CLIENT_URL}/profiles" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
            View Profile
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent
    });
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}
