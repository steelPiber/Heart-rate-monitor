use std::time::Duration;
use tokio::time::sleep;
use tokio_postgres::{Client, Error, NoTls};

//데이터베이스 초기화 함수
pub async fn init_db(database_url: &str) -> Result<Client, Error> {
    let mut re_try = 5; //재시도 횟수

    while re_try > 0 {
        match tokio_postgres::connect(database_url, NoTls).await {
            Ok((client, connection)) => {
                tokio::spawn(async move {
                    if let Err(e) = connection.await {
                        eprintln!("connection error:{}", e);
                    }
                });
                return Ok(client);
            }
            Err(e) => {
                eprintln!("Failed to connect to database: {}", e);
                re_try -= 1;
                sleep(Duration::from_secs(5)).await;
            }
        }
    }
    Err(Error::custom(
        "Failed to connect to database after multiple attempts",
    )) // 재시도 후에도 실패하면 에러 반환
}
