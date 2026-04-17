const fs = require('fs');
const path = require('path');

const validPngHeader = Buffer.from('89504e470d0a1a0a', 'hex');
const fallbackPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function fixDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixDirectory(fullPath);
        } else if (fullPath.endsWith('.png')) {
            try {
                const fd = fs.openSync(fullPath, 'r');
                const buffer = Buffer.alloc(8);
                const bytesRead = fs.readSync(fd, buffer, 0, 8, 0);
                fs.closeSync(fd);
                
                if (bytesRead < 8 || !buffer.equals(validPngHeader)) {
                    console.log('Fixing corrupted PNG:', fullPath);
                    fs.writeFileSync(fullPath, fallbackPng);
                }
            } catch (e) {
                console.error('Error reading/writing', fullPath, e.message);
            }
        }
    }
}

fixDirectory(path.join(__dirname, 'android/app/src/main/res'));
fixDirectory(path.join(__dirname, 'src/assets'));
console.log('PNG sweep complete.');
