import { convert } from 'html-to-text';
import nodemailer from 'nodemailer';
import path from 'path';
import { renderFile } from 'pug';

import config from '@/config';
import bull from '@/infra/bull';

/**
 * Class for method reusability. Email is usually pushed to a Bull queue
 * to be processed later by the lightweight queue.
 */
class Email {
  public to: string;
  public name: string;
  public from: string;

  /**
   * Initialize class.
   *
   * @param to - Which email address is this for?
   * @param name - The name of the receiver.
   */
  constructor(to: string, name: string) {
    this.to = to;
    this.name = name;
    this.from =
      config.NODE_ENV === 'production'
        ? `${config.EMAIL_FROM} <${config.EMAIL_USERNAME}>`
        : `${config.EMAIL_FROM} <${config.MAILTRAP_USERNAME}>`;
  }

  /**
   * Creates a new transport that is used to send emails.
   * Production version will use Webmail/CPanel/Gmail, while development version
   * will use Mailtrap. In production, we will let Nodemailer handle all secure
   * connections, and we will not try to configure anything strange to prevent
   * failures.
   *
   * @returns Nodemailer transport.
   */
  newTransport() {
    if (config.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        host: config.EMAIL_HOST,
        port: config.EMAIL_PORT,
        auth: {
          user: config.EMAIL_USERNAME,
          pass: config.EMAIL_PASSWORD,
        },

        // We may have to force the connection, this means
        // something is perhaps wrong with the SMTP SSL certificates. If emails are
        // not sent, probably the culprit is this line, as this is disabled.
        //
        // TODO: Find a way to mitigate this without using `rejectUnauthorized`
        // on Indonesian mailservers.
        // tls: {
        //   rejectUnauthorized: false,
        // },
      });
    }

    return nodemailer.createTransport({
      host: config.MAILTRAP_HOST,
      port: config.EMAIL_PORT,
      secure: false,
      requireTLS: true,
      auth: {
        user: config.MAILTRAP_USERNAME,
        pass: config.MAILTRAP_PASSWORD,
      },
      tls: {
        ciphers: 'SSLv3',
      },
    });
  }

  /**
   * Sends an email with a chosen template.
   *
   * @param subject - Subject of the email.
   * @param template - The template to be used for the email.
   * @param vars - Local variables inside the Pug template.
   */
  async send(
    subject: string,
    template:
      | 'confirmation'
      | 'forgot-password'
      | 'notification'
      | 'otp'
      | 'reminder'
      | 'reset-password'
      | 'update-password',
    vars: Record<string, unknown>,
  ) {
    const html = renderFile(
      path.join(__dirname, 'views', `${template}.pug`),
      vars,
    );

    await this.newTransport().sendMail({
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    });
  }

  /**
   * Sends a confirmation email to a user.
   *
   * @param url - URL to the webservice to activate the account.
   */
  async sendConfirmation(url: string) {
    await bull.add(`email-confirmation-${this.to}`, {
      task: this.send('Account Activation for Attendance', 'confirmation', {
        name: this.name,
        url,
      }),
    });
  }

  /**
   * Sends a mail for a user to reset their password.
   *
   * @param url - URL to the webservice to reset the user's password.
   */
  async sendForgotPassword(url: string) {
    await bull.add(`email-forgot-password-${this.to}`, {
      task: this.send('Password Reset for Attendance', 'forgot-password', {
        name: this.name,
        url,
      }),
    });
  }

  /**
   * Sends a security alert notification. Will be pushed into a
   * Bull queue to prevent overhead.
   */
  async sendNotification() {
    await bull.add(`email-notification-${this.to}`, {
      task: this.send('Security Alert for Attendance', 'notification', {
        name: this.name,
      }),
    });
  }

  /**
   * Sends an OTP with Email media. Will be pushed into a Bull queue
   * to prevent overhead.
   *
   * @param otp - OTP as a string.
   */
  async sendOTP(otp: string) {
    await bull.add(`email-otp-${this.to}`, {
      task: this.send('Your requested OTP for Attendance', 'otp', {
        otp,
        name: this.name,
      }),
    });
  }

  /**
   * Sends an email to remind the user to check out for today. This is
   * not supposed to be used in the API, but it is used in Cloud Functions
   * or cronjobs. Use a different Bull queue if need be.
   */
  async sendReminder(url: string) {
    await this.send('Reminder to check out for today', 'reminder', {
      name: this.name,
      url,
    });
  }

  /**
   * Sends an email in order to notify a user that they have successfully reset
   * their password. This is pushed into a Bull queue.
   */
  async sendResetPassword() {
    await bull.add(`email-reset-password-${this.to}`, {
      task: this.send(
        'Password Reset Confirmation for Attendance',
        'reset-password',
        {
          name: this.name,
        },
      ),
    });
  }

  /**
   * Sends an email to notify a user that he/she have update their password
   * to a new one.
   */
  async sendUpdatePassword() {
    await bull.add(`email-update-password-${this.to}`, {
      task: this.send(
        'Your Attendance password has been changed',
        'update-password',
        { name: this.name },
      ),
    });
  }
}

export default Email;
