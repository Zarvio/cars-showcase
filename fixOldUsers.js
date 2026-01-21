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
  "6xMxaqYFvfTmGzYHusXFmWtWsuP2", // UID
  "pinorafounderbesti",                     // username → fake email
  "12344321"                 // PASSWORD (jo tum chahte ho)
);
