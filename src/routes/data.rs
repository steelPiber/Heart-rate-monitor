use axum::{
    extract::Json,          // JSON 데이터를 추출하기 위한 모듈
    http::StatusCode,       // HTTP 상태 코드를 사용
    response::IntoResponse, // 응답을 생성하기 위한 모듈
    routing::post,          // POST 요청을 처리하기 위한 모듈
    Router,                 // 라우터를 생성하기 위한 모듈
};
use serde::Deserialize; // JSON 직렬화 및 역직렬화를 위한 모듈
use std::sync::Arc; // 여러 스레드 간에 안전하게 공유할 수 있는 참조 카운팅 포인터
use tokio_postgres::Client; // PostgreSQL 클라이언트를 가져옴

// Data 구조체를 정의하고 Deserialize 트레이트를 구현하여 JSON 데이터를 파싱할 수 있게 함
#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,       // 심박수 값을 문자열로 저장
    email: String,     // 이메일 주소를 문자열로 저장
    tag: String,       // 태그를 문자열로 저장
    timestamp: String, // 타임스탬프를 문자열로 저장
}
// POST 요청을 처리하는 비동기 함수
async fn handle_post(Json(payload): Json<Data>, client: Arc<Client>) -> impl IntoResponse {
    println!("Received request body: {:?}", payload); // 요청 본문을 콘솔에 출력

    // BPM 값을 숫자로 변환하고 오류가 발생하면 HTTP 400 상태 코드를 반환함
    let bpm = match payload.bpm.parse::<i32>() {
        Ok(bpm) => bpm, // 변환 성공 시 bpm 변수에 저장
        Err(_) => {
            println!("Invalid BPM value: {:?}", payload.bpm); // 오류 메시지를 콘솔에 출력
            return (StatusCode::BAD_REQUEST, "Invalid BPM value").into_response();
            // HTTP 400 응답 반환
        }
    };

    // 이메일 주소에서 도메인 부분을 제거하고 형식이 잘못된 경우 HTTP 400 상태 코드를 반환함
    let email_without_domain = match payload.email.split('@').next() {
        Some(e) => e.to_string(), // 도메인 부분 제거 성공 시 email_without_domain 변수에 저장
        None => {
            println!("Invalid email format: {:?}", payload.email); // 오류 메시지를 콘솔에 출력
            return (StatusCode::BAD_REQUEST, "Invalid email format").into_response();
            // HTTP 400 응답 반환
        }
    };
    // 데이터베이스에 BPM 데이터를 삽입하고 성공 여부에 따라 HTTP 상태 코드를 반환함
    match insert_bpm_data(
        &client,
        bpm,
        &email_without_domain,
        &payload.tag,
        &payload.timestamp,
    )
    .await
    {
        Ok(_) => {
            println!("Successfully inserted BPM data into PostgreSQL"); //성공 메시지 콘솔에 출력
            (StatusCode::OK, "Request received").into_response() //HTTP 200 응답 반환
        }
        Err(err) => {
            println!("Error inserting BPM data into PostgreSQL: {:?}", err); // 오류 메시지를 콘솔에 출력
            (StatusCode::INTERNAL_SERVER_ERROR, "Error inserting data").into_response()
            // HTTP 500 응답 반환
        }
    }
}
// BPM 데이터를 데이터베이스에 삽입하는 비동기 함수 insert_bpm_data를 정의함
async fn insert_bpm_data(
    client: &Client,
    bpm: i32,
    email: &str,
    tag: &str,
    timestamp: &str,
) -> Result<(), tokio_postgres::Error> {
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)"; // SQL 삽입 쿼리를 정의
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,                               // 타임스탬프 문자열을 NaiveDateTime으로 변환
        Err(_) => chrono::Utc::now().naive_utc(), // 시간 변환 실패 시 현재 시간 사용
    };
    client
        .execute(insert_sql, &[&bpm, &email, &tag, &time])
        .await?; // SQL 쿼리를 실행하여 데이터 삽입
    Ok(())
}
// 라우트를 생성하는 함수 create_routes를 정의함
pub fn create_routes(client: Arc<Client>) -> Router {
    Router::new().route("/", post(move |json| handle_post(json, client.clone())))
    // POST 요청을 처리하는 라우트를 생성
}
