<<<<<<< HEAD
mod db; // 데이터베이스 모듈
mod routes; // 라우트 모듈

use axum::Router; // 라우터 생성 모듈
use db::client::post_init_db; // 데이터베이스 초기화 함수
use db::client::oracle_init_db; //오라클데이터베이 초기화 함수
use db::schema::create_table_if_not_exists; // 테이블 생성 함수
use dotenv::dotenv; // .env 파일을 로드하는 모듈
use std::env; // 환경 변수 모듈
use std::net::SocketAddr; // 소켓 주소 모듈
use std::sync::Arc;
use tracing_subscriber; // 로그 서브스크라이버 모듈 // 원자적 참조 카운터 모듈
=======
mod db; //데이터베이스 관련 기능 포함 모듈
mod routes;//HTTP 경로(route) 관련 기능 포함 모듈
//필요한 라이브러리와 모듈 가져옴
use axum::Router; //Axum의 Router를 사용
use db::client::init_db;//데이터베이스 초기화 함수
use db::schema::create_table_if_not_exists; //테이블 생성함수
use dotenv::dotenv; //dotenv사용하여 .env파일 환경 변수 불러옴
use std::env; // 표준 라이브러리 : 환경 변수 
use std::net::SocketAddr; //표준 라이브러리 : 소켓 주소
use std::sync::Arc;//여러 스레드에서 안전하게 공유할 수 있도록 함 : 포인터 타입
use tokio::time::{sleep, Duration};//비동기 타이머와 시간(time)관련 기능
use tracing_subscriber;//로그 성정 라이브러리
>>>>>>> origin/server_v2

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

<<<<<<< HEAD
    let client = Arc::new(
        post_init_db(&database_url)
            .await
            .expect("Failed to initialize database"),
    ); // 데이터베이스 초기화
=======
    // 컨테이너 PostgreSQL server 시작할 때 까지 -> await..
    let client = loop {
        //데이터베이스 초기화 시도
        match init_db(&database_url).await {
            //성공하면 클라이언트 반환
            Ok(client) => break Arc::new(client),
            //실패시 오류 메시지 출력 : 5초 후에 재시도
            Err(err) => {
                println!("데이터베이스 연결 실패: {:?}", err);
                println!("5초 안에 다시 시도 중...");
                sleep(Duration::from_secs(5)).await;
            }
        }
    };
    //데이터 베이스 연결 성공 메시지 출력
    println!("데이터베이스 연결됨");
>>>>>>> origin/server_v2

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
