const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: "test1",
    pass: "test1",
  },
});

transporter
  .sendMail({
    from: "UNI-SHARE <ngquoctoan662005@gmail.com>",
    to: "ngquoctoan662005@gmail.com",
    subject: "Test SMTP Brevo",
    text: "Nếu nhận được email này thì SMTP OK!",
  })
  .then((info) => {
    console.log("✅ Gửi thành công:", info.messageId);
  })
  .catch((err) => {
    console.error("❌ Lỗi:", err.message);
  });
