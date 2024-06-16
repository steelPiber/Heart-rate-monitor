let currentPage = 1; // 초기 페이지 설정
const recordsPerPage = 5; // 페이지당 운동 기록 수

async function fetchRecords(page) {
    try {
        const response = await fetch(`/training-record/records?page=${page}&limit=${recordsPerPage}`);
        if (!response.ok) {
            throw new Error('Failed to fetch records');
        }
        const { records, totalRecords } = await response.json(); // 서버에서 전체 레코드 수와 현재 페이지 레코드를 함께 전달받음
        console.log(`Fetched records (page ${page}):`, records);
        const recordList = document.getElementById('record-list');
        recordList.innerHTML = '';
        records.forEach(record => {
            const avgHeartRate = record.segments.reduce((sum, seg) => sum + seg.avgHeartRate, 0) / record.segments.length;
            const recordDiv = document.createElement('div');
            recordDiv.classList.add('record');
            recordDiv.innerHTML = `
                <div class="record-details">
                    <a href="#" onclick="fetchSegments('${record._id}')">
                        Distance: ${(record.distance / 1000).toFixed(2)} km<br>
                        Time: ${Math.floor(record.elapsedTime / 60)} min ${record.elapsedTime % 60} sec<br>
                        Calories: ${Math.floor(record.calories)}<br>
                        Start Time: ${new Date(record.date).toLocaleString()}<br>
                        Avg Heart Rate: ${isNaN(avgHeartRate) ? 'N/A' : avgHeartRate.toFixed(2)}
                    </a>
                </div>
                <div id="map-${record._id}" class="map" style="width: 100%; height: 200px;"></div>
            `;
            recordList.appendChild(recordDiv);
            initMap(record.pathPoints, `map-${record._id}`);
        });

        // 페이지네이션 처리
        const pagination = document.getElementById('pagination');
        pagination.innerHTML = '';
        const totalPages = Math.ceil(totalRecords / recordsPerPage);
        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.classList.add('page-button');
            if (i === page) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', function() {
                currentPage = i;
                fetchRecords(currentPage);
            });
            pagination.appendChild(pageButton);
        }
    } catch (error) {
        console.error('Error fetching records:', error);
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
            listItem.innerHTML = `
                평균 심박수: <span>${segment.avgHeartRate}</span><br>
                최저 심박수: <span>${segment.minHeartRate}</span><br>
                최대 심박수: <span>${segment.maxHeartRate}</span><br><br>
            `;
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