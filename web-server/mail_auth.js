async function sendVerificationEmail(userEmail) {
    let code = generateRandomCode(6);
    let transporter = node_mailer.createTransport({
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

    // 이메일 주소가 유효한지 확인
    if (!validateEmail(userEmail)) {
        console.log("Invalid email address:", userEmail);
        return null; // 유효하지 않은 이메일 주소인 경우 null 반환
    }

    let mailOptions = {
        from: `"Heart-rate-monitor" <${process.env.EMAIL_USER}>`, // 환경 변수 사용
        to: userEmail,
        subject: "[회원가입 인증] 이메일 인증을 완료해주세요.",
        html: `<h1>회원가입을 위한 이메일 인증</h1>
        <p>회원가입을 완료하려면 아래의 인증 코드를 입력해주세요:</p>
        <h2>${code}</h2>`
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log("Error sending email:", error);
        } else {
            console.log('Email sent:', info.response);
        }
    });
    return code;
}

// 이메일 주소 유효성 검사 함수
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

module.exports = {
    sendVerificationEmail,
};
