//대시보드 심박수평균 daily weekly monthly (선 라인)
function updateChart(data, chartClass) {
    // 모든 해당 클래스의 캔버스를 선택
    const canvases = document.querySelectorAll(`.${chartClass}`);
    canvases.forEach(canvas => {
        const ctx = canvas.getContext('2d');
        const labels = data.map(item => item[0]); // 첫 번째 요소는 시간
        const values = data.map(item => item[1]); // 두 번째 요소는 BPM 값

        // 기존 차트를 초기화
        if (canvas.chartInstance) {
            canvas.chartInstance.destroy();
        }

        // 새로운 차트를 생성
        canvas.chartInstance = new Chart(ctx, {
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
    });
}

// 대시보드 활동수면안정평상운동 그래프 (도넛)
function donutChart(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // 태그 번역
            const tagTranslations = {
                active: '활동',
                exercise: '운동',
                rest: '안정',
                sleep: '수면'
            };

            // 데이터에서 태그와 값을 추출하고 번역
            const labels = Object.keys(data).map(tag => tagTranslations[tag] || tag);
            const values = Object.values(data);

            // 모든 해당 클래스의 캔버스를 선택
            const canvases = document.querySelectorAll('.donut-graph');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');

                const backgroundColors = [
                    '#ef476f','#ffd166','#06d6a0','#118ab2','#073b4c'
                ];

                if (canvas.chartInstance) {
                    canvas.chartInstance.destroy();
                }

                canvas.chartInstance = new Chart(ctx, {
                    type: "doughnut",
                    data: {
                        labels: labels,
                        datasets: [{
                            label: "Daily Activity",
                            fill: true,
                            data: values,
                            backgroundColor: backgroundColors,
                            maxBarThickness: 6
                        }],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true, // 범례를 표시하도록 변경
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index',
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
                        }
                    },
                });
            });
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
        });
}

donutChart();

// 대시보드 안정활동휴식수면평상 하루 그래프 (막대)
function barChart(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const hours = [...new Set(data.map(item => item.hour))];
            const tags = ['active', 'exercise', 'rest', 'normal', 'sleep'];

            const tagTranslations = {
                active: '활동',
                exercise: '운동',
                rest: '안정',
                sleep: '수면'
            };

            // 태그별 데이터 초기화
            const datasets = tags.map(tag => ({
                label: tagTranslations[tag],
                fill: true,
                data: new Array(hours.length).fill(0),
                backgroundColor: getColorForTag(tag),
                maxBarThickness: 10 // 막대의 최대 두께를 줄여서 간격을 좁힘
            }));

            // 데이터 매핑
            data.forEach(item => {
                const hourIndex = hours.indexOf(item.hour);
                const tagIndex = tags.indexOf(item.tag);
                if (hourIndex !== -1 && tagIndex !== -1) {
                    datasets[tagIndex].data[hourIndex] = item.data_count;
                }
            });

            // 모든 해당 클래스의 캔버스를 선택
            const canvases = document.querySelectorAll('.bar-graph');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');

                if (canvas.chartInstance) {
                    canvas.chartInstance.destroy();
                }

                canvas.chartInstance = new Chart(ctx, {
                    type: "bar",
                    data: {
                        labels: hours,
                        datasets: datasets.sort((a, b) => {
                            const order = ['운동', '안정', '수면', '활동'];
                            return order.indexOf(a.label) - order.indexOf(b.label);
                        }),
                    },
                    options: {
                        responsive: false,
                        maintainAspectRatio: false,
                        plugins: {
                            tooltip: {
                                callbacks: {
                                    label: function(tooltipItem) {
                                        const datasetIndex = tooltipItem.datasetIndex;
                                        const datasets = tooltipItem.chart.data.datasets;
                                        const orderedDatasets = datasets.slice().sort((a, b) => {
                                            const order = ['운동', '안정', '수면', '활동'];
                                            return order.indexOf(a.label) - order.indexOf(b.label);
                                        });
                                        const dataset = orderedDatasets[datasetIndex];
                                        return dataset.label + ': ' + dataset.data[tooltipItem.dataIndex];
                                    },
                                    datasetLabel: function(context) {
                                        return context.dataset.label || '';
                                    }
                                },
                                itemSort: function(a, b) {
                                    const order = ['운동', '안정', '수면', '활동'];
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
                        barPercentage: 0.6,  // 막대 사이의 간격을 좁히기 위한 옵션
                        categoryPercentage: 0.6 // 카테고리 간격을 좁히기 위한 옵션
                    },
                });
            });
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
        });
}

function getColorForTag(tag) {
    switch (tag) {
        case 'active': return '#ef476f';
        case 'exercise': return '#ffd166';
        case 'rest': return '#06d6a0';
        case 'sleep': return '#073b4c';
        default: return '#000';
    }
}

barChart();

// Initialize donut and bar charts on page load or when needed
document.addEventListener('DOMContentLoaded', () => {
    donutChart('/daily-tag-chart');
    barChart('/bar-chart');
});

setInterval(() => {
    donutChart('/daily-tag-chart');
}, 5000);

setInterval(() => {
    barChart('/bar-chart');
}, 5000);
