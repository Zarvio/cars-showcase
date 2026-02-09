// presence.js

// 🔥 Firebase already initialized hona chahiye
firebase.auth().onAuthStateChanged(user => {
  if (!user) return;

  const uid = user.uid;
  const userRef = firebase.database().ref("users/" + uid);

  // mark online
  userRef.update({
    online: true,
    lastSeen: Date.now()
  });

  // disconnect detect
  firebase.database().ref(".info/connected").on("value", snap => {
    if (snap.val() === false) return;

    userRef.onDisconnect().update({
      online: false,
      lastSeen: Date.now()
    });
  });
});
