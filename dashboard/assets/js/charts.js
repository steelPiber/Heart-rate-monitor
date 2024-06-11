//대시보드 심박수평균 daily weekly monthly (선 라인)
// 캔버스 요소와 2D 컨텍스트 가져오기
function updateChart(data) {
    // 차트를 초기화
    const ctx = document.getElementById('graph').getContext('2d');
    const labels = data.map(item => item[0]); // 첫 번째 요소는 시간
    const values = data.map(item => item[1]); // 두 번째 요소는 BPM 값

    // 기존 차트를 초기화
    if (window.myChart) {
        window.myChart.destroy();
    }

    // 새로운 차트를 생성
    window.myChart = new Chart(ctx, {
        type: 'line', // 차트 유형: 선형 차트
        data: {
            labels: labels, // x축 라벨
            datasets: [{
                label: 'Heart Rate', // 데이터셋 라벨
                data: values, // y축 데이터
                borderColor: 'rgba(75, 192, 192, 1)', // 선 색상
                borderWidth: 1 // 선 두께
            }]
        },
        options: {
            responsive: true, // 반응형 옵션
            maintainAspectRatio: false, // 종횡비 유지 여부
            scales: {
                y: {
                    beginAtZero: true // y축 시작값을 0으로 설정
                }
            }
        }
    });
}

// 페이지 로드 시 초기 차트 데이터를 로드
fetch('/hourly-chart')
.then(response => response.json())
.then(responseData => {
    const { userEmail, data } = responseData;
    console.log('User Email:', userEmail); // 추가된 userEmail을 로그에 출력
    updateChart(data);// 차트 업데이트 함수 호출
})
.catch(error => {
    console.error('Error fetching initial chart data:', error);
});   


//대시보드 활동수면안정평상운동 그래프 (도넛)
 // 캔버스 요소와 2D 컨텍스트 가져오기
//고쳐야되는부분
var canvas = document.getElementById('donut-graph');
//고쳐야되는부분
var ctx = canvas.getContext('2d');
//차트 생성 함수

var icons = [
    '../assets/img/normal.png', 
    '../assets/img/rest.png', 
    '../assets/img/sleep.png',
    '../assets/img/workout.png',
    '../assets/img/loading.gif'
];

function donutChart(url) {
    let dailyTag; // 데이터를 저장할 변수
    const hourLabels = ['활동', '수면', '안정', '평상', '운동']; // 라벨
    dailyTag = [90, 75, 90, 98, 37]; // 임시 데이터
    /*fetch(url) 
        .then(response => response.json())
        .then(data => {
            const hourLabels = data.map(item => item[0]);
            const dailyTag = data.map(item => item[1]);*/

            //고쳐야되는부분
            var canvas = document.getElementById('donut-graph');
            //고쳐야되는부분
            var ctx = canvas.getContext('2d');
            
            const backgroundColors = [
                '#ef476f','#ffd166','#06d6a0','#118ab2','#073b4c'
            ];


            new Chart(ctx, {
                type: "doughnut", // 차트 유형: 도넛
                data: {
                    labels: hourLabels, // x축 라벨
                    datasets: [{
                        label: "BPM 박동수", // 데이터셋 라벨
                        fill: true, // 채우기 옵션
                        data: dailyTag, // y축 데이터
                        backgroundColor: backgroundColors, // 배경 색상
                        maxBarThickness: 6 // 최대 막대 두께
                    }],
                },
                options: {
                    responsive: true, // 반응형 옵션
                    maintainAspectRatio: false, // 종횡비 유지 여부
                    plugins: {
                        legend: {
                            display: false, // 범례 숨김
                        }
                    },
                    interaction: {
                        intersect: false, // 교차 지점에서만 툴팁 표시
                        mode: 'index', // 인덱스 모드 사용
                    },
                    hover: {
                        onHover: function(event, chartElement) {
                            if (chartElement.length) {
                                // 마우스가 데이터 포인트 위에 있을 때
                                var index = chartElement[0].index;
                                centerIcon.src = icons[index];
                                centerIcon.style.display = 'block';
                            } else {
                                // 마우스가 데이터 포인트 밖에 있을 때
                                centerIcon.style.display = 'none';
                            }
                        }
                    },
                    layout: {
                        padding: {
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0
                        }
                    },
                    scales: {
                        y: {
                            grid: {
                                drawBorder: false,
                                display: true,
                                drawOnChartArea: true,
                                drawTicks: false,
                                borderDash: [5, 5]
                            },
                            ticks: {
                                display: true,
                                padding: 10,
                                color: '#fbfbfb',
                                font: {
                                    size: 11,
                                    family: "Open Sans",
                                    style: 'normal',
                                    lineHeight: 2
                                },
                            }
                        },
                        x: {
                            grid: {
                                drawBorder: false,
                                display: false,
                                drawOnChartArea: false,
                                drawTicks: false,
                                borderDash: [5, 5]
                            },
                            ticks: {
                                display: false,
                                color: '#ccc',
                                padding: 20,
                                font: {
                                    size: 11,
                                    family: "Open Sans",
                                    style: 'normal',
                                    lineHeight: 2
                                },
                            }
                        },
                    },
                },
            });
        }/*)
        .catch(error => {
            console.error('Error fetching chart data:', error);
        });
}*/

