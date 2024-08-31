use oracle::{Connection, Error}; // Oracle DB에 연결하기 위한 라이브러리
use std::io::{self, Write}; // 입력 및 출력 처리를 위한 표준 라이브러리

fn main() {
    loop {
        // 사용자 입력 받기
        let username = read_input("사용자 이름: ");
        let password = read_input("비밀번호: ");
        let connect_string = read_input("서버 주소 (예: ip:port/dbname): ");

        // DB 연결 시도
        match connect_to_db(&username, &password, &connect_string) {
            Ok(conn) => {
                // DB 연결 성공 메시지
                println!("Successfully connected to Oracle DB");

                // BPMDATA 테이블의 열 수 출력
                match get_column_count(&conn, "BPMDATA") {
                    Ok(column_count) => {
                        // 열 수 출력
                        println!("테이블 'BPMDATA'에는 {}개의 열이 있습니다.", column_count);

                        //BPMDATA 테이블 데이터 삽입
                        match insert_bpmdata(&conn) {
                            Ok(_) => {
                                println!("테이블 'BPMDATA'에 값이 삽입 되었습니다.");
                                // 커밋
                                match conn.commit() {
                                    Ok(_) => println!("데이터가 커밋되었습니다."),
                                    Err(err) => println!("커밋 중 오류 발생: {}", err),
                                }
                            }
                            Err(err) => println!("테이블 'BPMDATA'에 값 삽입 중 에러발생: {}", err),
                        }
                        // BPMDATA 테이블의 행 수 출력
                        match get_row_count(&conn, "BPMDATA") {
                            Ok(row_count) => {
                                println!("테이블 'BPMDATA'에는 {}개의 행이 있습니다.", row_count)
                            }
                            Err(err) => println!("Error getting row count: {}", err), // 행 수 조회 중 오류 발생 시 메시지 출력
                        }
                    }
                    Err(err) => println!("Error getting column count: {}", err), // 열 수 조회 중 오류 발생 시 메시지 출력
                }

                // 프로그램 종료
                break;
            }
            Err(err) => {
                // DB 연결 실패 메시지
                println!("Error connecting to Oracle DB: {}", err);
                let choice = read_input("Try again? (y/n): ");
                if choice.to_lowercase() != "y" {
                    println!("Exiting."); // 사용자가 재시도를 원하지 않으면 프로그램 종료
                    break;
                }
            }
        }
    }
}

// 사용자 입력 받기 함수
fn read_input(prompt: &str) -> String {
    let mut input = String::new(); // 입력값을 저장할 문자열
    print!("{}", prompt); // 프롬프트 메시지 출력
    io::stdout().flush().unwrap(); // 출력 버퍼 비우기
    io::stdin().read_line(&mut input).unwrap(); // 사용자로부터 입력 받기
    input.trim().to_string() // 입력값의 앞뒤 공백을 제거하고 문자열로 반환
}

// DB 연결 함수
fn connect_to_db(
    username: &str,
    password: &str,
    connect_string: &str,
) -> Result<Connection, Error> {
    Connection::connect(username, password, connect_string) // 사용자명, 비밀번호, 연결 문자열을 사용하여 DB에 연결
}

// 테이블의 열 수 조회 함수
fn get_column_count(conn: &Connection, table_name: &str) -> Result<usize, Error> {
    let query = "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE TABLE_NAME = UPPER(:1)"; // 열 수를 조회하는 SQL 쿼리
    let row = conn.query_row_as::<usize>(query, &[&table_name.to_uppercase()])?; // 쿼리를 실행하고 결과를 usize로 변환
    Ok(row) // 열 수 반환
}

// 테이블의 행 수 조회 함수
fn get_row_count(conn: &Connection, table_name: &str) -> Result<usize, Error> {
    let query = format!("SELECT COUNT(*) FROM {}", table_name); // 행 수를 조회하는 SQL 쿼리
    let row = conn.query_row_as::<usize>(&query, &[])?; // 쿼리를 실행하고 결과를 usize로 변환
    Ok(row) // 행 수 반환
}

//BPM 데이터 삽입 함수
fn insert_bpmdata(conn: &Connection) -> Result<(), Error> {
    //사용자로부터 BPM 데이터 입력 받기
    let bpm: i32 = read_input("BPM: ").parse().unwrap();
    let email = read_input("Email: ");
    let tag = read_input("Tag: ");

    //시퀀스를 사용하여 IDX값 생성
    let idx_query = "SELECT BPM_SEQ.NEXTVAL FROM DUAL";
    let idx: i32 = conn.query_row_as(idx_query, &[])?;

    //데이터 삽입 쿼리
    let insert_query = "INSERT INTO BPMDATA (IDX, BPM, EMAIL, TAG) VALUES (:1, :2, :3, :4)";
    conn.execute(insert_query, &[&idx, &bpm, &email, &tag])?;
    Ok(())
}
