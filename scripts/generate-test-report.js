#!/usr/bin/env node

/**
 * Script สำหรับสร้าง HTML report จาก Cypress test results
 * รัน: node scripts/generate-test-report.js
 */

const fs = require('fs');
const path = require('path');

// อ่านผลลัพธ์จาก terminal output หรือ JSON
function generateReport() {
    const reportPath = path.join(__dirname, '../cypress/results/results.json');
    const htmlPath = path.join(__dirname, '../cypress/report.html');
    
    let results = {
        summary: {
            tests: 0,
            passed: 0,
            failed: 0,
            pending: 0
        },
        suites: []
    };
    
    // ถ้ามี JSON results ให้อ่าน
    if (fs.existsSync(reportPath)) {
        try {
            const jsonData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            // Process JSON data
            results = processJsonResults(jsonData);
        } catch (err) {
            console.error('Error reading JSON results:', err);
        }
    }
    
    // สร้าง HTML report
    const html = generateHTML(results);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log(`✅ HTML report generated: ${htmlPath}`);
    console.log(`📊 Open in browser: file://${htmlPath}`);
}

function processJsonResults(jsonData) {
    // Process Cypress JSON results format
    const suites = [];
    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let pending = 0;
    
    if (jsonData.tests) {
        jsonData.tests.forEach(test => {
            totalTests++;
            if (test.state === 'passed') passed++;
            else if (test.state === 'failed') failed++;
            else pending++;
        });
    }
    
    return {
        summary: { tests: totalTests, passed, failed, pending },
        suites
    };
}

function generateHTML(results) {
    const { summary, suites } = results;
    
    return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cypress Test Results</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 30px;
        }
        h1 { color: #333; margin-bottom: 10px; font-size: 2.5em; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-card.passed { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
        .stat-card.failed { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); }
        .stat-number { font-size: 3em; font-weight: bold; margin-bottom: 5px; }
        .stat-label { font-size: 1.1em; opacity: 0.9; }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Cypress Test Results</h1>
        <p class="subtitle">ผลการทดสอบระบบจองสนามแบดมินตัน</p>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${summary.tests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card passed">
                <div class="stat-number">${summary.passed}</div>
                <div class="stat-label">Passed</div>
            </div>
            <div class="stat-card failed">
                <div class="stat-number">${summary.failed}</div>
                <div class="stat-label">Failed</div>
            </div>
        </div>
        
        <div class="footer">
            <p>📹 ดูวิดีโอได้ที่: <code>cypress/videos/</code></p>
            <p>📸 ดู screenshots ได้ที่: <code>cypress/screenshots/</code></p>
        </div>
    </div>
</body>
</html>`;
}

// Run
generateReport();

