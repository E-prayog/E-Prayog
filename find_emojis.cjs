const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'components', 'labs');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx')).sort();

const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}\u{200D}\u{20E3}\u{FE0F}]/u;

for (const f of files) {
  const lines = fs.readFileSync(path.join(dir, f), 'utf8').split('\n');
  lines.forEach((line, i) => {
    if (emojiRegex.test(line)) {
      console.log(f + ':' + (i + 1) + ' ' + line.trim());
    }
  });
}
