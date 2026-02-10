// ==============================
// 🎬 SKELETON LOADER FUNCTIONS
// ==============================
const main = document.querySelector(".main-content");

function showSkeletons(count = 6) {
  if (!main) return;

  main.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const box = document.createElement("div");
    box.className = "pin-box";

    box.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;padding:8px;">
    <div class="skeleton skeleton-dp"></div>
    <div class="skeleton skeleton-name"></div>
  </div>
  <div class="mediaContainer skeleton skeleton-video"></div>
`;

    main.appendChild(box);
  }
}
let dataReady = false;   // ⬅️ NEW FLAG
function normalizeTags(tags) {
  if (!tags) return [];

  let arr = [];

  if (typeof tags === "string") {
    arr = tags
      .replace(/[\[\]{}"]/g, "")   // ⛔ remove [ ] { }
      .split(",")
      .map(t => t.trim().toLowerCase());
  }
  else if (Array.isArray(tags)) {
    arr = tags.map(t => String(t).toLowerCase().trim());
  }

  return arr
    .map(t => t.replace(/[.#$\[\]]/g, ""))  // 🔥 firebase unsafe chars remove
    .filter(t => t.length > 0);
}


let allPosts = [];
let batchSize = 6;        // har batch me kitne video load honge
let batchIndex = 0;        // kaunse batch pe hain
let displayedPosts = [];   // already display hue posts

function formatViews(num) {
  num = Number(num || 0);

  if (num < 1000) return num.toString();

  if (num < 1000000)
    return (num / 1000).toFixed(1).replace(".0","") + "K";

  if (num < 1000000000)
    return (num / 1000000).toFixed(1).replace(".0","") + "M";

  return (num / 1000000000).toFixed(1).replace(".0","") + "B";
}

// =======================
// 🧠 USER INTEREST SYSTEM
// =======================
let userInterest = {};

let currentFilter = "all";
let followingList = [];
let isLoading = true;


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
window.sendLikeNotification = async function(postId) {
  

  try {
    const { data: post, error } = await window.supabaseClient
      .from("pinora823")
      .select("uploader_uid, thumb_url")
      .eq("id", postId)
      .single();

    if (error || !post) {
      console.error("❌ Supabase post fetch failed", error);
      return;
    }

    if (!post.uploader_uid) {
      console.warn("⚠ uploader_uid missing in pinora823 table");
      return;
    }

    const user = firebase.auth().currentUser;
    const browserId = getBrowserId();

    const fromName = user ? (user.displayName || "User") : "Guest";
    const fromUid = user ? user.uid : browserId;

    if (user && post.uploader_uid === user.uid) return;

    const notifRef = firebase.database()
      .ref(`notifications/${post.uploader_uid}`)
      .push();

    await notifRef.set({
      from: fromName,
      fromUid: fromUid,
      postId: postId,
      thumb: post.thumb_url || "dp.jpg",
      commentText: "",

      text: `${fromName} liked your video`,
      profileImage: user?.photoURL || "dp.jpg",
      verified: user?.emailVerified || false,
      type: "like",
      read: false,
      timestamp: Date.now()
    });

   

  } catch (err) {
    console.error("🔥 sendLikeNotification error:", err);
  }
  
};

window.sendCommentNotification = async function(postId, commentText) {
 

  try {
    const { data: post, error } = await window.supabaseClient
      .from("pinora823")
      .select("uploader_uid, thumb_url")
      .eq("id", postId)
      .single();

    if (error || !post || !post.uploader_uid) return;

    const user = firebase.auth().currentUser;
    if (!user) return;

    // ❌ apne hi video pe comment → no notification
    if (post.uploader_uid === user.uid) return;

    const notifRef = firebase.database()
      .ref(`notifications/${post.uploader_uid}`)
      .push();

    await notifRef.set({
      from: user.displayName || "User",
      fromUid: user.uid,
      postId: postId,
      thumb: post.thumb_url || "dp.jpg",
      commentText: commentText,

      text: `${user.displayName || "User"} commented on your video`,
      profileImage: user.photoURL || "dp.jpg",
      verified: user.emailVerified || false,
      type: "comment",
      read: false,
      timestamp: Date.now()
    });

    

  } catch (err) {
    console.error("🔥 sendCommentNotification error:", err);
  }
};


// ----------------------
// 🌐 GUEST BROWSER ID
// ----------------------
function getBrowserId() {
  let id = localStorage.getItem("browser_id");
  if (!id) {
    id = "browser_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("browser_id", id);
  }
  return id;
}
function hasViewed(postId) {
  return sessionStorage.getItem("viewed_" + postId) === "1";
}

function markViewed(postId) {
  sessionStorage.setItem("viewed_" + postId, "1");
}


// ----------------------
// MAIN DOM LOADED
// ----------------------
document.addEventListener("DOMContentLoaded", async () => {
    const SUPABASE_URL = "https://lxbojhmvcauiuxahjwzk.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Ym9qaG12Y2F1aXV4YWhqd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzM3NjEsImV4cCI6MjA4MDUwOTc2MX0.xP1QCzWIwnWFZArsk_5C8wCz7vkPrmwmLJkEThT74JA";

    window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const main = document.querySelector(".main-content");
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");
    const relatedVideos = document.getElementById("relatedVideos");
    const closeBtn = document.querySelector(".closeBtn");
    const searchVideoInput = document.getElementById("searchVideoInput");
    const filterBtns = document.querySelectorAll(".filter-btn");

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {

    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    currentFilter = btn.dataset.filter;
    applyFilters();
  });
  
});


    if (!main) return;


    

    // ----------------
    // FETCH POSTS
    // ----------------
    try {
        isLoading = true;
dataReady = false;
showSkeletons(8);

const { data, error } = await supabaseClient
  .from("pinora823")
  .select("*")
  .order("created_at", { ascending: false });

if (error) throw error;

allPosts = data || [];

if(allPosts.length > 0){
  dataReady = true;
  isLoading = false;
  applyFilters(); // 🔥 yahin se render start
}



    } 
    catch (err) {
  console.error("Error fetching posts:", err);
  isLoading = true;
  showSkeletons(6);
}

// ----------------------
// 👁️ REAL VIEW COUNT LOGIC
// ----------------------
// ----------------------
// 👁️ REAL VIEW COUNT
// ----------------------
async function countView(postId) {

  // ❌ already viewed in this session → STOP
  if (hasViewed(postId)) return;

  const user = firebase.auth().currentUser;
  const viewsRef = firebase.database().ref(`videoViews/${postId}`);

  try {
    if (user) {
      const userRef = viewsRef.child(`users/${user.uid}`);
      const snap = await userRef.get();

      if (!snap.exists()) {
        await userRef.set(true);
        await incrementSupabaseViews(postId);
        markViewed(postId); // ✅ mark
      }

    } else {
      const browserId = getBrowserId();
      const browserRef = viewsRef.child(`browsers/${browserId}`);
      const snap = await browserRef.get();

      if (!snap.exists()) {
        await browserRef.set(true);
        await incrementSupabaseViews(postId);
        markViewed(postId); // ✅ mark
      }
    }
  } catch (err) {
    console.error("Count view error:", err);
  }
}

// ----------------------
// ➕ INCREMENT SUPABASE VIEWS
// ----------------------
async function incrementSupabaseViews(postId) {
  try {
    const { data, error } = await supabaseClient
      .from("pinora823")
      .select("views")
      .eq("id", postId)
      .single();

   

    if (error || !data) {
      console.error("Fetch views error:", error);
      return;
    }

    const newViews = Number(data.views || 0) + 1;

    const { error: updateError } = await supabaseClient
      .from("pinora823")
      .update({ views: newViews })
      .eq("id", postId);

    if (updateError) {
      console.error("UPDATE ERROR:", updateError);
    } else {
      
    }

  } catch (err) {
    console.error("Increment views error:", err);
  }
}


    // ----------------
    // SEARCH
    // ----------------
    searchVideoInput.addEventListener("input", () => {
      if(!dataReady){
  showSkeletons(8);
  return;
}

  const query = searchVideoInput.value.toLowerCase().trim();
  if (!query) return displayVideos(allPosts);

  const aiResults = [];
  const titleResults = [];
  const added = new Set();

  allPosts.forEach(post => {
    const tags = normalizeTags(post.content_tags);
    const aiMatch = tags.some(tag => tag.includes(query));

    if (aiMatch) {
      aiResults.push(post);
      added.add(post.id);
    }
  });

  allPosts.forEach(post => {
    if (added.has(post.id)) return;

    const titleMatch = post.title &&
      post.title.toLowerCase().includes(query);

    if (titleMatch) {
      titleResults.push(post);
    }
  });

  const finalResults = [...aiResults, ...titleResults];
  displayVideos(finalResults);
});




function getSmartRelated(currentPost, allPosts) {

  const stopWords = ["the","is","are","of","to","a","an","and","or","in","on","for","with"];

  const currentTags = normalizeTags(currentPost.content_tags);

  const titleWords = currentPost.title
    ? currentPost.title.toLowerCase()
        .split(" ")
        .filter(w => w.length > 2 && !stopWords.includes(w))
    : [];

  const aiMatches = [];
  const titleMatches = [];
  const added = new Set();

  // 🥇 AI TAG MATCH FIRST
  allPosts.forEach(post => {
    if (post.id === currentPost.id) return;

    const tags = normalizeTags(post.content_tags);
    const matchScore = tags.filter(t => currentTags.includes(t)).length;

    if (matchScore > 0) {
      aiMatches.push({ ...post, score: matchScore });
      added.add(post.id);
    }
  });

  aiMatches.sort((a,b) => b.score - a.score); // best match first

  // 🥈 TITLE MATCH SECOND
  allPosts.forEach(post => {
    if (post.id === currentPost.id || added.has(post.id)) return;
    if (!post.title) return;

    const postTitle = post.title.toLowerCase();
    const match = titleWords.some(w => postTitle.includes(w));

    if (match) titleMatches.push(post);
  });

  return [...aiMatches, ...titleMatches];
}



    // ----------------
    // DISPLAY VIDEOS
    // ----------------
    function displayVideos(posts) {
    if(!dataReady){
        showSkeletons(8);
        return;
    }

    if (!posts || posts.length === 0) {
        main.innerHTML = "<p>No videos found.</p>";
        return;
    }

    // agar first batch hai → screen clear karo aur displayedPosts reset karo
    if(batchIndex === 0){
        main.innerHTML = "";
        displayedPosts = [];
    }

    // batch logic
    const start = batchIndex * batchSize;
    const end = start + batchSize;
    const batch = posts.slice(start, end);

    // sirf unique videos render karo (already displayed wale skip karo)
    const uniqueBatch = batch.filter(p => !displayedPosts.includes(p.id));

    // displayedPosts update karo
    displayedPosts = [...displayedPosts, ...uniqueBatch.map(p => p.id)];

    // next batch ke liye increment
    batchIndex++;

    const postsToRender = uniqueBatch;

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    postsToRender.forEach(post => {

        const box = document.createElement("div");
        box.classList.add("pin-box");

        const mediaContainer = document.createElement("div");
        mediaContainer.className = "mediaContainer";

        // SKELETON FIRST
        const skeleton = document.createElement("div");
        skeleton.className = "skeleton skeleton-video";
        mediaContainer.appendChild(skeleton);

        // OVERLAY
        const overlay = document.createElement("div");
        overlay.className = "uploaderOverlay";
        overlay.style.display = "none"; // hide overlay until media loads

        const verified = post.uploader_verified === true 
            || post.uploader_verified === 'true' 
            || post.uploader_verified === 1 
            || post.uploader_verified === '1';

        const badgeHTML = verified 
            ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:16px; height:16px;">` 
            : '';

        overlay.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px; width:100%;">
                <img src="${post.uploader_image ? post.uploader_image + '?t=' + Date.now() : 'dp.jpg'}" class="uploaderDP" alt="uploader">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="uploaderName">${post.uploader_name || 'Unknown'}</span>
                    ${badgeHTML}
                </div>
            </div>
        `;

        const uploaderImg = overlay.querySelector(".uploaderDP");
        uploaderImg.addEventListener("load", () => {
            uploaderImg.classList.add("loaded");  // fade-in effect ke liye
        });

        const uploaderDiv = overlay.querySelector('div');
        if (uploaderDiv) {
            uploaderDiv.style.cursor = "pointer";
            uploaderDiv.addEventListener("click", (e) => {
                e.stopPropagation();
                if (post.uploader_uid) {
                    window.location.href = `user.html?uid=${post.uploader_uid}`;
                }
            });
        }

    mediaContainer.appendChild(overlay);

    // VIEWS
    const viewsOverlay = document.createElement("div");
    viewsOverlay.className = "viewsOverlay";
    viewsOverlay.innerHTML = `
        <i class="fa-regular fa-eye"></i>
        <span class="viewCount">${formatViews(post.views)}</span>

    `;
    mediaContainer.appendChild(viewsOverlay);

    // MEDIA
    let media;
    if (post.file_type.startsWith("video") && isMobile) {
        media = document.createElement("img");
        media.src = post.thumb_url || "dp.jpg";
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

    // ✅ Wait for media to load before removing skeleton and showing overlay
    media.addEventListener("loadeddata", () => {
        skeleton.remove();       // remove skeleton
        overlay.style.display = "flex"; // show overlay/profile image
    });

    media.addEventListener("load", () => {
        skeleton.remove();
        overlay.style.display = "flex";
    });

    // MEDIA CLICK → OPEN MODAL
    media.addEventListener("click", () => {
      // hide media first
modalVideo.style.display = "none";
modalImage.style.display = "none";

// remove old skeleton if exists
const oldSkeleton = document.querySelector(".modal-skeleton-overlay");
if (oldSkeleton) oldSkeleton.remove();

// 🔹 MODAL 9:16 SKELETON
const modalSkeleton = document.createElement("div");
modalSkeleton.className = "modal-skeleton-overlay";
modalSkeleton.style.width = "100%";
modalSkeleton.style.aspectRatio = "9/16";  // 9:16 ratio
modalSkeleton.style.background = "#111";
modalSkeleton.style.borderRadius = "12px";
modalSkeleton.style.marginBottom = "10px";

// append to modal media wrapper
modal.querySelector(".modal-media-wrapper").appendChild(modalSkeleton);



        currentPostId = post.id;
        updateCommentCount();
        loadLikes(post.id);
        countView(post.id);

        if (post.file_type.startsWith("video")) {
          // remove old skeleton if exists
const oldSkeleton = document.querySelector(".modal-skeleton-overlay");
if (oldSkeleton) oldSkeleton.remove();

// 🔹 MODAL 9:16 SKELETON
const modalSkeleton = document.createElement("div");
modalSkeleton.className = "modal-skeleton-overlay";
modalSkeleton.style.width = "100%";
modalSkeleton.style.aspectRatio = "9/16";  // 9:16 ratio
modalSkeleton.style.background = "#111";
modalSkeleton.style.borderRadius = "12px";
modalSkeleton.style.marginBottom = "10px";

// append to modal media wrapper
modal.querySelector(".modal-media-wrapper").appendChild(modalSkeleton);

            modalVideo.src = post.file_url;
            modalVideo.addEventListener("loadeddata", () => {
    const s = document.querySelector(".modal-skeleton-overlay");
    if (s) s.remove();
    modalVideo.style.display = "block";
}, { once: true });

            modalVideo.style.display = "block";
            modalImage.style.display = "none";
            modalVideo.controls = false;
        } else {
            modalImage.src = post.file_url;
            modalImage.style.display = "block";
            modalVideo.style.display = "none";
        }

        // MODAL TITLE
        modalTitle.innerHTML = `
            ${post.title || ""}
            <div class="modalUploader" style="display:flex; align-items:center; gap:5px;">
                <img src="${post.uploader_image ? post.uploader_image + '?t=' + Date.now() : 'dp.jpg'}" class="modalUploaderDP">
                <span>${post.uploader_name || "Unknown"}</span>
                ${badgeHTML}
            </div>
        `;

        const modalUploader = modalTitle.querySelector(".modalUploader");
        if (modalUploader) {
            modalUploader.style.cursor = "pointer";
            modalUploader.addEventListener("click", () => {
                const uploaderUid = post.uploader_uid;
                if (uploaderUid) {
                    window.location.href = `user.html?uid=${uploaderUid}`;
                }
            });
        }

        const modalViewCount = document.getElementById("modalViewCount");
        if (modalViewCount) modalViewCount.textContent = formatViews(post.views);


        modal.classList.remove("hidden");
    

                // ----------------
                // RELATED VIDEOS
                // ----------------
                relatedVideos.innerHTML = "";


// ----------------------
// Related video box create karne ka function
// ----------------------
function createRelatedVideoBox(post) {
    const wrap = document.createElement("div");
    wrap.className = "relatedBox";

    const verified = post.uploader_verified === true ||
                     post.uploader_verified === "true" ||
                     post.uploader_verified === 1 ||
                     post.uploader_verified === "1";

    const badgeHTML = verified
        ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg"
               style="width:12px; height:12px; margin-left:4px;">`
        : '';

    wrap.innerHTML = `
        <div class="relatedThumb">
            <img src="${post.thumb_url || post.file_url || 'default_thumb.jpg'}" class="relatedVideoThumb">
            <div class="uploaderHeaderSmall">
                <img src="${post.uploader_image || 'dp.jpg'}" class="smallDP">
                <span class="smallName">${post.uploader_name || "User"}</span>
                ${badgeHTML}
            </div>
        </div>
    `;

    // Uploader click → user page
    const uploaderSmall = wrap.querySelector(".uploaderHeaderSmall");
    if (uploaderSmall) {
        uploaderSmall.style.cursor = "pointer";
        uploaderSmall.addEventListener("click", (e) => {
            e.stopPropagation();
            if (post.uploader_uid) {
                window.location.href = `user.html?uid=${post.uploader_uid}`;
            }
        });
    }

    // Video click → modal update
    wrap.addEventListener("click", () => {
        currentPostId = post.id;
        updateCommentCount();
        loadLikes(post.id);

        if (post.file_type.startsWith("video")) {
          
    modalVideo.src = post.file_url;

    modalVideo.addEventListener("loadeddata", () => {
        const s = document.querySelector(".modal-skeleton-overlay");
        if (s) s.remove();
        modalVideo.style.display = "block";
    }, { once: true });

    modalImage.style.display = "none";
    modalVideo.controls = false;
} else {
    modalImage.src = post.file_url;

    modalImage.addEventListener("load", () => {
        const s = document.querySelector(".modal-skeleton-overlay");
        if (s) s.remove();
        modalImage.style.display = "block";
    }, { once: true });

    modalVideo.style.display = "none";
}


        // Modal title
        modalTitle.innerHTML = `
            ${post.title || ""}
            <div class="modalUploader" style="display:flex; align-items:center; gap:5px;">
                <img src="${post.uploader_image || 'dp.jpg'}" class="modalUploaderDP">
                <span>${post.uploader_name || "Unknown"}</span>
                ${badgeHTML}
            </div>
        `;

        // ✅ Naya related videos calculate karo
        const newRelated = getSmartRelated(post, allPosts);
        relatedVideos.innerHTML = ""; // purane clear karo
        newRelated.forEach(r => createRelatedVideoBox(r)); // nayi related videos add karo
const modalContent = modal.querySelector(".modal-content"); // modal-content आपका scrollable div
if(modalContent) modalContent.scrollTop = 0;

        modal.classList.remove("hidden");
        
    });

    relatedVideos.appendChild(wrap);
}

