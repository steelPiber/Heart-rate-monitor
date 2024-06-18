// 운동량 달성 알림 코드
document.addEventListener("DOMContentLoaded", function() {
    // rest-current와 rest-goal 요소 선택
    const restCurrentElement = document.querySelector('.rest-current');
    const restGoalElement = document.querySelector('.rest-goal');
    const questAnnounceElement = document.querySelector('.quest-announce');
    const mobQuestAnnounceElement = document.querySelector('.mob-quest-announce');

    // 텍스트 값에서 % 기호를 제거하고 숫자로 변환
    const restCurrentValue = parseFloat(restCurrentElement.textContent);
    const restGoalValue = parseFloat(restGoalElement.textContent);

    // 값 비교 및 quest-announce 텍스트 변경
    if (restCurrentValue <= restGoalValue) {
        questAnnounceElement.textContent = "적정 운동량을 달성했습니다!";
        mobQuestAnnounceElement.textContent = "적정 운동량을 달성했습니다!";
    }
});

