use axum::{extract::Json, http::StatusCode, response::IntoResponse, routing::post, Router};
use oracle::Connection as OracleConnection;
use serde::Deserialize;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio_postgres::Client as PgClient;

#[derive(Deserialize, Debug)]
struct Data {
    bpm: String, // 심박수 값은 문자열로 받아옵니다.
    email: String,
    tag: String,
    timestamp: String,
    latitude: Option<String>,
    longitude: Option<String>,
}

async fn handle_post(
    Json(payload): Json<Data>,
    pg_client: Arc<PgClient>,
    oracle_conn: Arc<Mutex<OracleConnection>>,
) -> impl IntoResponse {
    // 요청 본문을 출력하여 수신된 데이터 확인
    println!("Received request body: {:?}", payload);

    // 심박수 값을 문자열에서 i32로 변환합니다.
    let bpm = match payload.bpm.parse::<i32>() {
        Ok(bpm) => bpm,
        Err(_) => {
            println!("Invalid BPM value: {:?}", payload.bpm);
            return (StatusCode::BAD_REQUEST, "Invalid BPM value").into_response();
        }
    };

    // 이메일 전체를 그대로 사용합니다.
    let email = &payload.email;
    let latitude = payload.latitude.as_deref().unwrap_or("none");
    let longitude = payload.longitude.as_deref().unwrap_or("none");

    // 위도와 경도가 "none"이 아닌 경우 location_bpm 테이블에 삽입합니다.
    if latitude != "none" && longitude != "none" {
        let latitude_numeric = match latitude.parse::<String>() {
            Ok(lat) => lat,
            Err(_) => {
                println!("Invalid latitude value: {:?}", latitude);
                return (StatusCode::BAD_REQUEST, "Invalid latitude value").into_response();
            }
        };
        let longitude_numeric = match longitude.parse::<String>() {
            Ok(lon) => lon,
            Err(_) => {
                println!("Invalid longitude value: {:?}", longitude);
                return (StatusCode::BAD_REQUEST, "Invalid longitude value").into_response();
            }
        };

        if let Err(err) = insert_location_bpm_data_pg(
            &pg_client,
            bpm,
            email,
            &payload.tag,
            &payload.timestamp,
            &latitude_numeric,
            &longitude_numeric,
        )
        .await
        {
            println!("Error inserting BPM data into PostgreSQL: {:?}", err);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error inserting data into PostgreSQL",
            )
                .into_response();
        }
    } else {
        // 위도와 경도가 없을 경우 bpmdata 테이블에 삽입합니다.
        if let Err(err) =
            insert_bpm_data_pg(&pg_client, bpm, email, &payload.tag, &payload.timestamp).await
        {
            println!("Error inserting BPM data into PostgreSQL: {:?}", err);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error inserting data into PostgreSQL",
            )
                .into_response();
        }
    }

    // Oracle 데이터베이스에 BPM 데이터를 삽입합니다.
    if let Err(err) = {
        let mut oracle_conn_guard = oracle_conn.lock().await;
        insert_bpm_data_oracle(&mut *oracle_conn_guard, bpm, email, &payload.tag).await
    } {
        println!("Error inserting BPM data into Oracle: {:?}", err);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Error inserting data into Oracle",
        )
            .into_response();
    }

    // 성공적으로 PostgreSQL과 Oracle에 데이터를 삽입한 경우 출력합니다.
    println!("Successfully inserted BPM data into both PostgreSQL and Oracle");
    (StatusCode::OK, "Request received").into_response()
}

// PostgreSQL에 location_bpm 데이터를 삽입하는 비동기 함수
async fn insert_location_bpm_data_pg(
    client: &PgClient,
    bpm: i32,
    email: &str,
    tag: &str,
    timestamp: &str,
    latitude: &str,
    longitude: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let insert_sql = "INSERT INTO location_bpm (BPM, EMAIL, TAG, BPM_TIME, LATITUDE, LONGITUDE) VALUES ($1, $2, $3, $4, $5, $6)";
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,
        Err(_) => chrono::Utc::now().naive_utc(),
    };
    client
        .execute(
            insert_sql,
            &[&bpm, &email, &tag, &time, &latitude, &longitude],
        )
        .await?;
    Ok(())
}

// PostgreSQL에 bpmdata 데이터를 삽입하는 비동기 함수
async fn insert_bpm_data_pg(
    client: &PgClient,
    bpm: i32,
    email: &str,
    tag: &str,
    timestamp: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let insert_sql = "INSERT INTO bpmdata (BPM, EMAIL, TAG, TIME) VALUES ($1, $2, $3, $4)";
    let time = match chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%dT%H:%M:%S") {
        Ok(t) => t,
        Err(_) => chrono::Utc::now().naive_utc(),
    };
    client
        .execute(insert_sql, &[&bpm, &email, &tag, &time])
        .await?;
    Ok(())
}

// Oracle에 BPM 데이터를 삽입하는 비동기 함수
async fn insert_bpm_data_oracle(
    conn: &mut OracleConnection,
    bpm: i32,
    email: &str,
    tag: &str,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let idx_query = "SELECT BPM_SEQ.NEXTVAL FROM DUAL";
    let idx: i32 = conn.query_row_as(idx_query, &[])?;

    let insert_query = "INSERT INTO BPMDATA (IDX, BPM, EMAIL, TAG) VALUES (:1, :2, :3, :4)";
    conn.execute(insert_query, &[&idx, &bpm, &email, &tag])?;
    conn.commit()?;
    Ok(())
}

// 라우터를 생성하는 함수
pub fn create_routes(
    pg_client: Arc<PgClient>,
    oracle_conn: Arc<Mutex<OracleConnection>>,
) -> Router {
    Router::new().route(
        "/",
        post(move |json| handle_post(json, pg_client.clone(), oracle_conn.clone())),
    )
}

// Oracle 데이터베이스에 연결하는 함수
pub async fn oracle_connect_db(
    user: &str,
    pass: &str,
    connect_str: &str,
) -> Result<OracleConnection, oracle::Error> {
    OracleConnection::connect(user, pass, connect_str)
}
