const express = require('express');
const { PythonShell } = require('python-shell');
const router = express.Router();

router.get('/HRV', (req, res) => {
    PythonShell.runString(`
        import cx_Oracle
        import pandas as pd
        import numpy as np
        from sqlalchemy import create_engine
        from hrv.classical import time_domain

        # 오라클 데이터베이스 연결 설정
        dsn = cx_Oracle.makedsn('localhost', '1521', service_name='ORA21APEX')
        engine = create_engine(f'oracle+cx_oracle://piber:wjsansrk@{dsn}')

        # DB에서 최근 24시간 동안의 심박수 데이터 가져오기
        def fetch_heart_rate_data():
            query = \"""
            SELECT idx, bpm, time, email, tag
            FROM bpmdata
            WHERE time > (SELECT max(time) - INTERVAL '24' HOUR FROM bpmdata) AND email='pyh5523' AND bpm <> 0 
            ORDER BY time
            \"""
            df = pd.read_sql_query(query, con=engine)
            df.columns = df.columns.str.upper()
            return df

        # RR 간격 계산
        def calculate_rr_intervals(data):
            rr_intervals = 60.0 / data['BPM']  # 심박수(BPM)를 RR 간격(초)으로 변환
            rr_intervals = rr_intervals.values * 1000  # RR 간격을 ms 단위로 변환
            return rr_intervals

        # HRV 분석을 통해 부정맥 탐지
        def detect_arrhythmia_with_hrv(rr_intervals, rmssd_threshold, sdnn_threshold):
            if len(rr_intervals) < 2:
                return False, None, None
            
            time_domain_features = time_domain(rr_intervals)
            
            rmssd = time_domain_features['rmssd']
            sdnn = time_domain_features['sdnn']
            
            print(f\"Calculated RMSSD: {rmssd}, Threshold: {rmssd_threshold}\")
            print(f\"Calculated SDNN: {sdnn}, Threshold: {sdnn_threshold}\")
            
            is_arrhythmia = rmssd > rmssd_threshold or sdnn < sdnn_threshold
            return is_arrhythmia, rmssd, sdnn

        # 비정상 심박수 빈도 및 지속 시간 분석
        def analyze_abnormal_hr(data, lower_threshold, upper_threshold):
            abnormal_periods = data[(data['BPM'] < lower_threshold) | (data['BPM'] > upper_threshold)].copy()
            abnormal_periods['DURATION'] = abnormal_periods['TIME'].diff().dt.total_seconds().fillna(0)
            total_abnormal_time = abnormal_periods['DURATION'].sum()
            num_abnormal_periods = len(abnormal_periods)
            
            return num_abnormal_periods, total_abnormal_time, abnormal_periods

        # 비정상 심박수 패턴 분석
        def evaluate_abnormal_patterns(abnormal_periods):
            # 비정상 심박수 패턴이 일정한지 확인
            if len(abnormal_periods) < 2:
                return False
            
            # 패턴 분석 로직 (예: 급격한 변동이 많은지 여부)
            differences = abnormal_periods['BPM'].diff().abs()
            threshold = 20  # BPM 변화가 이 값을 넘으면 비정상 패턴으로 간주
            abnormal_pattern = differences > threshold
            
            return abnormal_pattern.any()

        # 심박수 데이터 가져오기
        heart_rate_data = fetch_heart_rate_data()

        # 데이터 수 확인
        if len(heart_rate_data) < 5000:
            print(\"Your heart rate is not high enough to detect an arrhythmia.\")
        else:
            # 상태별 RR 간격 계산 및 임계값 설정
            if 'TAG' in heart_rate_data.columns:
                heart_rate_data['TAG'] = heart_rate_data['TAG'].replace({'NORMAL': 'REST'})
                tags = ['REST', 'EXERCISE', 'ACTIVE']

                # 임계값을 신뢰성 있는 논문에 근거하여 조정
                rmssd_thresholds = {'REST': 42, 'EXERCISE': 19, 'ACTIVE': 30}
                sdnn_thresholds = {'REST': 50, 'EXERCISE': 30, 'ACTIVE': 40}

                # 심박수 범위를 각 상태별로 설정
                bpm_thresholds = {
                    'REST': (60, 100),
                    'EXERCISE': (90, 170),
                    'ACTIVE': (70, 130)
                }
                
                for tag in tags:
                    tag_data = heart_rate_data[heart_rate_data['TAG'].str.upper() == tag].copy()
                    if len(tag_data) > 0:
                        rr_intervals = calculate_rr_intervals(tag_data)
                        rmssd_threshold = rmssd_thresholds.get(tag, 30)
                        sdnn_threshold = sdnn_thresholds.get(tag, 50)
                        arrhythmia, rmssd, sdnn = detect_arrhythmia_with_hrv(rr_intervals, rmssd_threshold, sdnn_threshold)

                        lower_bpm, upper_bpm = bpm_thresholds.get(tag, (60, 100))
                        abnormal_periods, total_abnormal_time, abnormal_data = analyze_abnormal_hr(tag_data, lower_bpm, upper_bpm)
                        
                        abnormal_patterns = evaluate_abnormal_patterns(abnormal_data)
                        
                        print(f\"Tag: {tag}\")
                        print(f\"Arrhythmia detected: {arrhythmia}\")
                        print(f\"RMSSD: {rmssd}, SDNN: {sdnn}\")
                        print(f\"Total abnormal periods: {abnormal_periods}\")
                        print(f\"Total abnormal time (seconds): {total_abnormal_time}\")
                        print(f\"Abnormal patterns detected: {abnormal_patterns}\")
                        
                        # HRV 분석 결과, 비정상 심박수 분석 결과 및 비정상 심박수 패턴 분석을 모두 고려하여 부정맥 여부 판단
                        is_arrhythmia_detected = arrhythmia and (abnormal_periods > 10 and total_abnormal_time > 600) and abnormal_patterns
                        
                        if is_arrhythmia_detected:
                            print(f\"Final decision: Arrhythmia detected for tag {tag}.")
                        else:
                            print(f\"Final decision: No arrhythmia detected for tag {tag}.")
                    else:
                        print(f\"No data available for tag: {tag}\")
            else:
                print("Error: 'TAG' column not found in the data.")
    `, null, function (err, result) {
        if (err) {
            res.status(500).send('Internal server error');
            return;
        }

        // Python 코드 실행 결과를 HTTP 응답으로 전송
        res.send('Python result: ' + result.toString());
    });
});

module.exports = router;
