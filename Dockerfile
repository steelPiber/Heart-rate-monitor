# Rust 이미지 사용
FROM rust:latest

# 작업 디렉터리 설정
WORKDIR /usr/src/app

# 종속성 파일 복사
COPY Cargo.toml Cargo.lock ./

# 소스 파일 복사 전 종속성만 먼저 빌드 (캐싱을 활용하여 빌드 속도 향상)
RUN mkdir src
RUN echo "fn main() {}" > src/main.rs
RUN cargo build --release

# 실제 소스 파일 복사
COPY src ./src

# 애플리케이션 빌드
RUN cargo build --release

# 포트 설정
EXPOSE 13389

# 컨테이너 시작 시 실행할 명령
CMD ["./target/release/rs-hr"]

