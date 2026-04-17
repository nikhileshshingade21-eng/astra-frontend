const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'assets', 'star_logo.png');
const resDir = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const mipmapFolders = [
    'mipmap-hdpi',
    'mipmap-mdpi',
    'mipmap-xhdpi',
    'mipmap-xxhdpi',
    'mipmap-xxxhdpi'
];

if (fs.existsSync(source)) {
    mipmapFolders.forEach(folder => {
        const destDir = path.join(resDir, folder);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher.png'));
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher_round.png'));
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher_foreground.png'));
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher_background.png'));
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher_monochrome.png'));
    });
    console.log('Successfully propagated ASTRA icon to all android mipmap folders (including adaptive foreground).');
} else {
    console.error('Source icon not found at', source);
}
