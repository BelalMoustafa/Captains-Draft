const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync('./src/app').filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/prisma\.user\./g, "prisma.roomParticipant.");
  content = content.replace(/include: \{ users: true \}/g, "include: { participants: true }");
  content = content.replace(/room\.users/g, "room.participants");
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Refactored ' + file);
  }
}
