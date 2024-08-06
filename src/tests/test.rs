use oracle::{Connection,Error};
use std::io::{self,Write};
fn main() {
   let mut username = String::new();
   let mut password = String::new();
   let mut table_name = String::new();
   let mut connect_string = String::new();

   loop {
    // 사용 입력받기 
    println!("ora test 0.1 : 오라클 db 입력창");
    
    print!("사용자 이름: "); // 사용자명 입력 
    io::stdout().flush().unwrap(); //출력 버퍼 지우기
    io::stdin().read_line(&mut username).unwrap();
    username = username.trim().to_string();

    print!("비밀번호: ");
    io::stdout().flush().unwrap(); //출력 버퍼 지우기
    io::stdin().read_line(&mut password).unwrap();
    password = password.trim().to_string();

    print!("서버 주소:port");
    io::stdout().flush().unwrap(); //출력 버퍼 지우기
    io::stdin().read_line(&mut connect_string).unwrap();
    connect_string = connect_string.trim().to_string();

    print!("테이블 이름:");
    io::stdout().flush().unwrap(); //출력 버퍼 지우기
    io::stdin().read_line(&mut table_name).unwrap();
    table_name = table_name.trim().to_string();
   
    //db 연결 시도
    match oracle_connect(&username, &password, &connect_string) {
        Ok(conn) => {
            //연결 성공
            println!("오라클DB 연결 성공");
            match get_col_count(&conn, &table_name) {
                Ok(count) => println!("테이블{},열 갯수: {}",table_name, count),//열의 갯수 출력
                Err(err) => println!("열의 갯수 가져오기 실패: {}",err),//열의 갯수 가져오기 실패
            }
            break;
        },
        Err(err) => {
            //연결 실패 시
            println!("에러 연결시 오라클DB :{}",err); //오류 메시지 출력
            println!("Try again? (y/n)"); //다시시도 여부 묻기 
	    let mut choice = String::new(); //사용자의 선택을 저장할 변수 초기화
	    io::stdin().read_line(&mut choice).unwrap(); //선택 입력 받기
	    choice.trim().to_string();//입력값에 공백 제거
	    
                if choice.to_lowercase() != "y" {
                    // 'y'가 아닌 경우 
                     println!("나가는중..."); //종료메시지 출력
                     break;//반복 종료
                }	
            }
        }    
    }
}
    //데이터 베이스 연결 안되면 오류 반환 
    fn oracle_connect(username:&str, password:&str,connect_string:&str) -> Result<Connection, Error>{
        Connection::connect(username, password, connect_string) 
    }
    
    //테이블의 열 수를 반환하는 함수
    fn get_col_count(conn: &Connection, table_name: &str) -> Result<usize, Error>{
        let query = "SELECT COUNT(*) FROM USER_TAB_COLUMNS WHERE = UPPER(:1)"; // 열 수를 세는 쿼리 
        let row =conn.query_row_as::<usize>(query, &[&table_name.to_uppercase()])?;
        Ok(row) //결과 반환
    }
