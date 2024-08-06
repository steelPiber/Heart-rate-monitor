use std::io;
use std::time::Duration;
use tokio::time::sleep;
use tokio_postgres::{Client, NoTls};

use oracle::{Connection,Error}; //오라클db 연결및 연결 실패 모듈




/*
데이터베이스 초기화 함수
데이터베이스 URL로 postgresSQL에 연결을 5번 시도
성공 : postgresSQL 클라이언트로 반환
실패 : std::io::Error를 반환
*/
pub async fn post_init_db(database_url: &str) -> Result<Client, io::Error> {
    let mut re_try = 5;

    while re_try > 0 {
        match tokio_postgres::connect(database_url, NoTls).await {
            Ok((client, connection)) => {
                tokio::spawn(async move {
                    if let Err(e) = connection.await {
                        eprintln!("connection error: {}", e);
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
    // 모든 재시도가 실패한 경우 오류 반환
    Err(io::Error::new(
        io::ErrorKind::Other,
        "여러 번 시도한 후 데이터베이스에 연결하지 못함",
    ))
}

/* 
 오라클 데이터베이스 초기화 함수

pub fn oracle_init_db(ora_user:&str,ora_pass:&str, ora_server:&str) -> Result<Connection,Error>{
    let ora_id = "";
    let ora_pass =""; 
    let server_ip_port =  "";
    Connection::connect(ora_id,ora_pass,server_ip_port) 
}

pub fn ora_get_col_count(conn:&Connection, ) -> Result<usize,Error> {
    let count_query = format!("SELECT COUNT(*) FROM BPM WHERE BPM_DATA=UPPER(:1)"); 
    let row = conn.query_row_as::<usize>(&count_query, &[&bpm_data.to_uppercase()])?;
}
*/ 
