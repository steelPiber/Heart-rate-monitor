const WebSocket = require('ws');

// WebSocket 서버의 URL
const wsUrl = 'ws://127.0.0.1:13389';

// WebSocket 클라이언트 객체 생성
const ws = new WebSocket(wsUrl);

ws.on('open', function open() {
    console.log('Connected to the server.');
});

ws.on('message', function incoming(data) {
    console.log('Received:', data);
    // 메시지 파싱 및 출력
    parseMessage(data.toString()); // 문자열로 변환하여 전달
});

function parseMessage(message) {
    // 정규 표현식을 사용하여 메시지 파싱
    const regex = /^(\d+):\s*bpm:\s*(\d+)\s*user\(email=(.+)\)$/;

    const match = message.toString().match(regex); // 문자열로 변환하여 정규 표현식 적용
    if (match) {
        const userId = match[1];
        const bpm = match[2];
        const email = match[3];

        console.log(`User ID: ${userId}`);    // 사용자 ID 출력
        console.log(`BPM: ${bpm}`);           // BPM 값 출력
        console.log(`Email: ${email}`);       // 이메일 주소 출력
    } else {
        console.error('Failed to parse the message');
    }
}

ws.on('close', function close() {
    console.log('Disconnected from the server.');
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

