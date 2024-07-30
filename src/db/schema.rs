use tokio_postgres::Client;

pub async fn create_table_if_not_exists(client: &Client) -> Result<(), tokio_postgres::Error> {
    let create_table_sql = "
        CREATE TABLE IF NOT EXISTS bpmdata (
            IDX SERIAL PRIMARY KEY,
            BPM VARCHAR(255),
            EMAIL VARCHAR(255),
            TAG VARCHAR(255),
            TIME TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    ";
    client.execute(create_table_sql, &[]).await?;
    Ok(())
}

