const express = require('express');
const oracleDB = require('./oracledb.js');
const router = express.Router();
const moment = require('moment');

// HRV 분석 함수들
function calculateRRIntervals(data) {
    return data.map(row => (60.0 / row.BPM) * 1000);
}

function calculateRMSSD(rrIntervals) {
    if (rrIntervals.length < 2) return null;
    let sumSquares = 0;
    for (let i = 1; i < rrIntervals.length; i++) {
        const diff = rrIntervals[i] - rrIntervals[i - 1];
        sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares / (rrIntervals.length - 1));
}

function calculateSDNN(rrIntervals) {
    if (rrIntervals.length < 2) return null;
    const meanRR = rrIntervals.reduce((a, b) => a + b) / rrIntervals.length;
    let sumSquares = 0;
    for (let i = 0; i < rrIntervals.length; i++) {
        const diff = rrIntervals[i] - meanRR;
        sumSquares += diff * diff;
    }
    return Math.sqrt(sumSquares / rrIntervals.length);
}

function detectArrhythmiaWithHRV(rrIntervals, rmssdThreshold, sdnnThreshold) {
    if (rrIntervals.length < 2) return [false, null, null];
    const rmssd = calculateRMSSD(rrIntervals);
    const sdnn = calculateSDNN(rrIntervals);
    console.log(`Calculated RMSSD: ${rmssd}, Threshold: ${rmssdThreshold}`);
    console.log(`Calculated SDNN: ${sdnn}, Threshold: ${sdnnThreshold}`);
    const isArrhythmia = rmssd > rmssdThreshold || sdnn < sdnnThreshold;
    return [isArrhythmia, rmssd, sdnn];
}

function analyzeAbnormalHR(data, lowerThreshold, upperThreshold) {
    const abnormalPeriods = data.filter(row => row.BPM < lowerThreshold || row.BPM > upperThreshold);
    let totalAbnormalTime = 0;
    let numAbnormalPeriods = abnormalPeriods.length;
    if (numAbnormalPeriods > 0) {
        for (let i = 1; i < numAbnormalPeriods; i++) {
            const duration = moment(abnormalPeriods[i].TIME).diff(moment(abnormalPeriods[i - 1].TIME), 'seconds');
            totalAbnormalTime += duration;
        }
    }
    return [numAbnormalPeriods, totalAbnormalTime, abnormalPeriods];
}

function evaluateAbnormalPatterns(abnormalPeriods) {
    if (abnormalPeriods.length < 2) return false;
    const differences = abnormalPeriods.map((row, index) => {
        if (index === 0) return 0;
        return Math.abs(row.BPM - abnormalPeriods[index - 1].BPM);
    });
    const threshold = 20;  // BPM 변화가 이 값을 넘으면 비정상 패턴으로 간주
    return differences.some(diff => diff > threshold);
}

router.get('/analyze-heart-rate', async (req, res) => {
    try {
        const heartRateData = await oracleDB.fetchHeartRateData();
        if (heartRateData.length < 5000) {
            res.json({ message: "Your heart rate is not high enough to detect an arrhythmia." });
            return;
        }
        if (heartRateData.length > 0 && heartRateData[0].hasOwnProperty('TAG')) {
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
                const tagData = heartRateData.filter(row => row.TAG.toUpperCase() === tag);
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
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error." });
    }
});

module.exports = router;
