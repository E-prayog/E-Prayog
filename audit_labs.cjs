const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components', 'labs');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).sort();
files.push('../SimulationStage.tsx');

const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{200D}\u{20E3}\u{FE0F}]/u;

const table = [];
let totalSky = 0, totalEmDash = 0, totalEmoji = 0, totalFont = 0;
let cleanCount = 0, dirtyCount = 0;

for (const f of files) {
  const filePath = path.resolve(dir, f);
  if (!fs.existsSync(filePath)) continue;
  const content = fs.readFileSync(filePath, 'utf8');
  
  const skyMatches = content.match(/sky-[a-z0-9]+|#0[Ee][Aa]5[Ee]9|#38[Bb][Dd][Ff]8|#0284[Cc]7/g) || [];
  const emDashMatches = content.match(/—/g) || [];
  const emojiMatches = content.match(new RegExp(emojiRegex, 'gu')) || [];
  const fontMatches = content.match(/Plus Jakarta Sans/g) || [];
  
  const fileName = path.basename(f);
  const isDirty = skyMatches.length > 0 || emDashMatches.length > 0 || emojiMatches.length > 0 || fontMatches.length > 0;
  
  if (isDirty) dirtyCount++; else cleanCount++;
  totalSky += skyMatches.length;
  totalEmDash += emDashMatches.length;
  totalEmoji += emojiMatches.length;
  totalFont += fontMatches.length;

  table.push({
    file: fileName,
    sky: skyMatches.length,
    emDash: emDashMatches.length,
    emoji: emojiMatches.length,
    font: fontMatches.length,
    status: isDirty ? 'Needs changes' : 'Clean'
  });
}

console.log('| Lab file | Sky blue colors found | Em-dashes | Emoji icons | Fonts to fix | Status |');
console.log('| --- | --- | --- | --- | --- | --- |');
for (const row of table) {
  console.log('| ' + row.file + ' | ' + row.sky + ' | ' + row.emDash + ' | ' + row.emoji + ' | ' + row.font + ' | ' + row.status + ' |');
}
console.log('\nTotal files: ' + table.length + ', Needs changes: ' + dirtyCount + ', Clean: ' + cleanCount);
