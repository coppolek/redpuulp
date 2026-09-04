import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId,
});

const db = getFirestore(app);
db.settings({ databaseId: config.firestoreDatabaseId });

async function run() {
  try {
    const snap = await db.collection('posts').limit(1).get();
    console.log('Success:', snap.size);
  } catch(e) {
    console.error('Error:', e);
  }
}
run();
