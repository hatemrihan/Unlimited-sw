export const adminEmails = process.env.ADMIN_EMAILS
  ? process.env.ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : [
    "hatemrihan100@gmail.com",
    "muhamed.alkady@gmail.com",
    "halaamohamedaziz@gmail.com"
  ];
