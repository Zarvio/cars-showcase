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

// ----------------------
// MAIN DOM LOADED
// ----------------------
document.addEventListener("DOMContentLoaded", async () => {
    const SUPABASE_URL = "https://lxbojhmvcauiuxahjwzk.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Ym9qaG12Y2F1aXV4YWhqd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzM3NjEsImV4cCI6MjA4MDUwOTc2MX0.xP1QCzWIwnWFZArsk_5C8wCz7vkPrmwmLJkEThT74JA";

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const main = document.querySelector(".main-content");
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");
    const relatedVideos = document.getElementById("relatedVideos");
    const closeBtn = document.querySelector(".closeBtn");
    const searchVideoInput = document.getElementById("searchVideoInput");

    if (!main) return;

    main.innerHTML = "<h3>Loading...</h3>";

    let allPosts = [];

    // Fetch posts
    try {
        const { data, error } = await supabaseClient
            .from("pinora823")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) throw error;
        allPosts = data || [];
        displayVideos(allPosts);

    } catch (err) {
        console.error("Error fetching posts:", err);
        main.innerHTML = "<p>Error loading posts.</p>";
    }

    // Search
    searchVideoInput.addEventListener("input", () => {
        const query = searchVideoInput.value.toLowerCase();
        if (!query) return displayVideos(allPosts);

        const filtered = allPosts.filter(post =>
            post.title && post.title.toLowerCase().includes(query)
        );
        displayVideos(filtered);
    });

    // Display Videos
   function displayVideos(posts) {
    main.innerHTML = "";

    if (!posts || posts.length === 0) {
        main.innerHTML = "<p>No videos found.</p>";
        return;
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    posts.forEach(post => {

        // OUTER BOX
        const box = document.createElement("div");
        box.classList.add("pin-box");

        // MEDIA CONTAINER (overlay yahin chalega)
        const mediaContainer = document.createElement("div");
        mediaContainer.className = "mediaContainer";

        // OVERLAY (DP + Username)
        const overlay = document.createElement("div");
        overlay.className = "uploaderOverlay";
        // Robust check for verified
const verified = post.uploader_verified === true 
                 || post.uploader_verified === 'true' 
                 || post.uploader_verified === 1 
                 || post.uploader_verified === '1';

// Build badge HTML only if verified
const badgeHTML = verified 
                  ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" 
                         style="width:16px; height:16px;">` 
                  : '';

// Overlay innerHTML
overlay.innerHTML = `
  <div style="display:flex; align-items:center; gap:8px; width:100%;">
    <img src="${post.uploader_image || 'images/default.jpg'}" class="uploaderDP" alt="uploader">
    <div style="display:flex; align-items:center; gap:6px;">
      <span class="uploaderName">${post.uploader_name || 'Unknown'}</span>
      ${badgeHTML}
    </div>
  </div>
`;

        mediaContainer.appendChild(overlay);

        // MEDIA (image/video)
        let media;
        if (post.file_type.startsWith("video") && isMobile) {
            media = document.createElement("img");
            media.src = post.thumb_url || "images/default.jpg";
        } else if (post.file_type.startsWith("video")) {
            media = document.createElement("video");
            media.src = post.file_url;
            media.muted = true;
            media.loop = true;
            media.playsInline = true;
            media.preload = "metadata";
        } else {
            media = document.createElement("img");
            media.src = post.file_url;
        }

        media.className = "postMedia";

        // MEDIA CLICK → OPEN MODAL
        media.addEventListener("click", () => {
            if (post.file_type.startsWith("video")) {
                modalVideo.src = post.file_url;
                modalVideo.style.display = "block";
                modalImage.style.display = "none";
            } else {
                modalImage.src = post.file_url;
                modalImage.style.display = "block";
                modalVideo.style.display = "none";
            }

            // Robust check for verified
const verified = post.uploader_verified === true 
                 || post.uploader_verified === 'true' 
                 || post.uploader_verified === 1 
                 || post.uploader_verified === '1';

// Build badge HTML only if verified
const badgeHTML = verified 
                  ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" 
                         style="width:16px; height:16px;">` 
                  : '';

// Update modalTitle
modalTitle.innerHTML = `
  ${post.title || ""}
  <div class="modalUploader" style="display:flex; align-items:center; gap:5px;">
    <img src="${post.uploader_image || 'images/default.jpg'}" class="modalUploaderDP">
    <span>${post.uploader_name || "Unknown"}</span>
    ${badgeHTML}
  </div>
`;

            modal.classList.remove("hidden");

            // RELATED VIDEOS
            relatedVideos.innerHTML = "";
            allPosts.forEach(other => {
                if (other.id === post.id) return;

                const wrap = document.createElement("div");
                wrap.className = "relatedBox";

                wrap.innerHTML = `
                    <div class="uploaderHeaderSmall">
                        <img src="${other.uploader_image || 'images/default.jpg'}" class="smallDP">
                        <span class="smallName">${other.uploader_name || "User"}</span>
                    </div>
                `;

                let relatedMedia;
                if (other.file_type.startsWith("video") && isMobile) {
                    relatedMedia = document.createElement("img");
                    relatedMedia.src = other.thumb_url || 'images/default.jpg';
                } else if (other.file_type.startsWith("video")) {
                    relatedMedia = document.createElement("video");
                    relatedMedia.src = other.file_url;
                    relatedMedia.muted = true;
                    relatedMedia.playsInline = true;
                    relatedMedia.autoplay = false;
                } else {
                    relatedMedia = document.createElement("img");
                    relatedMedia.src = other.file_url;
                }

                relatedMedia.className = "relatedThumb";
                relatedMedia.style.width = "100px";
                relatedMedia.style.height = "100px";
                relatedMedia.style.objectFit = "cover";

                wrap.appendChild(relatedMedia);

                wrap.addEventListener("click", () => {
                    if (other.file_type.startsWith("video")) {
                        modalVideo.src = other.file_url;
                        modalVideo.style.display = "block";
                        modalImage.style.display = "none";
                    } else {
                        modalImage.src = other.file_url;
                        modalImage.style.display = "block";
                        modalVideo.style.display = "none";
                    }

                    modalTitle.innerHTML = `
                        ${other.title || ""}
                        <div class="modalUploader">
                            <img src="${other.uploader_image || 'images/default.jpg'}" class="modalUploaderDP">
                            <span>${other.uploader_name || "Unknown"}</span>
                        </div>
                    `;
                });

                relatedVideos.appendChild(wrap);
            });
        });

        // ADD MEDIA
        mediaContainer.appendChild(media);

        // ADD CONTAINER TO BOX
        box.appendChild(mediaContainer);

        // ADD BOX IN MAIN
        main.appendChild(box);
    });
}




    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        modalVideo.pause();
    });

    // Navigation
    document.getElementById("btnHome")?.addEventListener("click", () => location.href = "index.html");
    document.getElementById("btnSearch")?.addEventListener("click", () => location.href = "search.html");
    document.getElementById("btnProfile")?.addEventListener("click", () => location.href = "profile.html");
    document.getElementById("btnUpload")?.addEventListener("click", () => location.href = "upload.html");
     document.getElementById("btnmessage")?.addEventListener("click", () => location.href = "message.html");
});

