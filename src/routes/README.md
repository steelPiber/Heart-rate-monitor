## `data.rs` 코드 설명

#### 모듈 및 외부 크레이트 불러오기
```rust
use axum::{
    routing::post,  // POST 요청을 처리하기 위한 모듈을 가져옴
    Router,  // 라우터를 생성하기 위한 모듈을 가져옴
    extract::Json,  // JSON 데이터를 추출하기 위한 모듈을 가져옴
    http::StatusCode,  // HTTP 상태 코드를 사용하기 위한 모듈을 가져옴
    response::IntoResponse,  // 응답을 생성하기 위한 모듈을 가져옴
};
use serde::Deserialize;  // JSON 직렬화 및 역직렬화를 위한 모듈을 가져옴
use std::sync::Arc;  // 여러 스레드 간에 안전하게 공유할 수 있는 참조 카운팅 포인터를 가져옴
use tokio_postgres::Client;  // PostgreSQL 클라이언트를 가져옴
```

### Data 구조체
`Data` 구조체는 클라이언트에서 전송되는 JSON 데이터를 파싱하기 위해 정의됨
```rust
#[derive(Deserialize, Debug)]
struct Data {
    bpm: String,  // 심박수 값을 문자열로 저장
    email: String,  // 이메일 주소를 문자열로 저장
    tag: String,  // 태그를 문자열로 저장
    timestamp: String,  // 타임스탬프를 문자열로 저장
}
```

### handle_post 함수
`handle_post` 함수는 POST 요청을 처리하고, JSON 데이터를 데이터베이스에 삽입하는 역할을 수행함
```rust
async fn handle_post(Json(payload): Json<Data>, client: Arc<Client>) -> impl IntoResponse {
    // 요청 본문을 콘솔에 출력함
    println!("Received request body: {:?}", payload);

    // BPM 값을 숫자로 변환하고 오류가 발생하면 HTTP 400 상태 코드를 반환함
    let bpm = match payload.bpm.parse::<i32>() {
        Ok(bpm) => bpm,  // 변환 성공 시 bpm 변수에 저장
        Err(_) => {
            // 오류 메시지를 콘솔에 출력하고 HTTP 400 응답 반환
            println!("Invalid BPM value: {:?}", payload.bpm);
            return (StatusCode::BAD_REQUEST, "Invalid BPM value").into_response();
        }
    };

    // 이메일 주소에서 도메인 부분을 제거하고 형식이 잘못된 경우 HTTP 400 상태 코드를 반환함
    let email_without_domain = match payload.email.split('@').next() {
        Some(e) => e.to_string(),  // 도메인 부분 제거 성공 시 email_without_domain 변수에 저장
        None => {
            // 오류 메시지를 콘솔에 출력하고 HTTP 400 응답 반환
            println!("Invalid email format: {:?}", payload.email);
            return (StatusCode::BAD_REQUEST, "Invalid email format").into_response();
        }
    };

    // 데이터베이스에 BPM 데이터를 삽입하고 성공 여부에 따라 HTTP 상태 코드를 반환함
    match insert_bpm_data(&client, bpm, &email_without_domain, &payload.tag, &payload.timestamp).await {
        Ok(_) => {
            // 성공 메시지를 콘솔에 출력하고 HTTP 200 응답 반환
            println!("Successfully inserted BPM data into PostgreSQL");
            (StatusCode::OK, "Request received").into_response()
        }
        Err(err) => {
            // 오류 메시지를 콘솔에 출력하고 HTTP 500 응답 반환
            println!("Error inserting BPM data into PostgreSQL: {:?}", err);
            (StatusCode::INTERNAL_SERVER_ERROR, "Error inserting data").into_response()
        }
    }
}
```

### insert_bpm_data 함수
`insert_bpm_data` 함수는 데이터베이스에 BPM 데이터를 삽입하는 역할을 수행함
```rust
async fn insert_bpm_data(client: &Client, bpm: i32, email: &str, tag: &str, timestamp: &str) -> Result<(), tokio_postgres::Error> {
    // SQL 삽입 쿼리를 정의함
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)";
    // 타임스탬프 문자열을 NaiveDateTime으로 변환하고, 실패 시 현재 시간을 사용함
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,  // 변환 성공 시 time 변수에 저장
        Err(_) => chrono::Utc::now().naive_utc(),  // 변환 실패 시 현재 시간 사용
    };
    // SQL 쿼리를 실행하여 데이터 삽입
    client.execute(insert_sql, &[&bpm, &email, &tag, &time]).await?;
    Ok(())
}
```

### create_routes 함수
`create_routes` 함수는 라우터를 생성하여 POST 요청을 처리하는 엔드포인트를 정의함
```rust
pub fn create_routes(client: Arc<Client>) -> Router {
    // POST 요청을 처리하는 라우트를 생성하고 반환함
    Router::new().route("/", post(move |json| handle_post(json, client.clone())))
}
```

### 요약
- `data.rs` 파일은 HTTP POST 요청을 처리하여 클라이언트에서 받은 JSON 데이터를 데이터베이스에 삽입하는 기능을 제공함
- `handle_post` 함수는 JSON 데이터를 파싱하고, 유효성을 검사하며, 데이터베이스에 삽입함
- `insert_bpm_data` 함수는 데이터베이스에 BPM 데이터를 삽입하는 로직을 구현함
- `create_routes` 함수는 라우터를 생성하여 POST 요청을 처리하는 엔드포인트를 정의함

---
