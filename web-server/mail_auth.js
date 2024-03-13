const nodemailer = require('nodemailer');

// 랜덤 코드 생성 함수
function generateRandomCode(n) {
    let str = '';
    for (let i = 0; i < n; i++) {
        str += Math.floor(Math.random() * 10);
    }
    return str;
}

// 회원가입 인증 메일 보내는 함수
function sendVerificationEmail(userEmail) {
    let code = generateRandomCode(6); // 6자리 랜덤 코드 생성

    // 보내는 메일 설정
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        port: 587,
        host: 'smtp.gmail.com',
        secure: false,
        requireTLS: true,
        auth: {
            user: mail.env.NODEMAILER_USER, // 환경 변수에서 가져오도록 수정
            pass: mail.env.NODEMAILER_PASS // 환경 변수에서 가져오도록 수정
        }
    });

    // 메일 옵션 설정
    let mailOptions = {
        from: `"Heart-rate-monitor" <${mail.env.NODEMAILER_USER}>`, // 환경 변수에서 가져오도록 수정
        to: userData.useremail,
        subject: "[회원가입 인증] 이메일 인증을 완료해주세요.",
        html: `<h1>회원가입을 위한 이메일 인증</h1>
            <p>회원가입을 완료하려면 아래의 인증 코드를 입력해주세요:</p>
            <h2>${code}</h2>
            <p><a href='www.example.com/verify'>인증 코드 확인하기</a></p>`
    };

    // 메일 발송
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Error sending email:", error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
}