// ----------------------
// 🔴 RED DOT NOTIFICATION LOGIC
// ----------------------
const notifDot = document.getElementById("notifDot");
const notifBtn = document.getElementById("btnNotifs");

firebase.auth().onAuthStateChanged(user => {
    if (!user) return;

    const uid = user.uid;
    const ref = firebase.database().ref(`notifications/${uid}`);

    // Show dot only for new notifications
    ref.on("child_added", snap => {
        const n = snap.val();
        if (n && n.read === false) {
            notifDot.style.display = "inline-block";
        }
    });
});

// When clicking notification icon
notifBtn.addEventListener("click", () => {
    notifDot.style.display = "none";

    const user = firebase.auth().currentUser;
    if (!user) return;

    const ref = firebase.database().ref(`notifications/${user.uid}`);
    ref.once("value", snapshot => {
        snapshot.forEach(child => {
            const data = child.val();
            if (data && data.read === false) {
                ref.child(child.key).update({ read: true });
            }
        });
    });

    window.location.href = "notification.html";
});

// ----------------------
// 🔐 CTRL + P ADMIN LOGIN
// ----------------------
document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault(); // Print popup block

        const pass = prompt("Enter Admin Password:");
        if (pass === "deepak55") {
            window.location.href = "panel.html";
        } else if (pass !== null) {
            alert("Wrong password!");
        }
    }
});

const btnMessage = document.getElementById("btnmessage");

