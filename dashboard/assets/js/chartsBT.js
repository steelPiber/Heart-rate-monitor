// 비트트랙 운동심박수 차트 그리기 스크립트 (선 라인)
function workoutChart(url) {
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
                const ctxElements = document.querySelectorAll('.workout-graph');
                
                ctxElements.forEach(ctxElement => {
                    const ctx = ctxElement.getContext('2d');
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
                            responsive: true, // 반응형 옵션
                            maintainAspectRatio: false, // 종횡비 유지 여부
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
                });
            } else {
                console.error('No data found or data is not an array');
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

// 비트트랙 적정운동량 차트 그리기 스크립트 (가로 막대)
function targetZoneChart(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const latestData = data[data.length - 1]; // 가장 마지막 데이터를 선택
                console.log('Latest data:', latestData);
                const heartRateZoneEntries = latestData.heartRateZoneEntries;
                // x, y 값을 배열로 추출 및 라벨 매핑
                const labels = heartRateZoneEntries.map(entry => {
                    switch (entry.x) {
                        case 0: return 'Maximum';
                        case 1: return 'Hard';
                        case 0: return 'Warm up';
                        case 1: return 'Light';
                        case 2: return 'Moderate';
                        case 3: return 'Light';
                        case 4: return 'Warm up';
                        case 3: return 'Hard';
                        case 4: return 'Maximum';
                        default: return '';
                    }
                });
                const values = heartRateZoneEntries.map(entry => entry.y);
                const canvases = document.querySelectorAll('.target-zone');
                canvases.forEach(canvas => {
                    const ctx = canvas.getContext('2d');
                    const backgroundColors = [
                        '#F3463A', '#FF695F', '#FF8880', '#FF9E97', '#FFBEB9'
                    ]; // 막대 색상
                    const yLabelColors = [
                        '#F3463A', '#FF695F', '#FF8880', '#FF9E97', '#FFBEB9'
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
                                data: values, // x축 데이터
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
                                        color: function (context) {
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
                        plugins: [{ // y축 라벨 제자리에 있도록 하는 코드 (건들면 모양 안 예뻐짐)
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
            } else {
                console.error('No data found or data is not an array');
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    workoutChart('/training-record/records');
    targetZoneChart('/training-record/records');
    workoutmap('/training-record/records');
});

function workoutmap(url){
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.length > 0) {
                const latestData = data[data.length - 1];
                console.log('Latest map data:', latestData);

                var distanceElements = document.querySelectorAll(".wr-distance");
                var timeElements = document.querySelectorAll(".wr-time");

                distanceElements.forEach(element => {
                    element.textContent = Math.round(latestData.distance) + ' m';
                    //initMap(record.pathPoints);
                });

                // Update time elements with the elapsed time (converted to minutes)
                timeElements.forEach(element => {
                    var elapsedTimeInMinutes = Math.floor(latestData.elapsedTime / 60000);
                    element.textContent = elapsedTimeInMinutes + ' min';
                });
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });

}


// function initMap(pathPoints) {
//     if (!pathPoints || pathPoints.length === 0) return;

//     const map = new google.maps.Map(document.querySelectorAll(map), {
//         zoom: 15,
//         center: { lat: pathPoints[0].latitude, lng: pathPoints[0].longitude },
//     });

//     const bounds = new google.maps.LatLngBounds();
//     const route = pathPoints.map(point => {
//         const latLng = { lat: point.latitude, lng: point.longitude };
//         bounds.extend(latLng);
//         return latLng;
//     });

//     const polyline = new google.maps.Polyline({
//         path: route,
//         geodesic: true,
//         strokeColor: '#FF0000',
//         strokeOpacity: 1.0,
//         strokeWeight: 2,
//     });

//     polyline.setMap(map);
//     map.fitBounds(bounds);
// }