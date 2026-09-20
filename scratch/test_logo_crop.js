const fs = require('fs');
const path = require('path');

// Test CSS styling for round seal display
const logoPath = path.join(process.cwd(), 'public', 'PPSUNAACA+Logo.png');
const logoBase64 = `data:image/png;base64,${fs.readFileSync(logoPath).toString('base64')}`;

// We can use a clean CSS container to show the round PPSU emblem nicely centered:
// Container: width 160px, height 160px, overflow hidden, displaying only the round crest from the left side of PPSUNAACA+Logo.png!
const cssRoundLogo = `
<div style="width: 160px; height: 160px; margin: 15px auto 35px auto; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center;">
  <img src="${logoBase64}" alt="PPSU Emblem" style="height: 160px; max-width: none; position: absolute; left: 0; top: 0; object-fit: contain;" />
</div>
`;

console.log('CSS round logo wrapper created successfully');