// ----------------------
// Main video click ya first modal open ke liye related videos
// ----------------------
const finalRelated = getSmartRelated(post, allPosts);
relatedVideos.innerHTML = ""; // purane clear karo
finalRelated.forEach(r => createRelatedVideoBox(r));




                // ----------------
                // CUSTOM CONTROLS
                // ----------------
              if (!document.querySelector(".custom-controls")) {

    const customControls = document.createElement("div");
    customControls.className = "custom-controls";
    customControls.innerHTML = `
        <button id="playPauseBtn" class="playPauseBtn">
            <i class="fa-solid fa-play"></i>
        </button>

        <input type="range" id="seekBar" value="0" min="0" max="100">

        <div class="timeRow">
            <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
        </div>
    `;

    modal.querySelector(".modal-media-wrapper").appendChild(customControls);

    const playPauseBtn = document.getElementById("playPauseBtn");
    const seekBar = document.getElementById("seekBar");
    const currentTime = document.getElementById("currentTime");
    const duration = document.getElementById("duration");
    const playPauseIcon = playPauseBtn.querySelector("i");

    // 🔁 TOGGLE FUNCTION
    function togglePlayPause() {
        if (modalVideo.paused) {
            modalVideo.play();
            playPauseIcon.className = "fa-solid fa-pause";
        } else {
            modalVideo.pause();
            playPauseIcon.className = "fa-solid fa-play";
        }
    }

    // ▶️⏸ BUTTON CLICK
    playPauseBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // video click se conflict na ho
        togglePlayPause();
    });

    // 👆 VIDEO CLICK ANYWHERE
    modalVideo.addEventListener("click", togglePlayPause);

    // 👁 ICON AUTO SHOW / HIDE
    modalVideo.addEventListener("play", () => {
        playPauseBtn.style.opacity = "0";
    });

    modalVideo.addEventListener("pause", () => {
        playPauseBtn.style.opacity = "1";
    });



                    modalVideo.addEventListener("timeupdate", () => {
                        const value = (modalVideo.currentTime / modalVideo.duration) * 100;
                        seekBar.value = value;
                        currentTime.textContent = formatTime(modalVideo.currentTime);
                    });

                    modalVideo.addEventListener("loadedmetadata", () => {
                        duration.textContent = formatTime(modalVideo.duration);
                    });

                    seekBar.addEventListener("input", () => {
                        modalVideo.currentTime = (seekBar.value / 100) * modalVideo.duration;
                    });

                    function formatTime(seconds) {
                        const mins = Math.floor(seconds / 60);
                        const secs = Math.floor(seconds % 60);
                        return `${mins}:${secs < 10 ? "0" + secs : secs}`;
                    }
                }

            });

            mediaContainer.appendChild(media);
            box.appendChild(mediaContainer);
            main.appendChild(box);
        });
    }

    // ----------------
    // CLOSE MODAL
    // ----------------
    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
        modalVideo.pause();
    });




    // Navigation
    document.getElementById("btnHome")?.addEventListener("click", () => location.href = "main.html");
    document.getElementById("btnSearch")?.addEventListener("click", () => location.href = "search.html");
    document.getElementById("btnProfile")?.addEventListener("click", () => location.href = "profile.html");
    document.getElementById("btnUpload")?.addEventListener("click", () => location.href = "upload.html");
     
      document.getElementById("btnNotifs")?.addEventListener("click", () => location.href = "notification.html");

     function applyFilters() {
      batchIndex = 0;
displayedPosts = [];

if(!dataReady || isLoading) return;

  if(!dataReady){
    showSkeletons(8);
    return;
  }


  if(isLoading) return;   // ⛔ jab tak loading true, filter mat chalao

  let filtered = [...allPosts];


 if (currentFilter === "all") {
  let feed = smartShuffle(filtered);
  feed = personalizeFeed(feed);   // 🧠 USER INTEREST APPLY
  displayVideos(feed);
  return;
}


  if (currentFilter === "following") {
    filtered = filtered.filter(p =>
      followingList.includes(p.uploader_uid)
    );
    displayVideos(filtered);
    return;
  }

  if (currentFilter === "verified") {
    filtered = filtered.filter(p =>
      p.uploader_verified == true ||
      p.uploader_verified == "true" ||
      p.uploader_verified == 1 ||
      p.uploader_verified == "1"
    );
    displayVideos(filtered);
    return;
  }

  if (currentFilter === "popular") {
    filtered = filtered
      .sort((a,b) => (b.views||0) - (a.views||0))
      .slice(0,40);
    displayVideos(filtered);
  }
}
window.addEventListener("scroll", () => {
    if(isLoading || !dataReady) return;

    if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        // scroll bottom ke kareeb → next batch load
        if(batchIndex * batchSize >= allPosts.length) return; // koi aur nahi
        displayVideos(allPosts);
    }
});

});

