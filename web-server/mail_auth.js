const nodemailer = require('nodemailer');
const senderinfo = require('senderinfo.json');

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
            user: senderinfo.user, // 환경 변수에서 가져오도록 수정
            pass: senderinfo.pass  // 환경 변수에서 가져오도록 수정
        }
    });

    let mailOptions = {
        from: `"Heart-rate-monitor" <${senderinfo.user}>`, // 환경 변수에서 가져오도록 수정
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
