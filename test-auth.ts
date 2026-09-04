import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function run() {
  const apiKey = config.apiKey;
  // Let's create a user or just sign in
  console.log("Checking API Key...", apiKey.slice(0,5));
}
run();