// ----------------------
// 🔴 RED DOT NOTIFICATION LOGIC
// ----------------------
const notifDot = document.getElementById("notifDot");
const notifBtn = document.getElementById("btnNotifs");

firebase.auth().onAuthStateChanged(user => {
  if (!user || !notifDot) return;

  const uid = user.uid;
  const ref = firebase.database().ref(`notifications/${uid}`);

  ref.on("value", snap => {
    let unread = 0;

    snap.forEach(child => {
      const n = child.val();
      if (n && n.read === false) unread++;
    });

    if (unread > 0) {
      notifDot.style.display = "inline-block";
      notifDot.innerText = unread > 99 ? "99+" : unread;
    } else {
      notifDot.style.display = "none";  // 0 notifications → hide
      notifDot.innerText = "";           // ensure no 0 shows
    }
      firebase.database()
    .ref(`following/${user.uid}`)
    .once("value")
    .then(snap => {
      if (snap.exists()) {
        followingList = Object.keys(snap.val());
      }
    });

  });
});

notifBtn.addEventListener("click", () => {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const ref = firebase.database().ref(`notifications/${user.uid}`);

  ref.once("value", snap => {
    snap.forEach(child => {
      if (child.val().read === false) {
        ref.child(child.key).update({ read:true });
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
// =======================
// 🔐 CHAT BUTTON LOCK ICON
// =======================
const chatLock = document.createElement("div");
chatLock.innerHTML = `<i class="fa-solid fa-lock"></i>`;
chatLock.id = "chatLock";

chatLock.style.cssText = `
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  background:rgba(0,0,0,0.5);
  color:white;
  
  font-size:18px;
  border-radius:50%;
  cursor:pointer;
  display:none;
  z-index:2000;
`;

btnMessage.style.position = "fixed";
btnMessage.appendChild(chatLock);

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
// =======================
// 🎥 CHECK USER VIDEO COUNT (FOR CHAT LOCK)
// =======================
async function checkChatButtonLock() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const { data, error } = await supabaseClient
    .from("pinora823")
    .select("id")
    .eq("uploader_uid", user.uid);

  if (error) {
    console.log("video count error", error);
    return;
  }

  const videoCount = data.length;

  if (videoCount < 2) {
    // 🔒 LOCK
    chatLock.style.display = "flex";

   

  } else {
    // 🔓 UNLOCK
    chatLock.style.display = "none";
  }
}

firebase.auth().onAuthStateChanged(user => {
  
  if (!user) return;
  checkChatButtonLock();

  const uid = user.uid;

  const chatsRef = firebase.database().ref("chats");

  const updateUnreadCount = () => {
  chatsRef.once("value", snapshot => {
    const chats = snapshot.val();
    if (!chats) {
      messageCount.style.display = "none";
      return;
    }

    const uniqueSenders = new Set(); // 🔥 IMPORTANT

    Object.keys(chats).forEach(chatId => {
      if (!chatId.includes(uid)) return;

      const messages = chats[chatId];
      Object.keys(messages).forEach(msgId => {
        const msg = messages[msgId];

        // ❗ sirf unread + dusra banda
        if (msg.sender !== uid && !msg.read) {
          uniqueSenders.add(msg.sender); // 👈 same sender count 1 hi
        }
      });
    });

    const unread = uniqueSenders.size;

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
  if (chatLock.style.display === "flex") {
    showCustomAlert("Upload 2 videos to unlock the chat");
    return;
  }
  window.location.href = "chat.html";
};




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
      card.querySelector(".smallDP").src = video.uploader_image || "dp.jpg";
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
            <img src="${video.uploader_image || 'dp.jpg'}" class="modalUploaderDP">
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

let liked = false;
let rawLikeCount = 0;

// ⚠️ yahan direct element mat lo (modal ke bahar crash hota hai)
let likeBtn = null;
let likeCount = null;

// 🔹 Load likes when modal opens
async function loadLikes(postId) {
  currentPostId = postId;
  liked = false;

  // 🔹 modal ke andar se elements lo (SAFE)
  likeBtn = document.getElementById("likeBtn");
  likeCount = document.getElementById("likeCount");

  if (!likeBtn || !likeCount) return; // ⛔ safety

  const user = firebase.auth().currentUser;
  const browserId = getBrowserId();

  const likeRef = firebase.database().ref(`videoLikes/${postId}`);
  const snap = await likeRef.get();

  let count = 0;

  if (snap.exists()) {
    const data = snap.val();
    count = data.count || 0;
rawLikeCount = count;

    if (user && data.users?.[user.uid]) liked = true;
    if (!user && data.users?.[browserId]) liked = true;
  }

  likeCount.textContent = formatViews(count);

  updateLikeUI();
  attachLikeListener(); // 👈 listener yahin attach hoga
}

// 🔹 UI update
function updateLikeUI() {
  if (!likeBtn || !likeCount) return;

  likeBtn.innerHTML = liked
    ? `<i class="fa-solid fa-heart"></i> <span id="likeCount">${likeCount.textContent}</span>`
    : `<i class="fa-regular fa-heart"></i> <span id="likeCount">${likeCount.textContent}</span>`;

  likeBtn.classList.toggle("liked", liked);

  // ❤️ bounce animation
  likeBtn.classList.remove("bounce");
  void likeBtn.offsetWidth; // reflow trick
  likeBtn.classList.add("bounce");

  likeCount = document.getElementById("likeCount");
}


// 🔹 Like / Unlike (SAFE attach)
function attachLikeListener() {
  if (!likeBtn) return;

  likeBtn.onclick = async () => {
    if (!currentPostId) return;

    // ⏳ START shimmer
    likeBtn.classList.add("loading");

    const user = firebase.auth().currentUser;
    const browserId = getBrowserId();
    const userKey = user ? user.uid : browserId;

    const postRef = firebase.database().ref(`videoLikes/${currentPostId}`);
    const userLikeRef = postRef.child(`users/${userKey}`);
    const countRef = postRef.child("count");

    const prevLiked = liked;
    const prevCount = rawLikeCount;


    // ⚡ instant UI
    liked = !prevLiked;
    rawLikeCount = Math.max(prevCount + (liked ? 1 : -1), 0);
likeCount.textContent = formatViews(rawLikeCount);

    updateLikeUI();

    try {
      if (!prevLiked) {
        await userLikeRef.set(true);
        await countRef.transaction(c => (c || 0) + 1);
        updateUserInterest(currentPostId);

         sendLikeNotification(currentPostId);
      } else {
        await userLikeRef.remove();
        await countRef.transaction(c => Math.max((c || 1) - 1, 0));
      }
    } catch (err) {
      console.error(err);

      // ❌ revert UI
      liked = prevLiked;
      rawLikeCount = prevCount;
likeCount.textContent = formatViews(rawLikeCount);

      updateLikeUI();
    } finally {
      // ✅ STOP shimmer (YAHAN PROBLEM THI)
      likeBtn.classList.remove("loading");
    }
  };
}

let lastTap = 0;
const doubleTapHeart = document.getElementById("doubleTapHeart");

modalVideo.addEventListener("click", () => {
  const now = Date.now();

  if (now - lastTap < 300) {
    // 💥 DOUBLE TAP
    if (!liked) {
      likeBtn.click(); // ✅ safe way
    }

    // ❤️ heart animation
    doubleTapHeart.classList.remove("show");
    void doubleTapHeart.offsetWidth;
    doubleTapHeart.classList.add("show");
  }

  lastTap = now;
});



// ----------------------
// COMMENT ELEMENTS
// ----------------------
const commentBtn = document.getElementById("commentBtn");
const commentInput = document.getElementById("commentInput");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentCountEl = document.getElementById("commentCount");
const commentModal = document.getElementById("commentModal");
const closeCommentModal = document.querySelector(".closeCommentModal");
const allCommentsList = document.getElementById("allCommentsList");

let currentPostId = "sampleVideo123"; // example video id

// ----------------------
// CUSTOM ALERT
// ----------------------
function showCustomAlert(msg) {
    const alertBox = document.createElement("div");
    alertBox.classList.add("custom-alert");
    alertBox.innerText = msg;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 2500);
}

// ----------------------
// LOAD COMMENT COUNT FAST
// ----------------------
async function updateCommentCount() {
    const snapshot = await firebase.database().ref(`videoComments/${currentPostId}`).once("value");
    const comments = snapshot.val() || {};
    commentCountEl.textContent = formatViews(Object.keys(comments).length);

}

// ----------------------
// LOAD ALL COMMENTS FOR MODAL
// ----------------------
async function loadAllComments() {
    allCommentsList.innerHTML = "";
    const snapshot = await firebase.database().ref(`videoComments/${currentPostId}`).once("value");
    const comments = snapshot.val() || {};

    Object.values(comments).forEach(c => {
        const div = document.createElement("div");
        div.classList.add("comment-item");
        div.innerHTML = `
            <img src="${c.profileImage}" alt="dp">
            <span class="username">${c.username}:</span>
            <span class="text">${c.text}</span>
        `;
        allCommentsList.appendChild(div);
    });

    // scroll to bottom
    allCommentsList.scrollTop = allCommentsList.scrollHeight;

    // Update count fast
   commentCountEl.textContent = formatViews(Object.keys(comments).length);

}

// ----------------------
// COMMENT BUTTON CLICK
// ----------------------
commentBtn.addEventListener("click", async () => {
    await loadAllComments();
    commentModal.classList.remove("hidden");
});

// ----------------------
// CLOSE MODAL
// ----------------------
closeCommentModal.addEventListener("click", () => {
    commentModal.classList.add("hidden");
});
commentModal.addEventListener("click", (e) => {
    if (e.target === commentModal) commentModal.classList.add("hidden");
});

// ----------------------
// COMMENT INPUT CLICK (LOGIN CHECK)
// ----------------------
commentInput.addEventListener("focus", () => {
    const user = firebase.auth().currentUser;
    if (!user) {
        commentInput.blur(); // prevent typing
        showCustomAlert("Please login first to comment!");
    }
});

// ----------------------
// SEND COMMENT
// ----------------------
sendCommentBtn.addEventListener("click", sendComment);
commentInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendComment();
});

async function sendComment() {
    const text = commentInput.value.trim();
    const user = firebase.auth().currentUser;

    if (!user) {
        showCustomAlert("Please login first to comment!");
        return;
    }

    if (!text || !currentPostId) return;

    const uid = user.uid;
    const username = user.displayName || "Anonymous";
    const profileImage = user.photoURL || "dp.jpg";

    const commentRef = firebase.database().ref(`videoComments/${currentPostId}`).push();
    await commentRef.set({
        uid,
        username,
        profileImage,
        text,
        timestamp: Date.now()
    });
 // 🔔 YAHI ADD KARNA HAI
    sendCommentNotification(currentPostId, text);
    commentInput.value = "";
    await loadAllComments(); // reload comments and update count
}

// ----------------------
// INITIAL LOAD
// ----------------------
window.addEventListener("load", async () => {
    await updateCommentCount(); // fast comment count on load
});
// ----------------------
// SHARE BUTTON
// ----------------------
const shareBtn = document.getElementById("shareBtn");
const shareMenu = document.getElementById("shareMenu");
const linkCopied = document.getElementById("linkCopied");

shareBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent menu close on button click
    shareMenu.classList.toggle("hidden");
});

// Close menu when clicking outside
document.addEventListener("click", () => {
    shareMenu.classList.add("hidden");
});

// Share options click

shareMenu.querySelectorAll(".shareOption").forEach(btn => {
    btn.addEventListener("click", () => {
        const platform = btn.dataset.platform;
        const uniqueLink = `${window.location.origin}${window.location.pathname}?video=${currentPostId}`;
        const text = encodeURIComponent(uniqueLink);

        if (platform === "whatsapp") {
            window.open(`https://wa.me/?text=${text}`, "_blank");
        } 
        else if (platform === "telegram") {
            window.open(`https://t.me/share/url?url=${encodeURIComponent(uniqueLink)}&text=${text}`, "_blank");
        } 
        else if (platform === "copy") {
            navigator.clipboard.writeText(uniqueLink).then(() => {

                // Sirf show / hide – koi CSS positioning nahi
                linkCopied.classList.remove("hidden");
                linkCopied.classList.add("show");

                setTimeout(() => {
                    linkCopied.classList.remove("show");
                    linkCopied.classList.add("hidden");
                }, 1200);
            });
        }

        shareMenu.classList.add("hidden");
    });
});




// ----------------------
// PAGE LOAD VIDEO MODAL FROM LINK
// ----------------------





const downloadBtn = document.getElementById("downloadBtn");
const progressOverlay = document.getElementById("downloadProgressOverlay");
const progressCircleFill = document.getElementById("progressCircleFill");
const progressPercent = document.getElementById("progressPercent");

downloadBtn.addEventListener("click", async () => {

    if (!currentPostId) return;

    const user = firebase.auth().currentUser;

    // ❌ Guest user
    if (!user) {
        document.getElementById("loginPopup").classList.remove("hidden");
        return;
    }

    const coins = await getUserCoins();

    // ❌ Not enough coins
    if (coins < 5) {
        document.getElementById("noCoinsPopup").classList.remove("hidden");
        return;
    }

    // 🪙 Cut 5 coins first
    await updateUserCoins(-5);

    try {
        const { data: post, error } = await supabaseClient
            .from("pinora823")
            .select("title, file_url")
            .eq("id", currentPostId)
            .single();

        if (error || !post) return;

        const videoUrl = post.file_url;
        let titleText = post.title || "Video";
        titleText = titleText.replace(/[\\/:"*?<>|]+/g, '');
        const fileName = `${titleText} - Pinora Web.mp4`;

        progressOverlay.style.display = "flex";
        progressPercent.textContent = "0%";
        progressCircleFill.style.strokeDashoffset = 226.2;

        const response = await fetch(videoUrl);
        const reader = response.body.getReader();
        const contentLength = +response.headers.get("Content-Length");

        let receivedLength = 0;
        const chunks = [];

        while(true){
            const { done, value } = await reader.read();
            if(done) break;

            chunks.push(value);
            receivedLength += value.length;

            const progress = (receivedLength / contentLength) * 100;
            const offset = 226.2 * (1 - progress / 100);
            progressCircleFill.style.strokeDashoffset = offset;
            progressPercent.textContent = `${progress.toFixed(0)}%`;
        }

        const blob = new Blob(chunks);
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(blobUrl);
updateUserInterest(currentPostId);   // 🔥 USER INTEREST

        setTimeout(() => {
            progressOverlay.style.display = "none";
        }, 800);

    } catch(err){
        console.error("Download failed:", err);
        progressOverlay.style.display = "none";
    }
});

firebase.auth().onAuthStateChanged(user => {
  if (!user) return;

  const uid = user.uid;
  const ref = firebase.database().ref(`deletedNotifications/${uid}`);

  ref.once("value", snap => {
    if (!snap.exists()) return;

    snap.forEach(child => {
      const data = child.val();

      // 🚩 sirf ek baar
      if (data.shown === false) {
        showFlagPopup();
        ref.child(child.key).update({ shown: true });
        return true;
      }
    });
  });
});

function showFlagPopup() {
  document.getElementById("flagPopup").classList.remove("hidden");
}

function closeFlagPopup() {
  document.getElementById("flagPopup").classList.add("hidden");
}
// ===============================
// 🪙 LOGIN BASED COIN SYSTEM (WITH LOADING ...)
// ===============================
const creditText = document.getElementById("creditText");
const creditBox = document.getElementById("creditBox");

// default loading
if (creditText) creditText.innerText = "...";

function userCoinRef(uid){
    return firebase.database().ref(`userCoins/${uid}`);
}

firebase.auth().onAuthStateChanged(async user => {

    if (!creditText || !creditBox) return;

    // ⏳ jab tak auth check ho raha hai – keep "..."
    creditText.innerText = "...";

    // thoda delay smooth feel ke liye
    setTimeout(async () => {

        if (!user) {
            creditText.innerText = "Please login";
            creditBox.classList.add("guest");
            return;
        }

        creditBox.classList.remove("guest");

        const ref = userCoinRef(user.uid);
        const snap = await ref.once("value");

        // 🆕 first time login
        if (!snap.exists()) {
            await ref.set(40);
            creditText.innerText = "40";
        } else {
            creditText.innerText = snap.val();
        }

        // 🔁 realtime update
        ref.on("value", s => {
            if (s.exists()) creditText.innerText = s.val();
        });

    }, 600); // smooth loading dots time
});
async function updateUserInterest(postId) {
  const user = firebase.auth().currentUser;
  if(!user) return;

  const { data: post } = await supabaseClient
    .from("pinora823")
    .select("content_tags")
    .eq("id", postId)
    .single();

  if(!post || !post.content_tags) return;

  const tags = normalizeTags(post.content_tags);
  const ref = firebase.database().ref(`userInterest/${user.uid}`);

  tags.forEach(tag => {
    ref.child(tag).transaction(c => (c || 0) + 1);
  });
}

// update coins function
async function updateUserCoins(amount){
    const user = firebase.auth().currentUser;
    if (!user) return;

    const ref = userCoinRef(user.uid);

    await ref.transaction(c => {
        c = Number(c || 0);
        c += amount;
        if (c < 0) c = 0;
        return c;
    });
}
// 🎉 Show reward popup after upload
window.addEventListener("load", () => {
    const reward = localStorage.getItem("uploadReward");

    if (reward) {
        const popup = document.getElementById("rewardPopup");
        const closeBtn = document.getElementById("closeRewardPopup");

        popup.classList.remove("hidden");

        closeBtn.onclick = () => {
            popup.classList.add("hidden");
            localStorage.removeItem("uploadReward");
        };
    }
});
function closeLoginPopup(){
  document.getElementById("loginPopup").classList.add("hidden");
}

function closeNoCoinsPopup(){
  document.getElementById("noCoinsPopup").classList.add("hidden");
  window.location.href = "upload.html";
}
async function getUserCoins(){
  const user = firebase.auth().currentUser;
  if (!user) return null;

  const snap = await firebase.database().ref(`userCoins/${user.uid}`).once("value");
  return Number(snap.val() || 0);
}
firebase.auth().onAuthStateChanged(user=>{
  if(!user){
    userInterest = {};
    return;
  }

  const uid = user.uid;

  // 🧠 user interest listener (SIRF EK JAGAH)
  firebase.database()
    .ref(`userInterest/${uid}`)
    .on("value", snap => {
      userInterest = snap.val() || {};
    });

  const creditBox = document.getElementById("creditBox");
  if(!creditBox) return;

  const oldBtn = document.querySelector(".addCoinBtn");
  if(oldBtn) oldBtn.remove();

  const plus = document.createElement("i");
  plus.className = "fa-solid fa-plus addCoinBtn";
  creditBox.appendChild(plus);

  plus.addEventListener("click",()=>{
    document.getElementById("coinPurchasePopup").classList.remove("hidden");
  });
});



function closeCoinPopup(){
  document.getElementById("coinPurchasePopup").classList.add("hidden");
}
function smartShuffle(posts){
  if(!posts || posts.length < 10) return posts;

  const head = posts.slice(0, 30);   // 🔥 sirf top 30 latest
  const tail = posts.slice(30);      // purane same order me

  // Fisher-Yates shuffle
  for(let i = head.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }

  return [...head, ...tail];
}
function personalizeFeed(posts){
  if(!userInterest || Object.keys(userInterest).length === 0) return posts;

  const topTag = Object.keys(userInterest)
    .sort((a,b)=>userInterest[b]-userInterest[a])[0];

  if(userInterest[topTag] < 6) return posts;  // ❗ 6 threshold

  const matched = [];
  const others = [];

  posts.forEach(p=>{
    const tags = normalizeTags(p.content_tags);
    if(tags.includes(topTag)) matched.push(p);
    else others.push(p);
  });

  return [...matched, ...others];
}








// ==============================
// 🔢 CURRENT VERSION
// ==============================
const currentVersion = "1.0.6";

// ==============================
// 🔍 CHECK FOR UPDATE
// ==============================
async function checkForUpdate() {
  try {
    const res = await fetch("update.json", { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();
    const lastSeenVersion = localStorage.getItem("last_seen_version");

    // 🟢 First time user
    if (!lastSeenVersion) {
      localStorage.setItem("last_seen_version", currentVersion);
      return;
    }

    // 🔴 Version changed → force popup
    if (data.version !== lastSeenVersion) {
      showForcedUpdatePopup(data.version);
    }

  } catch (err) {
    console.error("Version check failed:", err);
  }
}

window.addEventListener("load", checkForUpdate);

// ==============================
// 🚨 MOBILE FRIENDLY UPDATE POPUP
// ==============================
function showForcedUpdatePopup(newVersion) {
  if (document.getElementById("updatePopup")) return;

  const popup = document.createElement("div");
  popup.id = "updatePopup";

  popup.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,0.92);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:99999;
    padding:16px;
    font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;
  `;

  popup.innerHTML = `
    <div style="
      width:100%;
      max-width:380px;
      background:#020617;
      border-radius:22px;
      padding:26px 22px;
      text-align:center;
      box-shadow:0 25px 70px rgba(0,0,0,0.7);
      animation:scaleIn .35s ease;
    ">
      
      <div style="
        width:70px;
        height:70px;
        margin:0 auto 14px;
        border-radius:50%;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:34px;
      ">
        🚀
      </div>

      <h2 style="
        font-size:1.35em;
        margin-bottom:10px;
        font-weight:700;
      ">
        Update Available
      </h2>

      <p style="
        font-size:0.95em;
        color:#cbd5f5;
        line-height:1.55;
        margin-bottom:22px;
      ">
        A new version <b>${newVersion}</b> is ready.<br>
        Please update to continue using the app.
      </p>

      <button id="updateBtn" style="
        width:100%;
        padding:14px;
        font-size:1em;
        background:linear-gradient(135deg,#22c55e,#16a34a);
        border:none;
        border-radius:14px;
        color:#fff;
        font-weight:700;
        cursor:pointer;
        box-shadow:0 10px 25px rgba(34,197,94,0.35);
      ">
        Update Now
      </button>

      <p style="
        font-size:0.75em;
        color:#94a3b8;
        margin-top:14px;
      ">
        Mandatory update required
      </p>
    </div>

    <style>
      @keyframes scaleIn {
        from { transform:scale(.9); opacity:0 }
        to { transform:scale(1); opacity:1 }
      }
      #updateBtn:active {
        transform:scale(.96);
      }
    </style>
  `;

  document.body.appendChild(popup);

  // ==============================
  // 🔄 UPDATE HANDLER
  // ==============================
  document.getElementById("updateBtn").onclick = async () => {
    const btn = document.getElementById("updateBtn");
    btn.disabled = true;
    btn.innerText = "Updating...";

    // 🧹 Clear cache
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // 🧹 Unregister service workers
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (let reg of regs) await reg.unregister();
    }

    // ✅ Save updated version
    localStorage.setItem("last_seen_version", newVersion);

    // 🔄 Hard reload
    location.reload(true);
  };
}

// ==============================
// 🔁 OPTIONAL AUTO CHECK
// ==============================
window.addEventListener("load", () => {
  checkForUpdate();
  setInterval(checkForUpdate, 60000);
});
const verifyBtn = document.getElementById("verifyBtn");
const verifyPopup = document.getElementById("verifyPopup");
const closePopup = document.getElementById("closePopup");
const buyVerifyBtn = document.getElementById("buyVerifyBtn");

verifyBtn.onclick = () => {
  verifyPopup.classList.remove("hidden");
};

closePopup.onclick = () => {
  verifyPopup.classList.add("hidden");
};

buyVerifyBtn.onclick = () => {
  alert("Not Enough Coins 🚀\nPlease First Earn Coins And Buy");
  verifyPopup.classList.add("hidden");
};
// ==============================
// 🔗 OPEN VIDEO MODAL FROM SHARE LINK
// ==============================
window.addEventListener("DOMContentLoaded", async () => {

  const params = new URLSearchParams(window.location.search);
  const videoId = params.get("video");

  if (!videoId) return;

  try {
    const { data: post, error } = await supabaseClient
      .from("pinora823")
      .select("*")
      .eq("id", videoId)
      .single();

    if (error || !post) {
      console.warn("Video not found:", error);
      return;
    }

    currentPostId = post.id;

    // update modal UI
    const modal = document.getElementById("videoModal");
    const modalVideo = document.getElementById("modalVideo");
    const modalImage = document.getElementById("modalImage");
    const modalTitle = document.getElementById("modalTitle");

    if (!modal || (!modalVideo && !modalImage)) {
      console.error("Modal or video/image elements missing!");
      return;
    }

    // hide both first
    modalVideo.style.display = "none";
    modalImage.style.display = "none";

    // set media
    if (post.file_type?.startsWith("video")) {
      modalVideo.src = post.file_url;
      modalVideo.addEventListener("loadeddata", () => {
        modalVideo.style.display = "block";
      }, { once: true });
    } else {
      modalImage.src = post.file_url;
      modalImage.style.display = "block";
    }

    // title + uploader
    modalTitle.innerHTML = `
      ${post.title || ""}
      <div class="modalUploader" style="display:flex;gap:6px;align-items:center">
        <img src="${post.uploader_image || 'dp.jpg'}" class="modalUploaderDP">
        <span>${post.uploader_name || "Unknown"}</span>
      </div>
    `;

    modal.classList.remove("hidden");

  } catch (err) {
    console.error("Error opening from link:", err);
  }
});

