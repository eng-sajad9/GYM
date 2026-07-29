/**
 * ============================================================
 * One-Time Admin Setup Script
 * Sets UID: YimwkF4tsWeipxKw0T9HIgY1vt62 as super_admin
 *
 * Run with: node scripts/set-admin.mjs
 * ============================================================
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';
import { createInterface } from 'readline';

const firebaseConfig = {
  apiKey:            'AIzaSyANFgwZ6gg85rw7JQ6Q2htp-LHf_Npe9iU',
  authDomain:        'school-project-d725e.firebaseapp.com',
  projectId:         'school-project-d725e',
  storageBucket:     'school-project-d725e.firebasestorage.app',
  messagingSenderId: '790528248308',
  appId:             '1:790528248308:web:51e7c307c2717aa443d1a1',
};

const ADMIN_UID = 'YimwkF4tsWeipxKw0T9HIgY1vt62';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Prompt for credentials
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n🔐 Firebase Admin Setup Script');
  console.log('═══════════════════════════════');
  console.log(`Target UID: ${ADMIN_UID}`);
  console.log('Please sign in with the account you want to upgrade:\n');

  const email    = await ask('Email: ');
  const password = await ask('Password: ');

  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    const uid  = cred.user.uid;

    if (uid !== ADMIN_UID) {
      console.error(`\n❌ Error: Signed-in UID (${uid}) does not match target UID (${ADMIN_UID}).`);
      console.error('Please sign in with the correct account.');
      process.exit(1);
    }

    const now = Timestamp.now();

    // Update users/{uid} role to super_admin
    await setDoc(
      doc(db, 'users', ADMIN_UID),
      {
        role: 'super_admin',
        account_status: 'active',
        updated_at: now,
      },
      { merge: true }
    );

    // Update subscriptions/{uid} to active/lifetime
    await setDoc(
      doc(db, 'subscriptions', ADMIN_UID),
      {
        plan_type: 'lifetime',
        status: 'active',
        updated_at: now,
      },
      { merge: true }
    );

    console.log('\n✅ Success! Account upgraded to super_admin.');
    console.log(`   UID: ${ADMIN_UID}`);
    console.log('   Role: super_admin');
    console.log('   Plan: lifetime / active\n');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

main();
