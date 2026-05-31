import { DivoomPixoo } from './divoom-pixoo.js';

// Parse command line arguments
// Usage: node hello-world.js IP_ADDRESS
const args = process.argv.slice(2);
const ipArg = args.find(arg => /^\d+\.\d+\.\d+\.\d+$/.test(arg));

if (!ipArg) {
  console.error('❌ Error: IP address is required');
  console.error('Usage: node hello-world.js IP_ADDRESS');
  console.error('Example: node hello-world.js 192.168.10.139');
  process.exit(1);
}

const PIXOO_IP = ipArg;

async function main() {
  try {
    const pixoo = new DivoomPixoo(PIXOO_IP);
    
    console.log(`Testing Pixoo 64 at ${PIXOO_IP}...\n`);
    
    // Display Hello World
    console.log('Displaying "Hello World"...');
    await pixoo.displayHelloWorld();
    
    console.log('\n✓ Done!');
    console.log('Your Pixoo 64 should now show "Hello World" in yellow!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
