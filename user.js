//document.body.style.display = "none"; // ---------- ye line remove krte hi shi ho jayega ----------





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
const SUPABASE_URL = "https://apewbmwwgobliozdollx.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZXdibXd3Z29ibGlvemRvbGx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MDc4MzksImV4cCI6MjA4Njk4MzgzOX0.8wm8Rpis6W13ZJeavfY-ijicXj57A_1ycYu3heVX5X8";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
const messageBtn = document.getElementById("messageBtn");


const followersModal = document.getElementById("followersModal");
const followersList = document.getElementById("followersList");
const closeFollowers = document.getElementById("closeFollowers");


// UID from URL
const params = new URLSearchParams(window.location.search);
const profileUid = params.get("uid");

if (!profileUid) {
  alert("Invalid user.");
}

// ----------------------
// NAVIGATION BUTTONS
// ----------------------
document.getElementById("btnHome").addEventListener("click", () => { window.location.href = "main.html"; });
document.getElementById("btnSearch").addEventListener("click", () => { window.location.href = "search.html"; });
document.getElementById("btnNotifs").addEventListener("click", () => { window.location.href = "notification.html"; });
document.getElementById("btnProfile").addEventListener("click", () => { window.location.href = "profile.html"; });
document.getElementById("btnUpload").addEventListener("click", () => { window.location.href = "upload.html"; });

