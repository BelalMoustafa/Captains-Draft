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

const files = walkSync('./src/app').filter(f => f.endsWith('.tsx'));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('pusherClient')) {
    content = content.replace(/import \{ pusherClient \} from '@\/lib\/pusher-client'/g, "import { socketClient } from '@/lib/socket-client'");
    content = content.replace(/const channel = pusherClient\.subscribe\(`room-\$\{room\.code\}`\)/g, "socketClient.emit('join-room', `room-${room.code}`); const channel = socketClient;");
    content = content.replace(/channel\.bind\(/g, "channel.on(");
    content = content.replace(/channel\.unbind\(/g, "channel.off(");
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
}