donutChart();


//대시보드 안정활동휴식수면평상 하루 그래프 (막대)
// 캔버스 요소와 2D 컨텍스트 가져오기
//고쳐야되는부분
var canvas = document.getElementById('bar-graph');
//고쳐야되는부분
var ctx = canvas.getContext('2d');
//차트 생성 함수
function barChart(url) {
    const hourLabels = ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
    /*fetch(url) 
        .then(response => response.json())
        .then(data => {
            const hourLabels = data.map(item => item[0]);
            const avgBPMs = data.map(item => item[1]);*/

            //고쳐야되는부분
            var canvas = document.getElementById('bar-graph');
            //고쳐야되는부분
            var ctx = canvas.getContext('2d');

            new Chart(ctx, {
                type: "bar", // 차트 유형: 막대
                data: {
                    labels: hourLabels, // x축 라벨
                    datasets: [{
                        label: "활동", // 데이터셋 라벨
                        fill: true, // 채우기 옵션
                        data: [12, 19, 3, 5, 2, 3, 9, 10,12, 19, 3, 5, 2, 3, 9, 10,12, 19, 3, 5, 2, 3, 9, 10], // y축 데이터
                        backgroundColor: '#ef476f', // 배경 색상
                        barThickness: 20 // 막대 두께
                    },{
                        label: "수면",
                        fill: true,
                        data:  [2, 3, 20, 5, 1, 4, 6, 8,2, 3, 20, 5, 1, 4, 6, 8,2, 3, 20, 5, 1, 4, 6, 8],
                        backgroundColor: '#ffd166',
                        barThickness: 20
                    },{
                        label: "안정",
                        fill: true,
                        data: [3, 10, 13, 15, 22, 7, 11, 6,3, 10, 13, 15, 22, 7, 11, 6,3, 10, 13, 15, 22, 7, 11, 6],
                        backgroundColor: '#06d6a0',
                        barThickness: 20
                    },{
                        label: "평상",
                        fill: true,
                        data: [5, 2, 10, 20, 30, 14, 8, 12,5, 2, 10, 20, 30, 14, 8, 12,5, 2, 10, 20, 30, 14, 8, 12],
                        backgroundColor: '#118ab2',
                        barThickness: 20
                    },{
                        label: "운동",
                        fill: true,
                        data: [20, 30, 15, 10, 5, 9, 3, 1,20, 30, 15, 10, 5, 9, 3, 1,20, 30, 15, 10, 5, 9, 3, 1],
                        backgroundColor: '#073b4c',
                        barThickness: 20
                    }],
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    plugins: {
                        tooltip: {      //막대그래프 호버시 보이는 순서 바꾸는 코드
                            callbacks: {
                                label: function(tooltipItem) {
                                    const datasetIndex = tooltipItem.datasetIndex;
                                    const datasets = tooltipItem.chart.data.datasets;
                                    const orderedDatasets = [datasets[4], datasets[3], datasets[2], datasets[1], datasets[0]]; // 운동, 평상, 안정, 수면, 활동 순서
                                    const dataset = orderedDatasets[datasetIndex];
                                    return dataset.label + ': ' + dataset.data[tooltipItem.dataIndex];
                                },
                                datasetLabel: function(context) {
                                    return context.dataset.label || '';
                                }
                            },
                            itemSort: function(a, b) {
                                const order = ['운동', '평상', '안정', '수면', '활동'];
                                return order.indexOf(a.dataset.label) - order.indexOf(b.dataset.label);
                            }
                        },
                        legend: {
                            display: false,
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index',
                    },
                    scales: {
                        y: {
                            stacked: true,
                            grid: {
                                drawBorder: false,
                                display: true,
                                drawOnChartArea: true,
                                drawTicks: false,
                                borderDash: [5, 5]
                            },
                            ticks: {
                                display: true,
                                padding: 0,
                                color: '#fbfbfb',
                                font: {
                                    size: 11,
                                    family: "Open Sans",
                                    style: 'normal',
                                    lineHeight: 2
                                },
                            }
                        },
                        x: {
                            stacked: true,
                            grid: {
                                drawBorder: false,
                                display: false,
                                drawOnChartArea: false,
                                drawTicks: false,
                                borderDash: [5, 5]
                            },
                            ticks: {
                                display: true,
                                color: '#ccc',
                                padding: 10,
                                font: {
                                    size: 11,
                                    family: "Open Sans",
                                    style: 'normal',
                                    lineHeight: 2
                                },
                            }
                        },
                    },
                },
            });
        }/*)
        .catch(error => {
            console.error('Error fetching chart data:', error);
        });
}*/

barChart();



