//heartinfo.rs
use axum::{
    extract::{Json, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::Client as PgClient;
use tracing::info;

// 심박수 평균 정보를 저장하기 위한 HeartRateInfo 구조체
#[derive(Deserialize, Serialize)]
struct HeartRateInfo {
    rest: Option<TagInfo>,     // 휴식 시 심박수 정보
    active: Option<TagInfo>,   // 활동 시 심박수 정보
    exercise: Option<TagInfo>, // 운동 시 심박수 정보
    periodic_data: Option<PeriodicData>, // 주기별 심박수 정보
}

// 각 태그에 대한 최대 및 최소 심박수 정보를 저장하기 위한 TagInfo 구조체
#[derive(Deserialize, Serialize)]
struct TagInfo {
    max: Option<i32>, // 최대 심박수 평균
    min: Option<i32>, // 최소 심박수 평균
}

// 주기별 심박수 데이터를 저장하기 위한 PeriodicData 구조체
#[derive(Deserialize, Serialize)]
struct PeriodicData {
    daily: Option<Vec<PeriodicEntry>>,    // 일별 심박수 정보
    weekly: Option<Vec<PeriodicEntry>>,   // 주별 심박수 정보
    monthly: Option<Vec<PeriodicEntry>>,  // 월별 심박수 정보
    six_months: Option<Vec<PeriodicEntry>>, // 6개월 주기 심박수 정보
    yearly: Option<Vec<PeriodicEntry>>,   // 연간 심박수 정보
}

// 각 주기별 심박수 항목을 저장하기 위한 PeriodicEntry 구조체
#[derive(Deserialize, Serialize)]
struct PeriodicEntry {
    label: String, // 주기를 나타내는 레이블 (예: 일, 주, 월 등)
    values: i32,   // 평균 심박수 값
}

// 심박수 정보를 위한 라우트를 생성하는 함수
pub fn create_routes(client: Arc<PgClient>) -> Router {
    let client_clone_for_heart_rate = client.clone();

    Router::new().route(
        "/", // 경로를 정의합니다.
        get(move |Query(params): Query<HeartRateParams>| {
            // GET 요청을 처리하는 핸들러를 정의합니다.
            let client = client_clone_for_heart_rate.clone(); // 데이터베이스 클라이언트의 복사본을 가져옵니다.

            async move {
                if params.email.contains('@') {
                    // 이메일 형식이 '@'를 포함하는지 확인합니다.
                    info!("Received request for heart rate info for email: {}", params.email);
                    // 이메일 형식이 유효한 경우 심박수 정보를 가져오는 핸들러 함수 호출
                    get_heart_rate_info_handler(params.email, client)
                        .await // 비동기 함수 호출 대기
                        .into_response() // 결과를 HTTP 응답 형식으로 변환
                } else {
                    info!("Invalid email format received: {}", params.email);
                    // 이메일 형식이 잘못된 경우 400 Bad Request 응답 반환
                    (StatusCode::BAD_REQUEST, "Invalid email format").into_response()
                }
            }
        }),
    )
}

// 심박수 요청 파라미터 구조체
#[derive(Deserialize)]
struct HeartRateParams {
    email: String,
}

// 심박수 평균 정보를 가져오는 핸들러 함수
async fn get_heart_rate_info_handler(
    email: String,
    client: Arc<PgClient>,
) -> Result<Json<HeartRateInfo>, (StatusCode, &'static str)> {
    match get_heart_rate_info(&email, &client).await {
        Ok(Some(heart_rate_info)) => {
            info!("Found heart rate info for email: {}", email);
            // 심박수 평균 정보를 JSON으로 반환
            Ok(Json(heart_rate_info))
        }
        Ok(None) => {
            info!("No heart rate data found for email: {}", email);
            // 데이터가 없는 경우
            Err((StatusCode::NOT_FOUND, "Heart rate data not found"))
        }
        Err(err) => {
            info!("Database error for email {}: {:?}", email, err);
            // 데이터베이스 오류 발생
            Err((StatusCode::INTERNAL_SERVER_ERROR, "Database error"))
        }
    }
}

// 데이터베이스에서 심박수 평균 정보를 가져오는 함수
async fn get_heart_rate_info(
    email: &str,
    client: &PgClient,
) -> Result<Option<HeartRateInfo>, Box<dyn std::error::Error + Send + Sync>> {
    let query = "WITH RankedBpm AS (
                    SELECT bpm, tag,
                           NTILE(5) OVER (PARTITION BY tag ORDER BY bpm) AS percentile_rank
                    FROM public.bpmdata
                    WHERE email = $1 AND tag IN ('rest', 'active', 'exercise')
                    GROUP BY bpm, tag
                 )
                 SELECT tag, range, AVG(bpm)::INT AS avg_bpm
                 FROM (
                    SELECT tag, 'min_20%_avg' AS range, bpm
                    FROM RankedBpm
                    WHERE percentile_rank = 1
                    GROUP BY tag, bpm
                    UNION ALL
                    SELECT tag, 'max_20%_avg' AS range, bpm
                    FROM RankedBpm
                    WHERE percentile_rank = 5
                    GROUP BY tag, bpm
                 ) AS averages
                 GROUP BY tag, range";

    println!("Executing query for email: {}", email); // 쿼리 실행 전 로그
    let rows = client.query(query, &[&email]).await?;
    println!("Query result rows: {:?}", rows); // 쿼리 결과 로그 추가

    let mut heart_rate_info = HeartRateInfo {
        rest: None,
        active: None,
        exercise: None,
        periodic_data: None,
    };

    let mut rest_info = TagInfo {
        max: None,
        min: None,
    };
    let mut active_info = TagInfo {
        max: None,
        min: None,
    };
    let mut exercise_info = TagInfo {
        max: None,
        min: None,
    };

    for row in rows {
        let tag: String = row.get("tag");
        let range: String = row.get("range");
        let avg_bpm: i32 = row.get("avg_bpm");

        match (tag.as_str(), range.as_str()) {
            ("rest", "max_20%_avg") => rest_info.max = Some(avg_bpm),
            ("rest", "min_20%_avg") => rest_info.min = Some(avg_bpm),
            ("active", "max_20%_avg") => active_info.max = Some(avg_bpm),
            ("active", "min_20%_avg") => active_info.min = Some(avg_bpm),
            ("exercise", "max_20%_avg") => exercise_info.max = Some(avg_bpm),
            ("exercise", "min_20%_avg") => exercise_info.min = Some(avg_bpm),
            _ => (),
        }
    }

    if rest_info.max.is_some() || rest_info.min.is_some() {
        heart_rate_info.rest = Some(rest_info);
    }
    if active_info.max.is_some() || active_info.min.is_some() {
        heart_rate_info.active = Some(active_info);
    }
    if exercise_info.max.is_some() || exercise_info.min.is_some() {
        heart_rate_info.exercise = Some(exercise_info);
    }

    // 주기별 데이터 가져오기
    let periodic_data = get_periodic_heart_rate_info(email, client).await?;
    heart_rate_info.periodic_data = Some(periodic_data);

    if heart_rate_info.rest.is_none()
        && heart_rate_info.active.is_none()
        && heart_rate_info.exercise.is_none()
        && heart_rate_info.periodic_data.is_none()
    {
        Ok(None)
    } else {
        Ok(Some(heart_rate_info))
    }
}

// 데이터베이스에서 시간별, 일별, 주별, 월별 평균 심박수 정보를 가져오는 함수
async fn get_periodic_heart_rate_info(
    email: &str,
    client: &PgClient,
) -> Result<PeriodicData, Box<dyn std::error::Error + Send + Sync>> {
    let queries = [
        // 1일: 현재 시간으로부터 1시간 간격으로 00시 ~ 23시 표시
        ("daily", "WITH HourlyData AS (
            SELECT date_trunc('hour', time) AS hour, AVG(bpm) AS avg_heart_rate
            FROM public.bpmdata
            WHERE email = $1 AND time >= NOW() - INTERVAL '1 day'
            GROUP BY hour
         )
         SELECT to_char(hour, 'YYYY-MM-DD HH24:00') AS label, avg_heart_rate::INT AS values
         FROM HourlyData
         ORDER BY hour"),

        // 1주: 현재 시간으로부터 하루 간격으로 요일 표시
        ("weekly", "WITH DailyData AS (
            SELECT date_trunc('day', time) AS day, AVG(bpm) AS avg_heart_rate
            FROM public.bpmdata
            WHERE email = $1 AND time >= NOW() - INTERVAL '1 week'
            GROUP BY day
         )
         SELECT to_char(day, 'FMDay') AS label, avg_heart_rate::INT AS values
         FROM DailyData
         ORDER BY day"),

        // 1개월: 현재 시간으로부터 하루 간격으로 1개월 주기 표시
        ("monthly", "WITH MonthlyData AS (
            SELECT date_trunc('day', time) AS day, AVG(bpm) AS avg_heart_rate
            FROM public.bpmdata
            WHERE email = $1 AND time >= NOW() - INTERVAL '1 month'
            GROUP BY day
         )
         SELECT to_char(day, 'YYYY-MM-DD') AS label, avg_heart_rate::INT AS values
         FROM MonthlyData
         ORDER BY day"),

        // 6개월: 주간 간격으로 6개월 주기 표시
        ("six_months", "WITH WeeklyData AS (
            SELECT date_trunc('week', time) AS week, AVG(bpm) AS avg_heart_rate
            FROM public.bpmdata
            WHERE email = $1 AND time >= NOW() - INTERVAL '6 months'
            GROUP BY week
         )
         SELECT to_char(week, 'MM-DD ~ MM-DD') AS label, avg_heart_rate::INT AS values
         FROM WeeklyData
         ORDER BY week"),

        // 1년: 월별 간격으로 1년 주기 표시
        ("yearly", "WITH MonthlyData AS (
            SELECT date_trunc('month', time) AS month, AVG(bpm) AS avg_heart_rate
            FROM public.bpmdata
            WHERE email = $1 AND time >= NOW() - INTERVAL '1 year'
            GROUP BY month
         )
         SELECT to_char(month, 'YYYY-MM') AS label, avg_heart_rate::INT AS values
         FROM MonthlyData
         ORDER BY month")
    ];

    let mut periodic_data = PeriodicData {
        daily: None,
        weekly: None,
        monthly: None,
        six_months: None,
        yearly: None,
    };

    for (period, query) in &queries {
        println!("Executing query for email: {}", email); // 쿼리 실행 전 로그
        let rows = client.query(*query, &[&email]).await?;
        println!("Query result rows: {:?}", rows); // 쿼리 결과 로그 추가

        let mut entries = Vec::new();
        for row in rows {
            let label: String = row.get("label");
            let values: i32 = row.get("values");
            entries.push(PeriodicEntry { label, values });
        }

        match *period {
            "daily" => periodic_data.daily = Some(entries),
            "weekly" => periodic_data.weekly = Some(entries),
            "monthly" => periodic_data.monthly = Some(entries),
            "six_months" => periodic_data.six_months = Some(entries),
            "yearly" => periodic_data.yearly = Some(entries),
            _ => (),
        }
    }

    Ok(periodic_data)
}