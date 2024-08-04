## `main.rs` 코드 설명 문서

### 개요
`main.rs` 파일은 Rust 애플리케이션의 진입점입니다. 이 파일에서는 데이터베이스 초기화, 테이블 생성, 그리고 다양한 라우트를 설정하고 HTTP 서버를 시작하는 역할

### 코드 설명

#### 모듈 및 패키지 가져오기
```rust
mod db;
mod routes;

use axum::Router;
use db::client::init_db;
use db::schema::create_table_if_not_exists;
use dotenv::dotenv;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use tracing_subscriber;
```
- `mod db; mod routes;`: `db`와 `routes` 모듈을 가져옵니다. 이 모듈들은 데이터베이스 클라이언트 및 스키마와 라우트 정의
- `use` 문: 외부 패키지와 모듈 내의 특정 기능들을 가져옵니다. 예를 들어, `axum`의 `Router`, `dotenv`의 `dotenv` 함수, `tokio`의 `sleep`과 `Duration` 등을 사용

#### `main` 함수
```rust
#[tokio::main]
async fn main() {
    println!("Starting Rust application...");

    dotenv().ok();
    tracing_subscriber::fmt::init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string());
    println!("Database URL: {}", database_url);

    // PostgreSQL 시작 대기
    let client = loop {
        match init_db(&database_url).await {
            Ok(client) => break Arc::new(client),
            Err(err) => {
                println!("Failed to connect to database: {:?}", err);
                println!("Retrying in 5 seconds...");
                sleep(Duration::from_secs(5)).await;
            }
        }
    };

    println!("Database connected");

    create_table_if_not_exists(&client)
        .await
        .expect("Failed to create table");
    println!("Table checked/created");

    let app = Router::new()
        .nest("/data", routes::data::create_routes(client.clone()))
        .nest("/recent", routes::recent::create_routes(client.clone()))
        .nest("/current-time", routes::time::create_routes())
        .nest("/realtime", routes::real_hrt::create_routes(client.clone()))
        .nest("/min-bpm", routes::min_hrt::create_routes(client.clone()));

    let addr = SocketAddr::from(([0, 0, 0, 0], 13389));
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
    {
        eprintln!("Server error: {}", err);
    }
}
```

- `#[tokio::main]`: 이 애트리뷰트는 `main` 함수가 비동기 함수임을 나타내며, `tokio` 런타임을 사용하여 실행
- `println!("Starting Rust application...");`: 애플리케이션 시작을 알리는 메시지를 출력
- `dotenv().ok();`: `.env` 파일을 로드하여 환경 변수를 설정
- `tracing_subscriber::fmt::init();`: `tracing_subscriber`를 초기화하여 로그 출력을 설정
- `let database_url = ...`: `DATABASE_URL` 환경 변수를 가져오거나 기본값을 설정
- `println!("Database URL: {}", database_url);`: 데이터베이스 URL을 출력
- `let client = loop { ... }`: 데이터베이스에 연결을 시도하고, 실패하면 5초 후에 재시도합니다. 성공 시 `Arc`로 감싼 클라이언트를 반환
- `println!("Database connected");`: 데이터베이스 연결 성공 메시지를 출력
- `create_table_if_not_exists(&client) ...`: 테이블이 존재하지 않으면 테이블을 생성
- `println!("Table checked/created");`: 테이블 생성 또는 확인 메시지를 출력
- `let app = Router::new() ...`: 여러 경로(route)를 설정하여 라우터를 구성
  - `/data`: 데이터 관련 라우트
  - `/recent`: 최근 데이터 라우트
  - `/current-time`: 현재 시간 라우트
  - `/realtime`: 실시간 데이터 라우트
  - `/min-bpm`: 최소 심박수 라우트
- `let addr = SocketAddr::from(([0, 0, 0, 0], 13389));`: 서버가 바인딩할 소켓 주소를 설저 
- `println!("Listening on {}", addr);`: 서버가 리스닝 중인 주소를 출력
- `if let Err(err) = axum::Server::bind(&addr) ...`: 서버를 시작하고, 에러가 발생하면 에러 메시지를 출력
