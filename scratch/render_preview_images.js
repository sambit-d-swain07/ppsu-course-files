const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const msedgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const htmlPath = path.join(__dirname, 'server_test.html');

// Cover page screenshot
const coverPng = path.join(__dirname, 'cover_page_preview.png');
execSync(`"${msedgePath}" --headless --window-size=1000,1300 --screenshot="${coverPng}" "${htmlPath}"`);
console.log('Cover page screenshot saved:', coverPng, fs.statSync(coverPng).size, 'bytes');
