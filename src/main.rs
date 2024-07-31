mod db; // 데이터베이스 모듈
mod routes; // 라우트 모듈

use axum::Router; // 라우터 생성 모듈
use db::client::init_db; // 데이터베이스 초기화 함수
use db::schema::create_table_if_not_exists; // 테이블 생성 함수
use dotenv::dotenv; // .env 파일을 로드하는 모듈
use std::env; // 환경 변수 모듈
use std::net::SocketAddr; // 소켓 주소 모듈
use std::sync::Arc;
use tracing_subscriber; // 로그 서브스크라이버 모듈 // 원자적 참조 카운터 모듈

#[tokio::main]
async fn main() {
    println!("Starting Rust application...");

    dotenv().ok(); //.env 파일 로드
    tracing_subscriber::fmt::init(); //로그 초기화

    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string()); //데이터베이스 초기화

    let client = Arc::new(
        init_db(&database_url)
            .await
            .expect("Failed to initialize database"),
    ); // 데이터베이스 초기화

    // 테이블이 없으면 생성합니다.
    create_table_if_not_exists(&client)
        .await
        .expect("Failed to create table");

    let app = Router::new()
        .nest("/data", routes::data::create_routes(client.clone())) //데이터 route add
        .nest("/recent", routes::recent::create_routes(client.clone())) //최근 데이터 route add
        .nest("/current-time", routes::time::create_routes()) //현재 시간 route add
        .nest("/realtime", routes::real_hrt::create_routes(client.clone())) //실시간 데이터 route add
        .nest("/min-bpm", routes::min_hrt::create_routes(client.clone())); //1분 평균 데이터 route add

    let addr = SocketAddr::from(([0, 0, 0, 0], 13389)); //서버 주소 설정
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
    {
        eprintln!("Server error: {}", err); //서버 오류 로그 출력
    }
}
