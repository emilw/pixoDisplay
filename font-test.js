import DivoomPixoo from './divoom-pixoo.js';

async function testFonts() {
  const pixoo = new DivoomPixoo('192.168.1.74');
  
  console.log('Testing different font sizes...');
  await pixoo.fillScreenColor(0, 0, 0);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Test fonts 0-7
  let yPos = 2;
  for (let fontId = 0; fontId <= 7; fontId++) {
    await pixoo.drawTextSimple(`Font ${fontId}`, 2, yPos, [255, 255, 255], fontId + 1, fontId);
    yPos += 8;
  }
  
  console.log('Font test complete. Check your Pixoo screen.');
  console.log('Fonts 0-7 should be displayed.');
}

testFonts().catch(console.error);
