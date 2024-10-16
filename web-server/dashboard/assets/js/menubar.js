//모바일네비바 펼치기스크립트
document.getElementById('hamburger-mob').addEventListener('click', function() {
    document.getElementById('nav-mob').classList.toggle('open');
});

//pc 버전 메뉴바 펼치기 스크립트
document.addEventListener('DOMContentLoaded', function () {
    const hamburger = document.getElementById('hamburger-pc');
    const overlay = document.getElementById('overlay');
    const navPc = document.querySelector('.nav-pc');
    const navItems = document.querySelectorAll('.nav-links li span, .nav-logout span');

    hamburger.addEventListener('click', function () {
        if (navPc.style.width === '250px') {
            navPc.style.width = '80px';
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 300); // 0.3s transition
            navItems.forEach(item => item.style.display = 'none');
        } else {
            navPc.style.width = '250px';
            overlay.style.display = 'block';
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);
            navItems.forEach(item => item.style.display = 'inline');
        }
    });

    overlay.addEventListener('click', function () {
        navPc.style.width = '80px';
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300); // 0.3s transition
        navItems.forEach(item => item.style.display = 'none');
    });
});

//로그아웃 버튼 클릭 이벤트 리스너 추가

document.querySelector('.logout').addEventListener('click', function() {
    fetch('/logout', { //클릭 시 서버로 로그아웃 요청을 보냄
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            // 로그아웃 성공 시, 홈 페이지로 리디렉션
            window.location.href = 'https://heartrate.ddns.net';
        } else {
            // 로그아웃 실패 시, 에러 메시지 출력
            alert('로그아웃에 실패했습니다.');
        }
    })
    .catch(error => {
        console.error('Error during logout:', error);
        alert('로그아웃 중 에러가 발생했습니다.');
    });
});

//유저 프로필 가져오는 함수
function fetchUserProfileImage() {
    fetch('/profile')
        .then(response => {
            if (!response.ok) {
                throw new Error('네트워크 응답이 정상이 아닙니다');
            }
            return response.json();
        })
        .then(data => {
            const profileImageUrl = data.userProfileUrl;
            
            // 데스크톱 레이아웃 이미지 업데이트
            const profileImgElementPC = document.getElementById('profile-img-pc');
            if (profileImgElementPC) {
                profileImgElementPC.src = profileImageUrl;
            }
            
            // 모바일 레이아웃 이미지 업데이트
            const profileImgElementMob = document.getElementById('profile-img-mob');
            if (profileImgElementMob) {
                profileImgElementMob.src = profileImageUrl;
            }
        })
        .catch(error => {
            console.error('프로필 이미지 데이터를 가져오는 중 오류 발생:', error);
            // 선택적으로 오류 처리: 기본 이미지 설정 또는 오류 메시지 표시
        });
}

// DOM이 로드되면 함수를 호출합니다
document.addEventListener('DOMContentLoaded', fetchUserProfileImage);