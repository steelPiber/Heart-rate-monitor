let currentPage = 1; // 초기 페이지 설정
const recordsPerPage = 5; // 페이지당 운동 기록 수
const pagesPerGroup = 10; // 그룹당 페이지 수

async function fetchRecords(page = 1) {
    try {
        console.log(`Fetching records for page: ${page}`);
        const response = await fetch(`/training-record/records`);
        if (!response.ok) {
            throw new Error('Failed to fetch records');
        }
        const records = await response.json();
        console.log("Fetched records:", records);

        // 최신 기록이 첫 페이지에 나오도록 레코드를 역순으로 정렬
        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 전체 레코드 수
        const totalRecords = records.length;

        // 현재 페이지의 레코드만 가져오기
        const startIndex = (page - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const currentRecords = records.slice(startIndex, endIndex);

        const recordList = document.getElementById('record-list');
        recordList.innerHTML = '';

        currentRecords.forEach(record => {
            const avgHeartRate = record.segments.reduce((sum, seg) => sum + seg.avgHeartRate, 0) / record.segments.length;
            const recordDiv = document.createElement('div');
            recordDiv.classList.add('record');
            recordDiv.innerHTML = `
                <div class="record-details">
                    거리: <span>${(record.distance / 1000).toFixed(2)} km</span><br>
                    시간: <span>${Math.floor(record.elapsedTime / 60)} min ${record.elapsedTime % 60} sec</span><br>
                    소모 칼로리: <span>${Math.floor(record.calories)}</span><br>
                    시작 시간: <span>${new Date(record.date).toLocaleString()}</span><br>
                    평균 심박수: <span>${isNaN(avgHeartRate) ? 'N/A' : avgHeartRate.toFixed(2)}</span><br><br><br>
                    <a href="#" onclick="fetchSegments('${record._id}')">심박수 통계</a>
                </div>
                <div id="map-${record._id}" class="map"></div>
            `;
            recordList.appendChild(recordDiv);
            initMap(record.pathPoints, `map-${record._id}`);
        });

        renderPagination(totalRecords, page);
    } catch (error) {
        console.error('Error fetching records:', error);
    }
}

function renderPagination(totalRecords, page) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    const totalPages = Math.ceil(totalRecords / recordsPerPage);
    const currentGroup = Math.ceil(page / pagesPerGroup);
    const startPage = (currentGroup - 1) * pagesPerGroup + 1;
    const endPage = Math.min(currentGroup * pagesPerGroup, totalPages);

    if (currentGroup > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = '이전';
        prevButton.addEventListener('click', () => {
            currentPage = startPage - 1;
            fetchRecords(currentPage);
        });
        pagination.appendChild(prevButton);
    }

    for (let i = startPage; i <= endPage; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        if (i === page) {
            button.disabled = true;
        }
        button.addEventListener('click', () => {
            currentPage = i;
            fetchRecords(currentPage);
        });
        pagination.appendChild(button);
    }

    if (currentGroup * pagesPerGroup < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = '다음';
        nextButton.addEventListener('click', () => {
            currentPage = endPage + 1;
            fetchRecords(currentPage);
        });
        pagination.appendChild(nextButton);
    }
}

async function fetchSegments(recordId) {
    try {
        const response = await fetch(`/training-record/${recordId}/segments`);
        if (!response.ok) {
            throw new Error('Failed to fetch segments');
        }
        const segments = await response.json();
        console.log("Fetched segments:", segments);
        const segmentList = document.getElementById('segment-list');
        segmentList.innerHTML = '';
        segments.forEach(segment => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `평균 심박수: <span>${segment.avgHeartRate}</span><br>
                                최저 심박수: <span>${segment.minHeartRate}</span><br>
                                최대 심박수: <span>${segment.maxHeartRate}</span><br><br>`;
            segmentList.appendChild(listItem);
        });
        document.getElementById('segment-details').style.display = 'block';
        document.getElementById('record-list').style.display = 'none';
    } catch (error) {
        console.error('Error fetching segments:', error);
    }
}

function hideSegmentDetails() {
    document.getElementById('segment-details').style.display = 'none';
    document.getElementById('record-list').style.display = 'block';
}

function initMap(pathPoints, elementId) {
    if (!pathPoints || pathPoints.length === 0) return;

    const map = new google.maps.Map(document.getElementById(elementId), {
        zoom: 15,
        center: { lat: pathPoints[0].latitude, lng: pathPoints[0].longitude },
    });

    const bounds = new google.maps.LatLngBounds();
    const route = pathPoints.map(point => {
        const latLng = { lat: point.latitude, lng: point.longitude };
        bounds.extend(latLng);
        return latLng;
    });

    const polyline = new google.maps.Polyline({
        path: route,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
    });

    polyline.setMap(map);
    map.fitBounds(bounds);
}

document.addEventListener("DOMContentLoaded", () => {
    fetchRecords(currentPage);
});
