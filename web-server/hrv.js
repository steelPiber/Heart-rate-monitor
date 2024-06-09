const express = require('express');
const oracledb = require('oracledb');
const pandas = require('pandas-js');
const { timeDomain } = require('hrv-analysis');
const moment = require('moment');

const router = express.Router();

// 오라클 데이터베이스 연결 설정
const dsn = {
    user: "piber",
    password: "wjsansrk",
    connectString: "localhost:1521/ORA21APEX"
};

// DB에서 최근 24시간 동안의 심박수 데이터 가져오기
async function fetchHeartRateData() {
    let connection;

    try {
        connection = await oracledb.getConnection(dsn);

        const result = await connection.execute(
            `SELECT idx, bpm, time, email, tag
            FROM bpmdata
            WHERE time > (SELECT max(time) - INTERVAL '24' HOUR FROM bpmdata) AND email='pyh5523' AND bpm <> 0 
            ORDER BY time`
        );

        const df = new pandas.DataFrame(result.rows, result.metaData.map(meta => meta.name.toUpperCase()));
        return df;
    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

// RR 간격 계산
function calculateRRIntervals(data) {
    const rrIntervals = data.get('BPM').toArray().map(bpm => (60.0 / bpm) * 1000);
    return rrIntervals;
}

// HRV 분석을 통해 부정맥 탐지
function detectArrhythmiaWithHRV(rrIntervals, rmssdThreshold, sdnnThreshold) {
    if (rrIntervals.length < 2) {
        return [false, null, null];
    }

    const timeDomainFeatures = timeDomain(rrIntervals);
    const rmssd = timeDomainFeatures.rmssd;
    const sdnn = timeDomainFeatures.sdnn;

    console.log(`Calculated RMSSD: ${rmssd}, Threshold: ${rmssdThreshold}`);
    console.log(`Calculated SDNN: ${sdnn}, Threshold: ${sdnnThreshold}`);

    const isArrhythmia = rmssd > rmssdThreshold || sdnn < sdnnThreshold;
    return [isArrhythmia, rmssd, sdnn];
}

// 비정상 심박수 빈도 및 지속 시간 분석
function analyzeAbnormalHR(data, lowerThreshold, upperThreshold) {
    const abnormalPeriods = data.filter(row => row.get('BPM') < lowerThreshold || row.get('BPM') > upperThreshold);
    let totalAbnormalTime = 0;
    let numAbnormalPeriods = abnormalPeriods.length;

    if (numAbnormalPeriods > 0) {
        for (let i = 1; i < numAbnormalPeriods; i++) {
            const duration = moment(abnormalPeriods.at(i).get('TIME')).diff(moment(abnormalPeriods.at(i - 1).get('TIME')), 'seconds');
            totalAbnormalTime += duration;
        }
    }

    return [numAbnormalPeriods, totalAbnormalTime, abnormalPeriods];
}

// 비정상 심박수 패턴 분석
function evaluateAbnormalPatterns(abnormalPeriods) {
    if (abnormalPeriods.length < 2) {
        return false;
    }

    const differences = abnormalPeriods.map((row, index) => {
        if (index === 0) return 0;
        return Math.abs(row.get('BPM') - abnormalPeriods.at(index - 1).get('BPM'));
    });

    const threshold = 20;  // BPM 변화가 이 값을 넘으면 비정상 패턴으로 간주
    const abnormalPattern = differences.some(diff => diff > threshold);

    return abnormalPattern;
}

// 메인 엔드포인트
app.get('/analyze-heart-rate', async (req, res) => {
    const heartRateData = await fetchHeartRateData();

    if (heartRateData.length < 5000) {
        res.json({ message: "Your heart rate is not high enough to detect an arrhythmia." });
        return;
    }

    if (heartRateData.columns.includes('TAG')) {
        const tags = ['REST', 'EXERCISE', 'ACTIVE'];
        const rmssdThresholds = { 'REST': 42, 'EXERCISE': 19, 'ACTIVE': 30 };
        const sdnnThresholds = { 'REST': 50, 'EXERCISE': 30, 'ACTIVE': 40 };
        const bpmThresholds = {
            'REST': [60, 100],
            'EXERCISE': [90, 170],
            'ACTIVE': [70, 130]
        };

        const results = [];

        for (const tag of tags) {
            const tagData = heartRateData.filter(row => row.get('TAG').toUpperCase() === tag);

            if (tagData.length > 0) {
                const rrIntervals = calculateRRIntervals(tagData);
                const rmssdThreshold = rmssdThresholds[tag] || 30;
                const sdnnThreshold = sdnnThresholds[tag] || 50;
                const [arrhythmia, rmssd, sdnn] = detectArrhythmiaWithHRV(rrIntervals, rmssdThreshold, sdnnThreshold);

                const [lowerBPM, upperBPM] = bpmThresholds[tag] || [60, 100];
                const [numAbnormalPeriods, totalAbnormalTime, abnormalData] = analyzeAbnormalHR(tagData, lowerBPM, upperBPM);

                const abnormalPatterns = evaluateAbnormalPatterns(abnormalData);

                const isArrhythmiaDetected = arrhythmia && (numAbnormalPeriods > 10 && totalAbnormalTime > 600) && abnormalPatterns;

                results.push({
                    tag,
                    arrhythmia,
                    rmssd,
                    sdnn,
                    numAbnormalPeriods,
                    totalAbnormalTime,
                    abnormalPatterns,
                    isArrhythmiaDetected
                });
            } else {
                results.push({
                    tag,
                    message: `No data available for tag: ${tag}`
                });
            }
        }

        res.json(results);
    } else {
        res.json({ message: "Error: 'TAG' column not found in the data." });
    }
});

module.exports = router;