// ----------------------
// LOAD PROFILE DATA
// ----------------------
firebase.auth().onAuthStateChanged(async user => {
 document.getElementById("skeletonProfile").style.display = "block";
profileContent.style.display = "none";

  if (!user) {
    
    profileContent.style.display = "none";
    alert("Please login first.");
    return;
  }

  const currentUid = user.uid;

profileContent.style.display = "none";
document.getElementById("userVideosSection").style.display = "none";



  try {
    // Load target profile data
    const snapshot = await firebase.database().ref("users/" + profileUid).once("value");
    if (!snapshot.exists()) {
      alert("User profile not found");
      return;
    }

    const data = snapshot.val();

    // ✅ Name
    displayName.innerText =
      (data.name || "") + (data.surname ? " " + data.surname : "");

    // ✅ Username with/without verified badge
    if (data.verified === true) {
      displayUsername.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; gap:5px; width:100%;">
          @${data.username || ""}
          <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:16px; height:16px;">
        </div>
      `;
    } else {
      displayUsername.innerHTML = `
        <div style="text-align:center; width:100%;">
          @${data.username || ""}
        </div>
      `;
    }

    // ✅ Bio
    if (data.bio && data.bio.trim() !== "") {
      displayBio.innerText = data.bio;
    } else {
      displayBio.innerText = "";
    }

    // ✅ Profile pic
    profilePic.src = data.photoURL || "dp.jpg";

    // ✅ Message button logic
    if (currentUid === profileUid) {
      messageBtn.style.display = "none";
    } else {
      messageBtn.style.display = "inline-block";
    }

   messageBtn.onclick = async () => {

  const user = firebase.auth().currentUser;

  // ❌ login nahi hai
  if (!user) {
    showPopup(
      "Login Required",
      "Message bhejne ke liye pehle login karo"
    );
    return;
  }

  try {
    // 🔍 current user ke videos count
const { data, error } = await supabaseClient
  .from("pinora823")
  .select("id")
  .eq("uploader_uid", user.uid);

const videoCount = data ? data.length : 0;

    // ❌ agar 2 se kam videos
    if (videoCount < 2) {
      showPopup(
        "Chat Locked 🔒",
        "You must upload at least 2 videos to unlock the chat."
      );
      return;
    }

    // ✅ sab sahi hai → chat open
    window.location.href = `chat.html?uid=${profileUid}`;

  } catch (err) {
    console.error(err);
    showPopup(
      "Error",
      "Kuch galat ho gaya, thodi der baad try karo"
    );
  }
};


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
        updates[`followers/${profileUid}/${currentUid}`] = null;
        updates[`following/${currentUid}/${profileUid}`] = null;
      } else {
        updates[`followers/${profileUid}/${currentUid}`] = true;
        updates[`following/${currentUid}/${profileUid}`] = true;

        const currentUserSnapshot = await firebase.database().ref(`users/${currentUid}`).once("value");
        const currentUserData = currentUserSnapshot.val();
        const currentUserName = currentUserData
          ? (currentUserData.name || "Someone") + (currentUserData.surname ? " " + currentUserData.surname : "")
          : "Someone";

        const notifRef = firebase.database().ref(`notifications/${profileUid}`).push();
        updates[`notifications/${profileUid}/${notifRef.key}`] = {
          type: "follow",
          fromUid: currentUid,
          text: `${currentUserName} started following you.`,
          timestamp: Date.now(),
          read: false
        };
      }

      firebase.database().ref().update(updates)
        .then(() => {
          if (!isFollowing) console.log("Followed successfully!");
        })
        .catch(err => console.error(err));
    };

  } catch (err) {
    console.error(err);
    alert("Error loading profile");
  } 
finally {
  document.getElementById("skeletonProfile").style.display = "none";

  profileContent.style.display = "block";
  document.getElementById("userVideosSection").style.display = "block";

  loadUserVideos(profileUid);
}


});
// Select parent spans
const followersSpan = followersCount.parentElement;
const followingSpan = followingCount.parentElement;

// Followers click
followersSpan.addEventListener("click", async () => {
  followersModal.classList.add("show");
  document.querySelector("#followersModal h3").innerText = "Followers";
  followersList.innerHTML = "<p>Loading...</p>";

  const snap = await firebase.database().ref("followers/" + profileUid).once("value");
  if (!snap.exists()) {
    followersList.innerHTML = "<p>No followers yet</p>";
    return;
  }

  followersList.innerHTML = "";
  const followerUids = Object.keys(snap.val());

  for (let uid of followerUids) {
    const userSnap = await firebase.database().ref("users/" + uid).once("value");
    if (!userSnap.exists()) continue;

    const user = userSnap.val();
    const verified = user.verified === true;
    const badgeHTML = verified
      ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:14px; height:14px;">`
      : '';

    const div = document.createElement("div");
    div.className = "follower-item";
    div.innerHTML = `
      <img src="${user.photoURL || 'dp.jpg'}">
      <div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${user.name || ''} ${user.surname || ''} ${badgeHTML}
        </div>
        <small>@${user.username || ''}</small>
      </div>
    `;
    div.onclick = () => window.location.href = "user.html?uid=" + uid;
    followersList.appendChild(div);
  }
});

// Following click
followingSpan.addEventListener("click", async () => {
  followersModal.classList.add("show");
  document.querySelector("#followersModal h3").innerText = "Following";
  followersList.innerHTML = "<p>Loading...</p>";

  const snap = await firebase.database().ref("following/" + profileUid).once("value");
  if (!snap.exists()) {
    followersList.innerHTML = "<p>Not following anyone yet</p>";
    return;
  }

  followersList.innerHTML = "";
  const followingUids = Object.keys(snap.val());

  for (let uid of followingUids) {
    const userSnap = await firebase.database().ref("users/" + uid).once("value");
    if (!userSnap.exists()) continue;

    const user = userSnap.val();
    const verified = user.verified === true;
    const badgeHTML = verified
      ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:14px; height:14px;">`
      : '';

    const div = document.createElement("div");
    div.className = "follower-item";
    div.innerHTML = `
      <img src="${user.photoURL || 'dp.jpg'}">
      <div>
        <div style="display:flex; align-items:center; gap:6px;">
          ${user.name || ''} ${user.surname || ''} ${badgeHTML}
        </div>
        <small>@${user.username || ''}</small>
      </div>
    `;
    div.onclick = () => window.location.href = "user.html?uid=" + uid;
    followersList.appendChild(div);
  }
});

// Close modal
closeFollowers.addEventListener("click", () => {
  followersModal.classList.remove("show");
});

// ---------- VIDEO MODAL ----------
const videoModal = document.createElement("div");
videoModal.style.position = "fixed";
videoModal.style.top = "0";
videoModal.style.left = "0";
videoModal.style.width = "100%";
videoModal.style.height = "100%";
videoModal.style.background = "rgba(0,0,0,0.9)";
videoModal.style.display = "none";
videoModal.style.alignItems = "center";
videoModal.style.justifyContent = "center";
videoModal.style.zIndex = "9999";

videoModal.innerHTML = `
  <span id="closeVideoModal"
    style="position:absolute;top:20px;right:25px;
    font-size:30px;color:white;cursor:pointer;">✖</span>

  <video id="profileVideoPlayer"
    controls
    autoplay
    controlsList="nodownload noplaybackrate noremoteplayback"
    disablePictureInPicture
    style="max-width:90%;max-height:90%;border-radius:10px;">
</video>
`;

document.body.appendChild(videoModal);

const profileVideoPlayer = videoModal.querySelector("#profileVideoPlayer");
const closeVideoModal = videoModal.querySelector("#closeVideoModal");

closeVideoModal.onclick = () => {
  profileVideoPlayer.pause();
  profileVideoPlayer.src = "";
  videoModal.style.display = "none";
};

function openVideoModal(videoUrl) {
  profileVideoPlayer.src = videoUrl;
  videoModal.style.display = "flex";
}

async function loadUserVideos(uid) {
  const container = document.getElementById("userVideos");

  container.innerHTML = "";                 // remove old junk
        // ensure visible
  container.innerHTML = "<p class='empty-text'>Loading...</p>";


  const { data, error } = await supabaseClient
    .from("pinora823")
    .select("*")
    .eq("uploader_uid", uid)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = "<p class='empty-text'>Error loading videos</p>";
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p class='empty-text'>No videos uploaded yet</p>";
    return;
  }

  container.innerHTML = "";

  data.forEach(post => {
    const card = document.createElement("div");
    card.className = "video-card";

    const thumb = document.createElement("img");
    thumb.src = post.thumb_url || post.file_url;
    thumb.alt = "Video Thumbnail";

    const playIcon = document.createElement("div");
    playIcon.className = "video-play-icon";
    playIcon.innerHTML = `<i class="fa-solid fa-play"></i>`;

    // Delete button only if it's own profile
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-video-btn";
    deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i>`;
    if (uid !== firebase.auth().currentUser.uid) deleteBtn.style.display = "none";

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      alert("Delete functionality can be added here");
    });

    card.appendChild(thumb);
    card.appendChild(playIcon);
    card.appendChild(deleteBtn);

    card.addEventListener("click", () => {
      openVideoModal(post.file_url);

    });

    container.appendChild(card);
  });
}