// रेड नंबर
const messageCount = document.createElement("span");
messageCount.style.cssText = `
    display:none;
    min-width:16px;
    height:16px;
    background:red;
    color:white;
    font-size:12px;
    font-weight:bold;
    text-align:center;
    line-height:16px;
    border-radius:50%;
    position:absolute;
    top:0px;
    right:0px;
    pointer-events:none;
    z-index:1001;
    padding: 0 4px;
`;
btnMessage.style.position = "fixed";
btnMessage.appendChild(messageCount);

firebase.auth().onAuthStateChanged(user => {
  if (!user) return;
  const uid = user.uid;

  const chatsRef = firebase.database().ref("chats");

  const updateUnreadCount = () => {
    chatsRef.once("value", snapshot => {
      const chats = snapshot.val();
      if (!chats) {
        messageCount.style.display = "none";
        return;
      }

      let unread = 0;

      Object.keys(chats).forEach(chatId => {
        if (!chatId.includes(uid)) return;

        const messages = chats[chatId];
        Object.keys(messages).forEach(msgId => {
          const msg = messages[msgId];
          if (msg.sender !== uid && !msg.read) unread++;
        });
      });

      if (unread > 0) {
        messageCount.style.display = "block";
        messageCount.innerText = unread;
      } else {
        messageCount.style.display = "none";
      }
    });
  };

  // listener for new messages
  chatsRef.on("child_added", updateUnreadCount);
  chatsRef.on("child_changed", updateUnreadCount);
  chatsRef.on("child_removed", updateUnreadCount);
});

btnMessage.onclick = () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const uid = user.uid;
  const chatsRef = firebase.database().ref("chats");

  chatsRef.once("value", snapshot => {
    const chats = snapshot.val();
    if (!chats) return;

    Object.keys(chats).forEach(chatId => {
      if (!chatId.includes(uid)) return;

      const messages = chats[chatId];
      Object.keys(messages).forEach(msgId => {
        const msg = messages[msgId];
        if (msg.sender !== uid && !msg.read) {
          // mark message as read
          chatsRef.child(chatId).child(msgId).update({ read: true });
        }
      });
    });

    // click करते ही number hide
    messageCount.style.display = "none";
    window.location.href = "message.html";
  });
};
// सबसे पहले modal element को select करो
const modal = document.querySelector(".modal"); // या जो भी आपका actual modal class/id है

// अगर modal के अंदर वीडियो है
const modalVideo = document.querySelector(".modal video"); // या आपका वीडियो selector

// फिर आपका click handler
document.querySelector(".closeBtn").addEventListener("click", () => {
    if (!modal.classList.contains("hidden")) {
        modal.classList.add("hidden");
        modalVideo.pause();
    } else {
        window.history.back();
    }
});
// RELATED VIDEOS FUNCTION (Supabase version)
const relatedVideos = document.getElementById("relatedVideos");
const template = document.getElementById("relatedVideoTemplate");

const fetchRelatedVideosSupabase = async (currentVideoId) => {
  try {
    const { data: videos, error } = await supabaseClient
      .from("pinora823")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!videos) return;

    relatedVideos.innerHTML = "";

    videos.forEach(video => {
      if (video.id === currentVideoId) return; // skip current

      const card = template.content.cloneNode(true);
      card.querySelector(".smallDP").src = video.uploader_image || "images/default.jpg";
      card.querySelector(".smallName").textContent = video.uploader_name || "Unknown";
      card.querySelector(".relatedThumb").src = video.thumb_url || video.file_url;

      card.querySelector(".relatedBox").addEventListener("click", () => {
        // open modal with clicked video
        if (video.file_type.startsWith("video")) {
          modalVideo.src = video.file_url;
          modalVideo.style.display = "block";
          modalImage.style.display = "none";
        } else {
          modalImage.src = video.file_url;
          modalImage.style.display = "block";
          modalVideo.style.display = "none";
        }

        modalTitle.innerHTML = `
          ${video.title || ""}
          <div class="modalUploader">
            <img src="${video.uploader_image || 'images/default.jpg'}" class="modalUploaderDP">
            <span>${video.uploader_name || "Unknown"}</span>
          </div>
        `;

        modal.classList.remove("hidden");
      });

      relatedVideos.appendChild(card);
    });
  } catch (err) {
    console.error("Error fetching related videos:", err);
  }
};
