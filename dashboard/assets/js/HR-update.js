// 심박수 데이터 가져오기 및 업데이트 함수

  
//실시간 BPM 데이터 가져오는 렌더링 함수
async function fetchAndRenderRealtimeData(){
    try{
        response = await fetch('/realtime-bpm');
        const data = await response.json();
        //첫 번째 요소가 유효한 값인지 확인
        let bpmValue = data[0] !== null ? parseFloat(data[0]) : "x";
        
        document.getElementById('bpmValue').textContent = bpmValue;
    } catch(error){
        console.error('BPM data 패치 실패:',error);
        document.getElementById('bpmValue').textContent = 'Error';
    }
}


// 1분 평균 BPM 데이터를 가져오고 렌더링하는 함수
function fetchAndRenderData() {
    fetch('/average-bpm')
        .then(response => response.json())
        .then(data => {
            const minbpmContainer = document.getElementById('minbpmContainer');
            minbpmContainer.innerHTML = ''; // 이전 데이터 지우기

            // 데이터가 배열이고 첫 번째 항목이 존재하는지 확인
            if (data.length > 0) {
                const listItem = document.createElement('li');
                listItem.classList.add('list-group-item', 'data-item');
                listItem.innerHTML = `${data[0]}`; // 첫 번째 항목을 사용

                minbpmContainer.appendChild(listItem);
            } else {
                console.error('데이터가 비어 있습니다.');
            }
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
            const hourbpmContainer = document.getElementById('hourbpmContainer');
            hourbpmContainer.innerHTML = ''; // 이전 데이터 지우기
            if(data.length > 0) {
                const hourItem = document.createElement('li');
                hourItem.classList.add('list-group-item', 'data-item');
                hourItem.innerHTML = `${data[0]}`;

                hourbpmContainer.appendChild(hourItem);
            } else {
                	console.error('데이터가 비어 있습니다.');
               }
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
            const daybpmContainer = document.getElementById('daybpmContainer');
            daybpmContainer.innerHTML = ''; // 이전 데이터 지우기
            if(data.length > 0) {
                const dayItem = document.createElement('li');
                dayItem.classList.add('list-group-item', 'data-item');
                 dayItem.innerHTML = `${data[0]}`;

                daybpmContainer.appendChild(dayItem);
            }else {
            	console.error('데이터가 비어 있습니다.');
               }
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
            const weekbpmContainer = document.getElementById('weekbpmContainer');
            weekbpmContainer.innerHTML = ''; // 이전 데이터 지우기
            data.forEach(item => {
                const hourItem = document.createElement('li');
                hourItem.classList.add('list-group-item', 'data-item');
                    hourItem.innerHTML = `${item[0]}`;

                weekbpmContainer.appendChild(hourItem);
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
            const monthbpmContainer = document.getElementById('monthbpmContainer');
            monthbpmContainer.innerHTML = ''; // 이전 데이터 지우기
            data.forEach(item => {
                const hourItem = document.createElement('li');
                hourItem.classList.add('list-group-item', 'data-item');
                    hourItem.innerHTML = `${item[0]}`;

                monthbpmContainer.appendChild(hourItem);
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
            const yearbpmContainer = document.getElementById('yearbpmContainer');
            yearbpmContainer.innerHTML = ''; // 이전 데이터 지우기
            data.forEach(item => {
                const hourItem = document.createElement('li');
                hourItem.classList.add('list-group-item', 'data-item');
                    hourItem.innerHTML = `${item[0]}`;

                yearbpmContainer.appendChild(hourItem);
            });
        })
        .catch(error => {
            console.error('데이터 가져오기 오류:', error);
        });
}

// 데이터 업데이트 간격 설정
setInterval(fetchAndRenderRealtimeData,1000);//실시간 : 1초 마다 실행
setInterval(fetchAndRenderData, 5000); // 1분 평균 BPM 업데이트
setInterval(fetchAndRenderHourlyData, 5000); // 시간당 평균 BPM 업데이트
setInterval(fetchAndRenderDayData, 5000); // 하루당 평균 BPM 업데이트
setInterval(fetchAndRenderWeekData, 5000); // week당 평균 BPM 업데이트
setInterval(fetchAndRenderMonthData, 5000); // month당 평균 BPM 업데이트
setInterval(fetchAndRenderYearData, 5000); // year당 평균 BPM 업데이트

// 페이지 로드시 초기 데이터 가져오기
document.addEventListener('DOMContentLoaded', fetchAndRenderRealtimeData);
document.addEventListener('DOMContentLoaded', fetchAndRenderData);
document.addEventListener('DOMContentLoaded', fetchAndRenderHourlyData);
document.addEventListener('DOMContentLoaded', fetchAndRenderDayData);
document.addEventListener('DOMContentLoaded', fetchAndRenderWeekData);
document.addEventListener('DOMContentLoaded', fetchAndRenderMonthData);
document.addEventListener('DOMContentLoaded', fetchAndRenderYearData);
