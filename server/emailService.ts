import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const smtpFrom = process.env.SMTP_FROM || smtpUser;

    // If SMTP is not configured, use ethereal for development
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.log('⚠️  SMTP not configured. Email sending will be disabled in production.');
      console.log('   Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD environment variables to enable.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465', // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      this.transporter.verify((error: Error | null) => {
        if (error) {
          console.error('❌ SMTP connection failed:', error.message);
          this.transporter = null;
        } else {
          console.log('✅ Email service ready');
        }
      });
    } catch (error) {
      console.error('❌ Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  private async sendWithRetry(options: EmailOptions, attempt = 1): Promise<EmailResult> {
    if (!this.transporter) {
      return {
        success: false,
        error: 'Email service not configured. Please set SMTP environment variables.',
      };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      });

      console.log(`✉️  Email sent to ${options.to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error(`❌ Email send attempt ${attempt} failed:`, error.message);

      if (attempt < this.maxRetries) {
        console.log(`   Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.delay(this.retryDelay);
        return this.sendWithRetry(options, attempt + 1);
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    return this.sendWithRetry(options);
  }

  async sendPerformanceReport(
    to: string,
    reportType: 'daily' | 'weekly',
    reportHtml: string
  ): Promise<EmailResult> {
    const subject = reportType === 'daily' 
      ? `Daily Performance Report - ${new Date().toLocaleDateString()}`
      : `Weekly Performance Report - Week of ${new Date().toLocaleDateString()}`;

    return this.sendEmail({
      to,
      subject,
      html: reportHtml,
    });
  }

  async sendTestEmail(to: string): Promise<EmailResult> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0B1F3A 0%, #1E6FB8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AI Performance Mirror</h1>
              <p>Test Email - Email Service Working</p>
            </div>
            <div class="content">
              <h2>Email Configuration Successful!</h2>
              <p>This is a test email from AI Performance Mirror.</p>
              <p>Your email service is properly configured and ready to send performance reports.</p>
              <p><strong>Sent:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div class="footer">
              <p>AI Performance Mirror - Employee Performance Analytics</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: 'AI Performance Mirror - Test Email',
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const emailService = new EmailService();
