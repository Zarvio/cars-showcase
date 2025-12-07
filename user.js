// ---------- Firebase Config ----------
const firebaseConfig = {
  apiKey: "AIzaSyDUefeJbHKIAs-l3zvFlGaas6VD63vv4kI",
  authDomain: "inspire4ever-c60ad.firebaseapp.com",
  databaseURL: "https://inspire4ever-c60ad-default-rtdb.firebaseio.com",
  projectId: "inspire4ever-c60ad",
  storageBucket: "inspire4ever-c60ad.appspot.com",
  messagingSenderId: "125014633127",
  appId: "1:125014633127:web:d29e4c37628ab637f40982"
};
firebase.initializeApp(firebaseConfig);

// Elements
const profilePic = document.getElementById("profilePic");
const displayName = document.getElementById("displayName");
const displayUsername = document.getElementById("displayUsername");
const followersCount = document.getElementById("followersCount");
const followingCount = document.getElementById("followingCount");
const loaderOverlay = document.getElementById("loaderOverlay");
const profileContent = document.getElementById("profileView");
const followBtn = document.getElementById("followBtn");
const displayBio = document.getElementById("displayBio");

// UID from URL
const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

if (!profileUid) {
  alert("Invalid user.");
}

// ----------------------
// NAVIGATION BUTTONS
// ----------------------
document.getElementById("btnHome").addEventListener("click", () => { window.location.href = "index.html"; });
document.getElementById("btnSearch").addEventListener("click", () => { window.location.href = "search.html"; });
document.getElementById("btnNotifs").addEventListener("click", () => { window.location.href = "notification.html"; });
document.getElementById("btnProfile").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("btnUpload").addEventListener("click", () => { window.location.href = "upload.html"; });

// ----------------------
// LOAD PROFILE DATA
// ----------------------
firebase.auth().onAuthStateChanged(async user => {
  if (!user) {
    loaderOverlay.style.display = "none";
    profileContent.style.display = "none";
    alert("Please login first.");
    return;
  }

  const currentUid = user.uid;
  loaderOverlay.style.display = "flex";
  profileContent.style.display = "none";

  try {
    // Load target profile data
    const snapshot = await firebase.database().ref("users/" + profileUid).once("value");
    if (!snapshot.exists()) {
      alert("User profile not found");
      return;
    }

    const data = snapshot.val();
    displayName.innerText = (data.name || "") + (data.surname ? " " + data.surname : "");
    
    // username + verified badge
    if (data.verified === true) {
      displayUsername.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:5px; width:100%;">
          @${data.username || ""}
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:16px; height:16px;">
        </div>
      `
      // ✅ Show bio
if (data.bio && data.bio.trim() !== "") {
  displayBio.innerText = data.bio;
} else {
  displayBio.innerText = "";
}
;
    } else {
      displayUsername.innerHTML = `<div style="text-align:center; width:100%;">@${data.username || ""}</div>`;
      
    }

    profilePic.src = data.photoURL || "default.jpg";

    // followers / following count
    const followersSnap = await firebase.database().ref("followers/" + profileUid).once("value");
    followersCount.innerText = followersSnap ? followersSnap.numChildren() : 0;

    const followingSnap = await firebase.database().ref("following/" + profileUid).once("value");
    followingCount.innerText = followingSnap ? followingSnap.numChildren() : 0;

    profileContent.style.display = "block";

    // ----------------------
    // FOLLOW / UNFOLLOW LOGIC
    // ----------------------
    const followRef = firebase.database().ref(`followers/${profileUid}/${currentUid}`);
    const followingRef = firebase.database().ref(`following/${currentUid}/${profileUid}`);

    // Live listener for follow button & followers count
    followRef.on("value", snap => {
      if (snap.exists()) {
        followBtn.innerText = "Unfollow";
        followBtn.dataset.following = "yes";
      } else {
        followBtn.innerText = "Follow";
        followBtn.dataset.following = "no";
      }
    });

    firebase.database().ref(`followers/${profileUid}`).on("value", snap => {
      followersCount.innerText = snap.numChildren();
    });

    followBtn.onclick = async () => {
  const isFollowing = followBtn.dataset.following === "yes";
  const updates = {};

  if (isFollowing) {
    // Unfollow
    updates[`followers/${profileUid}/${currentUid}`] = null;
    updates[`following/${currentUid}/${profileUid}`] = null;
  } else {
    // Follow
    updates[`followers/${profileUid}/${currentUid}`] = true;
    updates[`following/${currentUid}/${profileUid}`] = true;

    // Get current user's name from database
    const currentUserSnapshot = await firebase.database().ref(`users/${currentUid}`).once("value");
    const currentUserData = currentUserSnapshot.val();
    const currentUserName = currentUserData ? (currentUserData.name || "Someone") + (currentUserData.surname ? " " + currentUserData.surname : "") : "Someone";

    // Notification for target user
    const notifRef = firebase.database().ref(`notifications/${profileUid}`).push();
    updates[`notifications/${profileUid}/${notifRef.key}`] = {
      type: "follow",
      fromUid: currentUid,
      text: `${currentUserName} started following you.`,
      timestamp: Date.now(),
      read: false
    };
  }

  // Update Firebase
  firebase.database().ref().update(updates)
    .then(() => {
      if (!isFollowing) console.log("Followed successfully!");
    })
    .catch(err => console.error(err));
};


  } catch (err) {
    console.error(err);
    alert("Error loading profile");
  } finally {
    loaderOverlay.style.display = "none";
  }
});
displayUsername.innerHTML