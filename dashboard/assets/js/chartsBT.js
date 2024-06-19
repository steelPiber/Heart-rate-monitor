// 비트트랙 운동심박수 차트 그리기 스크립트 (선 라인)
function workoutChart(url) {
    const canvases = document.querySelectorAll('.workout-graph');
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data.length > 0) {
            const latestData = data[data.length - 1]; // 가장 마지막 데이터를 선택
            console.log('Latest data:', latestData);
            const segmentHeartRateEntries = latestData.segmentHeartRateEntries;
    
            // x, y 값을 배열로 추출
            const labels = segmentHeartRateEntries.map(entry => entry.x);
            const heartRates = segmentHeartRateEntries.map(entry => entry.y);

            // Chart.js를 이용해 그래프 그리기
            const ctx = document.getElementById('heartRateChart').getContext('2d');
            const heartRateChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Segment Heart Rate',
                        data: heartRates,
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                    }]
                },
                options: {
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Segment'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Heart Rate'
                            }
                        }
                    }
                }
            });
        } else {
            console.error('No data found or data is not an array');
        }
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
}
workoutChart();

// 비트트랙 적정운동량 차트 그리기 스크립트 (가로 막대)
function targetZoneChart() {
    const canvases = document.querySelectorAll('.target-zone');
    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        let avgBPMs;
        const labels = ['Maximum','Hard','Moderate','Light','Warm up'];
        avgBPMs = [10,20,40,70,100];

        const backgroundColors = [
            '#F3463A','#FF695F','#FF8880','#FF9E97','#FFBEB9'
        ]; // 막대 색상
        const yLabelColors = [
            '#F3463A','#FF695F','#FF8880','#FF9E97','#FFBEB9'
        ]; // y축 라벨 색상

        new Chart(ctx, {
            type: "bar", // 차트 유형: 가로 막대 차트
            data: {
                labels: labels, // y축 라벨
                datasets: [{
                    label: "", // 데이터셋 라벨
                    tension: 0.4, // 선의 곡률
                    borderWidth: 0,
                    pointRadius: 0, // 데이터 포인트 크기
                    fill: true, // 선 아래를 채움
                    data: avgBPMs, // x축 데이터
                    backgroundColor: backgroundColors, // 막대 색상
                    barThickness: 46 // 막대 두께
                }],
            },
            options: {
                indexAxis: 'y', // y축에 라벨 표시
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
                scales: {
                    y: {
                        grid: {
                            drawBorder: false,
                            display: false,
                            drawOnChartArea: true,
                            drawTicks: false,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            display: true,
                            padding: 10,
                            color: function(context){
                                return yLabelColors[context.index] || '#000';
                            },
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
                            display: true,
                            drawOnChartArea: true,
                            drawTicks: false,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            display: true,
                            color: '#fbfbfb',
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
            plugins: [{     //y축 라벨 제자리에 있도록 하는 코드 (건들면 모양안이뻐짐)
                afterDraw: chart => {
                    const yScale = chart.scales.y;
                    const tickCount = yScale.ticks.length;
                    const tickWidth = yScale.width / tickCount;

                    chart.ctx.save();
                    chart.ctx.fillStyle = '#000';
                    chart.ctx.textAlign = 'right';
                    chart.ctx.textBaseline = 'middle';

                    yScale.ticks.forEach((tick, index) => {
                        const xPos = yScale.left - 10;
                        const yPos = yScale.getPixelForTick(index);
                        chart.ctx.fillText(tick.label, xPos, yPos);
                    });

                    chart.ctx.restore();
                }
            }]
        });
    });
}

targetZoneChart();

document.addEventListener('DOMContentLoaded', () => {
    workoutChart('/training-record/records');
});
