const admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert(require("./serviceAccountKey.json"))
});

async function fixUser(uid, username, password) {
  const fakeEmail = `${username}@pinora.app`;

  await admin.auth().updateUser(uid, {
    email: fakeEmail,
    password: password
  });

  console.log("User fixed:");
  console.log("Email:", fakeEmail);
  console.log("Password:", password);
}

// 👉 YAHAN APNA PASSWORD KHUD DALO
fixUser(
  "oHWeVNyKOlN4fJ5RNDuEPtBz4lo1", // UID
  "mahi_7",                     // username → fake email
  "7104100"                 // PASSWORD (jo tum chahte ho)
);
