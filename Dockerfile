# 베이스 이미지 설정
FROM rust:latest

# 필요한 패키지 설치
RUN apt-get update && apt-get install -y libaio1 unzip wget

# Oracle Instant Client 설치
RUN mkdir -p /opt/oracle
RUN wget https://download.oracle.com/otn_software/linux/instantclient/2115000/instantclient-basic-linux.x64-21.15.0.0.0dbru.zip -O /tmp/instantclient-basic-linux.x64-21.15.0.0.0dbru.zip
RUN unzip /tmp/instantclient-basic-linux.x64-21.15.0.0.0dbru.zip -d /opt/oracle
RUN rm /tmp/instantclient-basic-linux.x64-21.15.0.0.0dbru.zip
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient_21_15

# 프로젝트 디렉토리로 이동
WORKDIR /app

# 소스 파일 복사
COPY . .

# Rust 빌드
RUN cargo build --release

# 실행 명령어 설정
CMD ["./target/release/test"]

