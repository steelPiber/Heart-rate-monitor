use axum::{
    extract::{Extension, Query}, //GET 용청을 처리하는 라운팅 모듈
    response::IntoResponse,      //응답 생성 모듈
    routing::get,                //URL 쿼리 파라미터 호출
    Json,                        //JSON 응답 모듈
    Router,                      //라우터 생성 모듈
};

use serde::Deserialize; //역직렬 모듈
use std::sync::Arc; //참조 카운터 모듈
use tokio_postgres::Client; //PostgreSQL 클라이언트 모듈

//URL 쿼리 파라미터 역직렬화 struct
#[derive(Deserialize)]
struct UserQuery {
    email: String,
}

//응답 JSON struct
#[derive(serde::Serialize)]
struct HourlyDateResponse {
    user_email: String,
    data: Vec<(String, i32)>, //날짜, 심박수
}

//매시간 BPM 데이터를 가져오는 핸들러 함수
async fn get_hourly_chart(
    Query(params): Query<UserQuery>,
    Extension(client): Extension<Arc<Client>>,
) -> impl IntoResponse {
    let hourly_sql = "
            SELECT to_char(time, 'Mon DD HH24') AS hour, ROUND(AVG(bpm)) AS avg_bpm
            FROM bpmdata
            WHERE email = $1
            GROUP BY to_char(time, 'Mon DD HH24')
            ORDER BY hour;
        ";
    //데이터베이스 쿼리 실행
    match client.query(hourly_sql, &[&params.email]).await {
        Ok(rows) => {
            if rows.is_empty() {
                return Json(serde_json::json!({"none":"none"})).into_response();
            }

            //데이터 변환 및 응답 형식화
            let data: vec<(String, i32)> = rows
                .iter()
                .map(|row| {
                    let formatted_date: String = row.get("hour");
                    let avg_bpm: i32 = row.get("avg_bpm");
                    (formatted_date, avg_bpm)
                })
                .collect();

            let response_data = HourlyDateResponse {
                user_email: params.email.clone(),
                data,
            };
            Json(response_data).into_response()
        }
        Err(err) => {
            eprintln!("Error querying hourly BPM data: {:?}", err); // 오류 로그 출력
            (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Error retrieving data",
            )
                .into_response()
        }
    }
}

pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route(
        "/hourly-chart",
        get(get_hourly_chart).layer(Extension(client)), // 공유 클라이언트를 전달하기 위해 확장 레이어 사용
    )
}
