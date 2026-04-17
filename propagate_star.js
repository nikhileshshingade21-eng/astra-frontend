const fs = require('fs');
const path = require('path');

// THE CLEAR STAR PNG I GENERATED
const source = "C:\\Users\\nikhi\\.gemini\\antigravity\\brain\\f15e3751-fd1d-479e-8f9d-4523963180b3\\astra_star_foreground_clean_1776368023037.png";
const resDir = "d:\\astra by antigravity\\astra-rn\\android\\app\\src\\main\\res";

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
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        } else {
            // PURGE existing launcher icons to prevent Duplicate Resource errors (PNG vs WebP)
            const files = fs.readdirSync(destDir);
            files.forEach(file => {
                if (file.startsWith('ic_launcher')) {
                    const filePath = path.join(destDir, file);
                    fs.unlinkSync(filePath);
                    console.log(`Purged: ${filePath}`);
                }
            });
        }
        
        // Copy the new high-res star as the foreground
        fs.copyFileSync(source, path.join(destDir, 'ic_launcher_foreground.png'));
    });
    
    // Copy to drawable for the Splash Screen animated icon
    const drawableDir = path.join(resDir, 'drawable');
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    
    // Also purge existing astra_flash in drawable if any
    const flashPath = path.join(drawableDir, 'astra_flash.png');
    if (fs.existsSync(flashPath)) fs.unlinkSync(flashPath);
    
    fs.copyFileSync(source, flashPath);
    
    console.log('Successfully purged old icons and propagated ASTRA star foreground.');
} else {
    console.error('Source icon not found at', source);
}
