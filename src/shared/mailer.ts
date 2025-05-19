import sgMail from '@sendgrid/mail';

export class MailService {
  setApiKey(apiKey: string) {
    sgMail.setApiKey(apiKey);
  }

  async send(message: any) {
    return sgMail.send(message);
  }
}
