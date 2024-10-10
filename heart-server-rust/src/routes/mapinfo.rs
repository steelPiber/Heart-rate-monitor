use axum::{
    extract::{Json, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post, delete, put},
    Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio_postgres::Client as PgClient;
use tracing::info;

// 폴리곤 데이터를 저장하기 위한 구조체
#[derive(Deserialize, Serialize)]
struct MapPolygonData {
    email: String,                  // 사용자 이메일
    title: Option<String>,          // 폴리곤 제목
    coordinates: Option<String>,    // 폴리곤 좌표 (JSON 형식으로 저장)
    new_title: Option<String>,      // 수정할 새로운 폴리곤 제목 (PUT 요청시 사용)
}

// 폴리곤 데이터를 위한 라우트를 생성하는 함수
pub fn create_polygon_routes(client: Arc<PgClient>) -> Router {
    let client_clone_for_post = client.clone();
    let client_clone_for_get = client.clone();
    let client_clone_for_delete = client.clone();
    let client_clone_for_put = client.clone();

    Router::new()
        .route(
            "/",
            post(move |Json(payload): Json<MapPolygonData>| {
                let client = client_clone_for_post.clone();
                async move {
                    // 폴리곤 데이터를 저장하는 함수 호출
                    match insert_polygon_data(payload, &client).await {
                        Ok(_) => {
                            info!("Polygon data inserted successfully");
                            (StatusCode::CREATED, Json(serde_json::json!({"message": "Polygon data saved successfully"}))).into_response()
                        }
                        Err(err) => {
                            info!("Failed to insert polygon data: {:?}", err);
                            (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "Failed to insert polygon data"}))).into_response()
                        }
                    }
                }
            }),
        )
        .route(
            "/",
            get(move |Query(params): Query<MapPolygonData>| {
                let client = client_clone_for_get.clone();
                async move {
                    match get_polygon_data(&params.email, &client).await {
                        Ok(Some(polygons)) => {
                            info!("Polygon data retrieved successfully for email: {}", params.email);
                            (StatusCode::OK, Json(polygons)).into_response()
                        }
                        Ok(None) => {
                            info!("No polygon data found for email: {}", params.email);
                            (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "No polygon data found"}))).into_response()
                        }
                        Err(err) => {
                            info!("Failed to retrieve polygon data: {:?}", err);
                            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to retrieve polygon data"}))).into_response()
                        }
                    }
                }
            }),
        )
        .route(
            "/",
            delete(move |Json(payload): Json<MapPolygonData>| {
                let client = client_clone_for_delete.clone();
                async move {
                    match delete_polygon_data(&payload.email, &payload.title.as_ref().unwrap(), &client).await {
                        Ok(_) => {
                            info!("Polygon data deleted successfully for email: {} and title: {}", payload.email, payload.title.as_ref().unwrap());
                            (StatusCode::OK, Json(serde_json::json!({"message": "Polygon data deleted successfully"}))).into_response()
                        }
                        Err(err) => {
                            info!("Failed to delete polygon data: {:?}", err);
                            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to delete polygon data"}))).into_response()
                        }
                    }
                }
            }),
        )
        .route(
            "/",
            put(move |Json(payload): Json<MapPolygonData>| {
                let client = client_clone_for_put.clone();
                async move {
                    match update_polygon_data(&payload.email, &payload.title.as_ref().unwrap(), &payload.new_title, &payload.coordinates, &client).await {
                        Ok(_) => {
                            info!("Polygon data updated successfully for email: {} and title: {}", payload.email, payload.title.as_ref().unwrap());
                            (StatusCode::OK, Json(serde_json::json!({"message": "Polygon data updated successfully"}))).into_response()
                        }
                        Err(err) => {
                            info!("Failed to update polygon data: {:?}", err);
                            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to update polygon data"}))).into_response()
                        }
                    }
                }
            }),
        )
}

// 데이터베이스에 폴리곤 데이터를 삽입하는 함수
async fn insert_polygon_data(
    polygon_data: MapPolygonData,
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // 동일한 제목의 폴리곤이 있는지 확인
    let check_query = "SELECT COUNT(*) FROM polygon_data WHERE email = $1 AND title = $2";
    let existing_count: i64 = client
        .query_one(check_query, &[&polygon_data.email, &polygon_data.title])
        .await?
        .get(0);

    if existing_count > 0 {
        // 동일한 제목이 존재하는 경우, 삽입하지 않음
        return Err("Polygon with the same title already exists".into());
    }

    let query = "INSERT INTO polygon_data (email, title, coordinates) VALUES ($1, $2, $3)";
    client
        .execute(
            query,
            &[&polygon_data.email, &polygon_data.title, &polygon_data.coordinates],
        )
        .await?;
    Ok(())
}

// 데이터베이스에서 폴리곤 데이터를 가져오는 함수
async fn get_polygon_data(
    email: &str,
    client: &PgClient,
) -> Result<Option<Vec<MapPolygonData>>, Box<dyn std::error::Error + Send + Sync>> {
    let query = "SELECT email, title, coordinates FROM polygon_data WHERE email = $1";
    let rows = client.query(query, &[&email]).await?;

    if rows.is_empty() {
        return Ok(None);
    }

    let polygons = rows
        .into_iter()
        .map(|row| MapPolygonData {
            email: row.get("email"),
            title: row.get("title"),
            coordinates: row.get("coordinates"),
            new_title: None,
        })
        .collect();

    Ok(Some(polygons))
}

// 데이터베이스에서 폴리곤 데이터를 삭제하는 함수
async fn delete_polygon_data(
    email: &str,
    title: &str,
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let query = "DELETE FROM polygon_data WHERE email = $1 AND title = $2";
    client.execute(query, &[&email, &title]).await?;
    Ok(())
}

// 데이터베이스에서 폴리곤 데이터를 수정하는 함수
async fn update_polygon_data(
    email: &str,
    title: &str,
    new_title: &Option<String>,
    coordinates: &Option<String>,
    client: &PgClient,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    if let Some(ref new_title) = new_title {
        // 동일한 제목의 폴리곤이 있는지 확인 (새로운 제목이 존재할 경우)
        let check_query = "SELECT COUNT(*) FROM polygon_data WHERE email = $1 AND title = $2";
        let existing_count: i64 = client
            .query_one(check_query, &[&email, &new_title])
            .await?
            .get(0);

        if existing_count > 0 {
            // 동일한 제목이 존재하는 경우, 수정하지 않음
            return Err("Polygon with the same new title already exists".into());
        }
    }

    let query = "UPDATE polygon_data SET title = COALESCE($1, title), coordinates = COALESCE($2, coordinates) WHERE email = $3 AND title = $4";
    client.execute(query, &[new_title, coordinates, &email, &title]).await?;
    Ok(())
}
