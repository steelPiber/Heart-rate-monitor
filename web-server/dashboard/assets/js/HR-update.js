// 심박수 데이터 가져오기 및 업데이트 함수

// 실시간 BPM 데이터 가져오는 렌더링 함수
async function fetchAndRenderRealtimeData(){
    try {
        const response = await fetch('/realtime-bpm');
        const data = await response.json();
        // 첫 번째 요소가 유효한 값인지 확인
        let bpmValue = data[0] !== null ? parseFloat(data[0]) : "x";
        
        document.querySelectorAll('.bpmValue').forEach(element => {
            element.textContent = bpmValue;
        });
    } catch(error) {
        console.error('BPM data 패치 실패:', error);
        document.querySelectorAll('.bpmValue').forEach(element => {
            element.textContent = 'Error';
        });
    }
}

// 1분 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderData() {
    fetch('/average-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.minbpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                // 데이터가 배열이고 첫 번째 항목이 존재하는지 확인
                if (data.length > 0) {
                    const listItem = document.createElement('li');
                    listItem.classList.add('list-group-item', 'data-item');
                    listItem.innerHTML = `${data[0]}`; // 첫 번째 항목을 사용

                    container.appendChild(listItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 시간당 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderHourlyData() {
    fetch('/hour-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.hourbpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                if (data.length > 0) {
                    const hourItem = document.createElement('li');
                    hourItem.classList.add('list-group-item', 'data-item');
                    hourItem.innerHTML = `${data[0]}`;

                    container.appendChild(hourItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 하루 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderDayData() {
    fetch('/day-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.daybpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                if (data.length > 0) {
                    const dayItem = document.createElement('li');
                    dayItem.classList.add('list-group-item', 'data-item');
                    dayItem.innerHTML = `${data[0]}`;

                    container.appendChild(dayItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 주 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderWeekData() {
    fetch('/week-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.weekbpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                if (data.length > 0) {
                    const weekItem = document.createElement('li');
                    weekItem.classList.add('list-group-item', 'data-item');
                    weekItem.innerHTML = `${data[0]}`;

                    container.appendChild(weekItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 월 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderMonthData() {
    fetch('/month-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.monthbpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                if (data.length > 0) {
                    const monthItem = document.createElement('li');
                    monthItem.classList.add('list-group-item', 'data-item');
                    monthItem.innerHTML = `${data[0]}`;

                    container.appendChild(monthItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 연 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderYearData() {
    fetch('/year-bpm')
        .then(response => response.json())
        .then(data => {
            document.querySelectorAll('.yearbpmContainer').forEach(container => {
                container.innerHTML = ''; // 이전 데이터 지우기

                if (data.length > 0) {
                    const yearItem = document.createElement('li');
                    yearItem.classList.add('list-group-item', 'data-item');
                    yearItem.innerHTML = `${data[0]}`;

                    container.appendChild(yearItem);
                } else {
                    console.error('데이터가 비어 있습니다.');
                }
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 데이터 업데이트 간격 설정
setInterval(fetchAndRenderRealtimeData, 1000); // 실시간 : 1초 마다 실행
setInterval(fetchAndRenderData, 5000); // 1분 평균 BPM 업데이트
setInterval(fetchAndRenderHourlyData, 5000); // 시간당 평균 BPM 업데이트
setInterval(fetchAndRenderDayData, 5000); // 하루당 평균 BPM 업데이트
setInterval(fetchAndRenderWeekData, 5000); // 주당 평균 BPM 업데이트
setInterval(fetchAndRenderMonthData, 5000); // 월당 평균 BPM 업데이트
setInterval(fetchAndRenderYearData, 5000); // 연당 평균 BPM 업데이트

// 페이지 로드시 초기 데이터 가져오기
document.addEventListener('DOMContentLoaded', fetchAndRenderRealtimeData);
document.addEventListener('DOMContentLoaded', fetchAndRenderData);
document.addEventListener('DOMContentLoaded', fetchAndRenderHourlyData);
document.addEventListener('DOMContentLoaded', fetchAndRenderDayData);
document.addEventListener('DOMContentLoaded', fetchAndRenderWeekData);
document.addEventListener('DOMContentLoaded', fetchAndRenderMonthData);
document.addEventListener('DOMContentLoaded', fetchAndRenderYearData);
