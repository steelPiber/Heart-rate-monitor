console.log(`VERSION_ORACLEDB_0.1_12.01`);
console.log(`0.1 : mail_auth.js 모듈 분리`);
require('dotenv').config();
const nodemailer = require('nodemailer');

function generateRandomCode(n) {
    let str = '';
    for (let i = 0; i < n; i++) {
        str += Math.floor(Math.random() * 10);
    }
    return str;
}

function sendVerificationEmail(userEmail) {
    let code = generateRandomCode(6);
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        host: 'smtp.gmail.com',
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,  // 환경 변수 사용
            pass: process.env.EMAIL_PASS   // 환경 변수 사용
        }
    });

    let mailOptions = {
        from: `"Heart-rate-monitor" <${process.env.EMAIL_USER}>`, // 환경 변수 사용
        to: userEmail,
        subject: "[회원가입 인증] 이메일 인증을 완료해주세요.",
        html: `<h1>회원가입을 위한 이메일 인증</h1>
        <p>회원가입을 완료하려면 아래의 인증 코드를 입력해주세요:</p>
        <h2>${code}</h2>
        <p><a href='www.example.com/verify'>인증 코드 확인하기</a></p>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Error sending email:", error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}
