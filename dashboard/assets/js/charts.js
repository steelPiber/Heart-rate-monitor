// 클릭 이벤트를 통해 데이터를 가져오고 차트를 업데이트하는 함수
document.getElementById('daily-btn').addEventListener('click', function() {
    fetchData('/hourly-chart');
});

document.getElementById('weekly-btn').addEventListener('click', function() {
    fetchData('/weekly-chart');
});

document.getElementById('monthly-btn').addEventListener('click', function() {
    fetchData('/monthly-chart');
});

// 데이터를 가져와 차트를 업데이트하는 함수
function fetchData(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const chartData = data.data;
            const labels = chartData.map(item => item[0]);
            const values = chartData.map(item => item[1]);
            updateChart(labels, values);
        })
        .catch(error => console.error('Error fetching data:', error));
}

// 차트를 생성하고 업데이트하는 함수
let myChart;
function updateChart(labels, values) {
    const ctx = document.getElementById('myChart').getContext('2d');
    if (myChart) {
        myChart.destroy();
    }
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Heart Rate',
                data: values,
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// 도넛 차트를 생성하는 함수
function donutChart(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            const tagTranslations = {
                active: '활동',
                exercise: '운동',
                rest: '안정',
                normal: '평상',
                sleep: '수면'
            };

            const labels = Object.keys(data).map(tag => tagTranslations[tag] || tag);
            const values = Object.values(data);

            const canvases = document.querySelectorAll('.donut-graph');
            canvases.forEach(canvas => {
                const ctx = canvas.getContext('2d');

                const backgroundColors = [
                    '#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'
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
                                display: true,
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'index',
                        },
                        hover: {
                            onHover: function(event, chartElement) {
                                if (chartElement.length) {
                                    var index = chartElement[0].index;
                                    centerIcon.src = icons[index];
                                    centerIcon.style.display = 'block';
                                } else {
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

// 막대 차트를 생성하는 함수
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
                normal: '평상',
                sleep: '수면'
            };

            const datasets = tags.map(tag => ({
                label: tagTranslations[tag],
                fill: true,
                data: new Array(hours.length).fill(0),
                backgroundColor: getColorForTag(tag),
                maxBarThickness: 10
            }));

            data.forEach(item => {
                const hourIndex = hours.indexOf(item.hour);
                const tagIndex = tags.indexOf(item.tag);
                if (hourIndex !== -1 && tagIndex !== -1) {
                    datasets[tagIndex].data[hourIndex] = item.data_count;
                }
            });

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
                            const order = ['운동', '평상', '안정', '수면', '활동'];
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
                                            const order = ['운동', '평상', '안정', '수면', '활동'];
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
                        barPercentage: 0.6,
                        categoryPercentage: 0.6
                    },
                });
            });
        })
        .catch(error => {
            console.error('Error fetching chart data:', error);
        });
}

// 태그에 따른 색상 반환
function getColorForTag(tag) {
    switch (tag) {
        case 'active': return '#ef476f';
        case 'exercise': return '#ffd166';
        case 'rest': return '#06d6a0';
        case 'normal': return '#118ab2';
        case 'sleep': return '#073b4c';
        default: return '#000';
    }
}

// 페이지 로드 시 도넛 차트와 막대 차트 초기화
document.addEventListener('DOMContentLoaded', () => {
    donutChart('/daily-tag-chart');
    barChart('/bar-chart');
});
