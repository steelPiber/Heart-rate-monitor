mod db; // 데이터베이스 모듈
mod routes; // 라우트 모듈

use axum::Router; // 라우터 생성 모듈
use db::client::post_init_db; // 데이터베이스 초기화 함수
//use db::client::oracle_init_db; //오라클데이터베이 초기화 함수
use db::schema::create_table_if_not_exists; // 테이블 생성 함수
use dotenv::dotenv; // .env 파일을 로드하는 모듈
use std::env; // 환경 변수 모듈
use std::net::SocketAddr; // 소켓 주소 모듈
use std::sync::Arc;
use tracing_subscriber; // 로그 서브스크라이버 모듈 // 원자적 참조 카운터 모듈

/*Tokio 런타임에서 실행되는 비동기 메인 함수*/
#[tokio::main]
async fn main() {
    //프로그램 시작을 알리는 메시지 출력
    println!("심박수 웹서버 v2_01...");

    //.env 파일을 불러와 환경변수 설정
    dotenv().ok();
    //로그 출력을 초기화
    tracing_subscriber::fmt::init();

    //DATABASE_URL 환경 변수를 불러오거나 기본 값을 사용
    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://piber:wjsansrk@postgres/dbsafebpm".to_string());  
    //DATABASE_URL 출력
    println!("Database URL: {}", database_url);

    let client = Arc::new(
        post_init_db(&database_url)
            .await
            .expect("Failed to initialize database"),
    ); // 데이터베이스 초기화

    //테이블이 존재하지 않으면 생성
    create_table_if_not_exists(&client)
        .await
        .expect("Failed to create table");
    //테이블 생성 확인 메시지 출력
    println!("Table checked/created");
    //여러 가지 경로를 설정하여 라우터 구축
    let app = Router::new()
        .nest("/data", routes::data::create_routes(client.clone()))
        .nest("/recent", routes::recent::create_routes(client.clone()))
        .nest("/current-time", routes::time::create_routes())
        .nest("/realtime", routes::real_hrt::create_routes(client.clone()))
        .nest("/min-bpm", routes::min_hrt::create_routes(client.clone()));
    //서버가 바인딩할 소켓 주소를 설정
    let addr = SocketAddr::from(([0, 0, 0, 0], 13389));
    //서버를 시작하고 클라이언트 요청을 수신 
    println!("Listening on {}", addr);
    if let Err(err) = axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
    {
        //서버 오류가 발생하면 오류 메시지를 출력
        eprintln!("Server error: {}", err);
    }
}
