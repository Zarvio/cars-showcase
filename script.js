// ==============================
// ⚙️ SETTINGS
// ==============================
let FEED_VIDEOS_ENABLED = true; // false = videos band
const STORY_EXPIRY_MS = 24 * 60 * 60 * 1000;
const PINNED_POST_ID = "2c0ac06b-a7b9-4c2d-8da3-348db9b14c89";
const currentVersion = "3.0";

// ==============================
// 🌍 GLOBALS (sab upar)
// ==============================
let allPosts = [], activeFeed = [], baseFeed = [], displayedPosts = [];
let batchSize = 6, batchIndex = 0;
let dataReady = false, isLoading = true;
let currentFilter = "all", followingList = [], userInterest = {};
let currentPostId = null;
let storyTimer = null, isPaused = false, storyStartTime = 0, storyDuration = 0, currentStoryId = null;
let liked = false, rawLikeCount = 0, likeBtn = null, likeCount = null;
let liveListeners = [];

// ---------- Firebase ----------
firebase.initializeApp({
  apiKey: "AIzaSyDUefeJbHKIAs-l3zvFlGaas6VD63vv4kI",
  authDomain: "inspire4ever-c60ad.firebaseapp.com",
  databaseURL: "https://inspire4ever-c60ad-default-rtdb.firebaseio.com",
  projectId: "inspire4ever-c60ad",
  storageBucket: "inspire4ever-c60ad.appspot.com",
  messagingSenderId: "125014633127",
  appId: "1:125014633127:web:d29e4c37628ab637f40982"
});

// ---------- Supabase ----------
window.supabaseClient = supabase.createClient(
  "https://lxbojhmvcauiuxahjwzk.supabase.co",
  "sb_publishable_fcAvi5DEE_9n7yO9yxGR2A_B4aneu1H"
);

// ---------- DOM ----------
const main = document.querySelector(".main-content");
const modal = document.getElementById("videoModal");
const modalVideo = document.getElementById("modalVideo");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const relatedVideos = document.getElementById("relatedVideos");
const closeBtn = document.querySelector(".closeBtn");
const searchVideoInput = document.getElementById("searchVideoInput");
const filterBtns = document.querySelectorAll(".filter-btn");

// ==============================
// 🛠️ HELPERS
// ==============================
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function normalizeTags(tags) {
  if (!tags) return [];
  let arr = [];
  if (typeof tags === "string") {
    arr = tags.replace(/[\[\]{}"]/g, "").split(",").map(t => t.trim().toLowerCase());
  } else if (Array.isArray(tags)) {
    arr = tags.map(t => String(t).toLowerCase().trim());
  }
  return arr.map(t => t.replace(/[.#$\[\]]/g, "")).filter(t => t.length > 0);
}

function formatViews(num) {
  num = Number(num || 0);
  if (num < 1000) return num.toString();
  if (num < 1000000) return (num / 1000).toFixed(1).replace(".0", "") + "K";
  if (num < 1000000000) return (num / 1000000).toFixed(1).replace(".0", "") + "M";
  return (num / 1000000000).toFixed(1).replace(".0", "") + "B";
}

function isTrue(v) { return v === true || v === "true" || v === 1 || v === "1"; }
function isPrivate(p) { return isTrue(p.private_url); }
function badgeHTML(post, size = 16, margin = 0) {
  return isTrue(post.uploader_verified)
    ? `<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:${size}px;height:${size}px;margin-left:${margin}px;">`
    : "";
}

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function getBrowserId() {
  let id = localStorage.getItem("browser_id");
  if (!id) {
    id = "browser_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("browser_id", id);
  }
  return id;
}
function hasViewed(id) { return sessionStorage.getItem("viewed_" + id) === "1"; }
function markViewed(id) { sessionStorage.setItem("viewed_" + id, "1"); }

function showCustomAlert(msg) {
  const box = document.createElement("div");
  box.classList.add("custom-alert");
  box.innerText = msg;
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2500);
}

function listen(ref, evt, fn) {
  ref.on(evt, fn);
  liveListeners.push({ ref, evt, fn });
}
function detachAll() {
  liveListeners.forEach(l => l.ref.off(l.evt, l.fn));
  liveListeners = [];
}

// ==============================
// 🎬 SKELETON
// ==============================
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
      <div class="mediaContainer skeleton skeleton-video"></div>`;
    main.appendChild(box);
  }
}

// ==============================
// 🔔 NOTIFICATIONS
// ==============================
window.sendLikeNotification = async function (postId) {
  try {
    const { data: post, error } = await supabaseClient
      .from("pinora823").select("uploader_uid, thumb_url").eq("id", postId).single();
    if (error || !post || !post.uploader_uid) return;

    const user = firebase.auth().currentUser;
    const fromUid = user ? user.uid : getBrowserId();
    const fromName = user ? (user.displayName || "User") : "Guest";
    if (user && post.uploader_uid === user.uid) return;

    // ek user + ek post = ek hi like notification (spam nahi)
    const notifRef = firebase.database().ref(`notifications/${post.uploader_uid}/like_${postId}_${fromUid}`);
    const exists = await notifRef.once("value");
    if (exists.exists()) return;

    await notifRef.set({
      from: fromName, fromUid, postId,
      thumb: post.thumb_url || "dp.jpg",
      commentText: "",
      text: `${fromName} liked your video`,
      profileImage: user?.photoURL || "dp.jpg",
      verified: user?.emailVerified || false,
      type: "like", read: false, timestamp: Date.now()
    });
  } catch (err) { console.error("sendLikeNotification error:", err); }
};

window.sendCommentNotification = async function (postId, commentText) {
  try {
    const { data: post, error } = await supabaseClient
      .from("pinora823").select("uploader_uid, thumb_url").eq("id", postId).single();
    if (error || !post || !post.uploader_uid) return;

    const user = firebase.auth().currentUser;
    if (!user || post.uploader_uid === user.uid) return;

    await firebase.database().ref(`notifications/${post.uploader_uid}`).push().set({
      from: user.displayName || "User", fromUid: user.uid, postId,
      thumb: post.thumb_url || "dp.jpg",
      commentText,
      text: `${user.displayName || "User"} commented on your video`,
      profileImage: user.photoURL || "dp.jpg",
      verified: user.emailVerified || false,
      type: "comment", read: false, timestamp: Date.now()
    });
  } catch (err) { console.error("sendCommentNotification error:", err); }
};

// ==============================
// 👁️ VIEW COUNT
// ==============================
async function incrementSupabaseViews(postId) {
  try {
    // best: atomic RPC (SQL niche README mein)
    const { error: rpcErr } = await supabaseClient.rpc("increment_views", { post_id: postId });
    if (!rpcErr) return true;

    // fallback: purana tareeka
    const { data, error } = await supabaseClient.from("pinora823").select("views").eq("id", postId).single();
    if (error || !data) return false;
    const { error: upErr } = await supabaseClient
      .from("pinora823").update({ views: Number(data.views || 0) + 1 }).eq("id", postId);
    return !upErr;
  } catch (err) {
    console.error("Increment views error:", err);
    return false;
  }
}

async function countView(postId) {
  if (hasViewed(postId)) return;
  const user = firebase.auth().currentUser;
  const viewsRef = firebase.database().ref(`videoViews/${postId}`);
  try {
    const mark = user ? viewsRef.child(`users/${user.uid}`) : viewsRef.child(`browsers/${getBrowserId()}`);
    const snap = await mark.get();
    if (snap.exists()) return;
    const ok = await incrementSupabaseViews(postId);
    if (!ok) return;
    await mark.set(true);
    markViewed(postId);
  } catch (err) { console.error("Count view error:", err); }
}

// ==============================
// 🧠 INTEREST / FEED LOGIC
// ==============================
async function updateUserInterest(postId) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const { data: post } = await supabaseClient.from("pinora823").select("content_tags").eq("id", postId).single();
  if (!post || !post.content_tags) return;
  const ref = firebase.database().ref(`userInterest/${user.uid}`);
  normalizeTags(post.content_tags).forEach(tag => ref.child(tag).transaction(c => (c || 0) + 1));
}

function smartShuffle(posts) {
  if (!posts || posts.length < 10) return posts;
  const head = posts.slice(0, 30), tail = posts.slice(30);
  for (let i = head.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }
  return [...head, ...tail];
}

function personalizeFeed(posts) {
  if (!userInterest || Object.keys(userInterest).length === 0) return posts;
  const topTag = Object.keys(userInterest).sort((a, b) => userInterest[b] - userInterest[a])[0];
  if (userInterest[topTag] < 6) return posts;
  const matched = [], others = [];
  posts.forEach(p => (normalizeTags(p.content_tags).includes(topTag) ? matched : others).push(p));
  return [...matched, ...others];
}

function getSmartRelated(currentPost, posts) {
  const stopWords = ["the", "is", "are", "of", "to", "a", "an", "and", "or", "in", "on", "for", "with"];
  const currentTags = normalizeTags(currentPost.content_tags);
  const titleWords = currentPost.title
    ? currentPost.title.toLowerCase().split(" ").filter(w => w.length > 2 && !stopWords.includes(w))
    : [];
  const aiMatches = [], titleMatches = [], added = new Set();

  posts.forEach(post => {
    if (post.id === currentPost.id) return;
    const score = normalizeTags(post.content_tags).filter(t => currentTags.includes(t)).length;
    if (score > 0) { aiMatches.push({ ...post, score }); added.add(post.id); }
  });
  aiMatches.sort((a, b) => b.score - a.score);

  posts.forEach(post => {
    if (post.id === currentPost.id || added.has(post.id) || !post.title) return;
    const t = post.title.toLowerCase();
    if (titleWords.some(w => t.includes(w))) titleMatches.push(post);
  });
  return [...aiMatches, ...titleMatches];
}

function clearFeed() {
  if (!main) return;
  main.innerHTML = "";
  batchIndex = 0;
  displayedPosts = [];
}

// ==============================
// 🔽 LAZY LOAD + PROGRESSIVE VIDEO BUFFER
// ==============================

const lazyMap = new WeakMap(); // box -> media

// First 3 videos ko priority milegi
const INITIAL_VIDEO_COUNT = 3;

// Video ko viewport ke thoda pehle load karna
const lazyObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;

    const box = entry.target;
    const media = lazyMap.get(box);

    if (!media) return;

    // Agar video/image ka source abhi pending hai
    if (media.dataset.src) {
      media.src = media.dataset.src;
      delete media.dataset.src;

      // Video ko browser ke through progressive buffering allow karo
      if (media.tagName === "VIDEO") {
        media.preload = "auto";
        media.load();
      }
    }

    lazyObserver.unobserve(box);
  });
}, {
  rootMargin: "300px 0px"
});

// ==============================
// 📺 DISPLAY VIDEOS
// ==============================
function displayVideos(posts) {
  if (!FEED_VIDEOS_ENABLED) { main.innerHTML = ""; return; }
  if (!dataReady) { showSkeletons(8); return; }
  if (!posts || posts.length === 0) { main.innerHTML = "<p>No videos found.</p>"; return; }

  if (batchIndex === 0) { main.innerHTML = ""; displayedPosts = []; }

  const start = batchIndex * batchSize;
  const uniqueBatch = posts.slice(start, start + batchSize).filter(p => !displayedPosts.includes(p.id));
  displayedPosts = [...displayedPosts, ...uniqueBatch.map(p => p.id)];
  batchIndex++;

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  uniqueBatch.forEach((post, index) => {
  // First batch ke first 3 videos ko priority preload milega
  const priorityVideo = batchIndex === 1 && index < INITIAL_VIDEO_COUNT;

  renderPost(post, isMobile, priorityVideo);
});

  setTimeout(fillIfShort, 300);
}

function fillIfShort() {
  if (isLoading || !dataReady) return;
  if (document.body.offsetHeight <= window.innerHeight + 100 && batchIndex * batchSize < activeFeed.length) {
    displayVideos(activeFeed);
  }
}

function renderPost(post, isMobile, priorityVideo = false) {
  const box = document.createElement("div");
  box.classList.add("pin-box");

  const mediaContainer = document.createElement("div");
  mediaContainer.className = "mediaContainer";

  const skeleton = document.createElement("div");
  skeleton.className = "skeleton skeleton-video";
  mediaContainer.appendChild(skeleton);

  // OVERLAY
  const overlay = document.createElement("div");
  overlay.className = "uploaderOverlay";
  overlay.style.display = "none";
  overlay.innerHTML = `
    <div style="display:flex; align-items:center; gap:8px; width:100%;">
      <img src="${esc(post.uploader_image ? post.uploader_image + "?t=" + Date.now() : "dp.jpg")}" class="uploaderDP" alt="uploader">
      <div style="display:flex; align-items:center; gap:6px;">
        <span class="uploaderName">${esc(post.uploader_name || "Unknown")}</span>
        ${badgeHTML(post)}
      </div>
    </div>`;
  const dp = overlay.querySelector(".uploaderDP");
  dp.addEventListener("load", () => dp.classList.add("loaded"));
  const uploaderDiv = overlay.querySelector("div");
  uploaderDiv.style.cursor = "pointer";
  uploaderDiv.addEventListener("click", e => {
    e.stopPropagation();
    if (post.uploader_uid) window.location.href = `user.html?uid=${post.uploader_uid}`;
  });
  mediaContainer.appendChild(overlay);

  // VIEWS
  const viewsOverlay = document.createElement("div");
  viewsOverlay.className = "viewsOverlay";
  viewsOverlay.innerHTML = `<i class="fa-regular fa-eye"></i><span class="viewCount">${formatViews(post.views)}</span>`;
  mediaContainer.appendChild(viewsOverlay);

  // MEDIA (src abhi nahi, scroll pe lagega)
  const isVideo = (post.file_type || "").startsWith("video");
  let media;
  if (isVideo && isMobile) {

  media = document.createElement("img");

  if (priorityVideo) {
    // Mobile ke first 3 videos ke thumbnails immediately load honge
    media.src = post.thumb_url || "dp.jpg";
  } else {
    // Baaki thumbnails lazy load hongi
    media.dataset.src = post.thumb_url || "dp.jpg";
  }

} else if (isVideo) {
  media = document.createElement("video");

  media.muted = true;
  media.loop = true;
  media.playsInline = true;

  // Thumbnail pehle dikhegi
  media.poster = post.thumb_url || "";

  if (priorityVideo) {
    // First 3 videos ko immediately progressive loading start
    media.src = post.file_url;
    media.preload = "auto";
  } else {
    // Baaki videos viewport ke paas aane par load hongi
    media.dataset.src = post.file_url;
    media.preload = "metadata";
  }
  } else {
    media = document.createElement("img");
    media.dataset.src = post.file_url;
  }
  media.className = "postMedia";

  const done = () => { skeleton.remove(); overlay.style.display = "flex"; };
  media.addEventListener("loadeddata", done);
  media.addEventListener("load", done);
  media.addEventListener("error", done);

  media.addEventListener("click", () => openModal(post));

  mediaContainer.appendChild(media);
  box.appendChild(mediaContainer);
  main.appendChild(box);

  lazyMap.set(box, media);

// First 3 priority videos already loading hain,
// isliye unhe observer ki zarurat nahi.
if (!priorityVideo) {
  lazyObserver.observe(box);
}
}

// ==============================
// 🪟 MODAL
// ==============================
function showModalSkeleton() {
  document.querySelectorAll(".modal-skeleton-overlay").forEach(s => s.remove());
  const s = document.createElement("div");
  s.className = "modal-skeleton-overlay";
  s.style.cssText = "width:100%;aspect-ratio:9/16;background:#111;border-radius:12px;margin-bottom:10px;";
  modal.querySelector(".modal-media-wrapper").appendChild(s);
}
function removeModalSkeleton() {
  document.querySelectorAll(".modal-skeleton-overlay").forEach(s => s.remove());
}

function setModalTitle(post) {
  modalTitle.innerHTML = `
    ${esc(post.title || "")}
    <div class="modalUploader" style="display:flex; align-items:center; gap:5px;">
      <img src="${esc(post.uploader_image ? post.uploader_image + "?t=" + Date.now() : "dp.jpg")}" class="modalUploaderDP">
      <span>${esc(post.uploader_name || "Unknown")}</span>
      ${badgeHTML(post)}
    </div>`;
  const up = modalTitle.querySelector(".modalUploader");
  up.style.cursor = "pointer";
  up.addEventListener("click", () => {
    if (post.uploader_uid) window.location.href = `user.html?uid=${post.uploader_uid}`;
  });
}

function createRelatedVideoBox(post) {
  const wrap = document.createElement("div");
  wrap.className = "relatedBox";
  wrap.innerHTML = `
    <div class="relatedThumb">
      <img src="${esc(post.thumb_url || post.file_url || "default_thumb.jpg")}" class="relatedVideoThumb" loading="lazy">
      <div class="uploaderHeaderSmall">
        <img src="${esc(post.uploader_image || "dp.jpg")}" class="smallDP">
        <span class="smallName">${esc(post.uploader_name || "User")}</span>
        ${badgeHTML(post, 12, 4)}
      </div>
    </div>`;
  const small = wrap.querySelector(".uploaderHeaderSmall");
  small.style.cursor = "pointer";
  small.addEventListener("click", e => {
    e.stopPropagation();
    if (post.uploader_uid) window.location.href = `user.html?uid=${post.uploader_uid}`;
  });
  wrap.addEventListener("click", () => openModal(post));
  relatedVideos.appendChild(wrap);
}

function openModal(post) {
  currentPostId = post.id;
  updateCommentCount();
  loadLikes(post.id);
  countView(post.id);

  showModalSkeleton();
  const isVideo = (post.file_type || "").startsWith("video");

  modalVideo.pause();
  modalVideo.style.display = isVideo ? "block" : "none";
  modalImage.style.display = isVideo ? "none" : "block";

  const hideSkel = () => removeModalSkeleton();

  if (isVideo) {
  modalVideo.onloadeddata = hideSkel;
  modalVideo.oncanplay = hideSkel;
  modalVideo.onerror = hideSkel;

  modalVideo.controls = false;

  // Progressive buffering
  modalVideo.preload = "auto";
  modalVideo.src = post.file_url;

  modalVideo.load();

  // Video ready hote hi play
  modalVideo.addEventListener("canplay", function startVideo() {
    modalVideo.removeEventListener("canplay", startVideo);

    modalVideo.play().catch(() => {});
  });

  // Loading stuck hone par skeleton ko forever mat rakho
  setTimeout(hideSkel, 4000);

  } else {
    modalImage.onload = hideSkel;
    modalImage.onerror = hideSkel;
    modalImage.src = post.file_url;
  }

  setModalTitle(post);
  const mv = document.getElementById("modalViewCount");
  if (mv) mv.textContent = formatViews(post.views);

  relatedVideos.innerHTML = "";
  getSmartRelated(post, allPosts).forEach(createRelatedVideoBox);

  modal.classList.remove("hidden");
  const mc = modal.querySelector(".modal-content");
  if (mc) { mc.style.scrollBehavior = "auto"; mc.scrollTop = 0; }
}

// ---- custom controls (ek baar) ----
(function setupCustomControls() {
  const controls = document.createElement("div");
  controls.className = "custom-controls";
  controls.innerHTML = `
    <button id="playPauseBtn" class="playPauseBtn"><i class="fa-solid fa-play"></i></button>
    <input type="range" id="seekBar" value="0" min="0" max="100">
    <div class="timeRow"><span id="currentTime">0:00</span> / <span id="duration">0:00</span></div>`;
  modal.querySelector(".modal-media-wrapper").appendChild(controls);

  const playPauseBtn = document.getElementById("playPauseBtn");
  const seekBar = document.getElementById("seekBar");
  const currentTime = document.getElementById("currentTime");
  const duration = document.getElementById("duration");
  const icon = playPauseBtn.querySelector("i");

  const fmt = s => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" + sec : sec}`;
  };
  function toggle() {
    if (modalVideo.paused) { modalVideo.play(); icon.className = "fa-solid fa-pause"; }
    else { modalVideo.pause(); icon.className = "fa-solid fa-play"; }
  }
  playPauseBtn.addEventListener("click", e => { e.stopPropagation(); toggle(); });
  modalVideo.addEventListener("click", toggle);
  modalVideo.addEventListener("play", () => { playPauseBtn.style.opacity = "0"; });
  modalVideo.addEventListener("pause", () => { playPauseBtn.style.opacity = "1"; });
  modalVideo.addEventListener("timeupdate", () => {
    if (modalVideo.duration) seekBar.value = (modalVideo.currentTime / modalVideo.duration) * 100;
    currentTime.textContent = fmt(modalVideo.currentTime);
  });
  modalVideo.addEventListener("loadedmetadata", () => { duration.textContent = fmt(modalVideo.duration); });
  seekBar.addEventListener("input", () => { modalVideo.currentTime = (seekBar.value / 100) * modalVideo.duration; });
})();

// ---- close modal (ek hi handler) ----
closeBtn.addEventListener("click", () => {
  if (!modal.classList.contains("hidden")) {
    modal.classList.add("hidden");
    modalVideo.pause();
  } else {
    window.history.back();
  }
});

// ==============================
// 🔍 FILTERS + SEARCH
// ==============================
filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    applyFilters();
  });
});

function applyFilters() {
  if (!dataReady || isLoading) return;
  batchIndex = 0;
  displayedPosts = [];
  clearFeed();

  const filtered = [...allPosts];

  if (currentFilter === "all") {
    activeFeed = filtered.filter(p => !isPrivate(p));
    activeFeed = personalizeFeed(smartShuffle(activeFeed));
    const pinned = activeFeed.find(p => p.id == PINNED_POST_ID);
    if (pinned) {
      activeFeed = activeFeed.filter(p => p.id != PINNED_POST_ID);
      activeFeed.unshift(pinned);
    }
  } else if (currentFilter === "following") {
    activeFeed = filtered.filter(p => followingList.includes(p.uploader_uid) && !isPrivate(p));
  } else if (currentFilter === "verified") {
    activeFeed = filtered.filter(p => !isPrivate(p) && isTrue(p.uploader_verified));
  } else if (currentFilter === "popular") {
    activeFeed = filtered.filter(p => !isPrivate(p)).sort((a, b) => (b.views || 0) - (a.views || 0));
  } else if (currentFilter === "private") {
    activeFeed = filtered.filter(p => isPrivate(p));
  }

  baseFeed = activeFeed;
  displayVideos(activeFeed);
}

searchVideoInput.addEventListener("input", debounce(() => {
  if (!dataReady) { showSkeletons(8); return; }
  const query = searchVideoInput.value.toLowerCase().trim();

  batchIndex = 0;
  displayedPosts = [];

  if (!query) {
    activeFeed = baseFeed;
    displayVideos(activeFeed);
    return;
  }

  const aiResults = [], titleResults = [], added = new Set();
  allPosts.forEach(post => {
    if (normalizeTags(post.content_tags).some(tag => tag.includes(query))) {
      aiResults.push(post); added.add(post.id);
    }
  });
  allPosts.forEach(post => {
    if (added.has(post.id)) return;
    if (post.title && post.title.toLowerCase().includes(query)) titleResults.push(post);
  });

  activeFeed = [...aiResults, ...titleResults];
  displayVideos(activeFeed);
}, 250));

// ---- infinite scroll ----
window.addEventListener("scroll", () => {
  if (isLoading || !dataReady) return;
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    if (batchIndex * batchSize >= activeFeed.length) return;
    displayVideos(activeFeed);
  }
});

// ---- navigation ----
document.getElementById("btnHome")?.addEventListener("click", () => location.href = "main.html");
document.getElementById("btnSearch")?.addEventListener("click", () => location.href = "search.html");
document.getElementById("btnProfile")?.addEventListener("click", () => location.href = "profile.html");
document.getElementById("btnUpload")?.addEventListener("click", () => location.href = "upload.html");

// ==============================
// 📥 FETCH POSTS
// ==============================
(async function fetchPosts() {
  try {
    isLoading = true;
    dataReady = false;
    showSkeletons(8);

    const { data, error } = await supabaseClient
      .from("pinora823").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    allPosts = data || [];
    dataReady = true;
    isLoading = false;
    applyFilters();
  } catch (err) {
    console.error("Error fetching posts:", err);
    showSkeletons(6);
  }
})();

// ==============================
// ❤️ LIKES
// ==============================
async function loadLikes(postId) {
  currentPostId = postId;
  liked = false;
  likeBtn = document.getElementById("likeBtn");
  likeCount = document.getElementById("likeCount");
  if (!likeBtn || !likeCount) return;

  const user = firebase.auth().currentUser;
  const browserId = getBrowserId();
  const snap = await firebase.database().ref(`videoLikes/${postId}`).get();

  let count = 0;
  if (snap.exists()) {
    const data = snap.val();
    count = data.count || 0;
    if (user && data.users?.[user.uid]) liked = true;
    if (!user && data.users?.[browserId]) liked = true;
  }
  rawLikeCount = count;
  likeCount.textContent = formatViews(count);
  updateLikeUI();
  attachLikeListener();
}

function updateLikeUI() {
  if (!likeBtn || !likeCount) return;
  likeBtn.innerHTML = `<i class="${liked ? "fa-solid" : "fa-regular"} fa-heart"></i> <span id="likeCount">${likeCount.textContent}</span>`;
  likeBtn.classList.toggle("liked", liked);
  likeBtn.classList.remove("bounce");
  void likeBtn.offsetWidth;
  likeBtn.classList.add("bounce");
  likeCount = document.getElementById("likeCount");
}

function attachLikeListener() {
  if (!likeBtn) return;
  likeBtn.onclick = async () => {
    if (!currentPostId) return;
    likeBtn.classList.add("loading");

    const user = firebase.auth().currentUser;
    const userKey = user ? user.uid : getBrowserId();
    const postRef = firebase.database().ref(`videoLikes/${currentPostId}`);
    const userLikeRef = postRef.child(`users/${userKey}`);
    const countRef = postRef.child("count");

    const prevLiked = liked, prevCount = rawLikeCount;
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
      liked = prevLiked;
      rawLikeCount = prevCount;
      likeCount.textContent = formatViews(rawLikeCount);
      updateLikeUI();
    } finally {
      likeBtn.classList.remove("loading");
    }
  };
}

// ---- double tap ----
let lastTap = 0;
const doubleTapHeart = document.getElementById("doubleTapHeart");
modalVideo.addEventListener("click", () => {
  const now = Date.now();
  if (now - lastTap < 300) {
    if (!liked && likeBtn) likeBtn.click();
    doubleTapHeart.classList.remove("show");
    void doubleTapHeart.offsetWidth;
    doubleTapHeart.classList.add("show");
  }
  lastTap = now;
});

// ==============================
// 💬 COMMENTS
// ==============================
const commentBtn = document.getElementById("commentBtn");
const commentInput = document.getElementById("commentInput");
const sendCommentBtn = document.getElementById("sendCommentBtn");
const commentCountEl = document.getElementById("commentCount");
const commentModal = document.getElementById("commentModal");
const closeCommentModal = document.querySelector(".closeCommentModal");
const allCommentsList = document.getElementById("allCommentsList");

async function updateCommentCount() {
  if (!currentPostId) return;
  const snap = await firebase.database().ref(`videoComments/${currentPostId}`).once("value");
  commentCountEl.textContent = formatViews(Object.keys(snap.val() || {}).length);
}

async function loadAllComments() {
  allCommentsList.innerHTML = "";
  const snap = await firebase.database().ref(`videoComments/${currentPostId}`).once("value");
  const comments = snap.val() || {};
  Object.values(comments).forEach(c => {
    const div = document.createElement("div");
    div.classList.add("comment-item");
    div.innerHTML = `
      <img src="${esc(c.profileImage || "dp.jpg")}" alt="dp">
      <span class="username">${esc(c.username)}:</span>
      <span class="text">${esc(c.text)}</span>`;
    allCommentsList.appendChild(div);
  });
  allCommentsList.scrollTop = allCommentsList.scrollHeight;
  commentCountEl.textContent = formatViews(Object.keys(comments).length);
}

commentBtn.addEventListener("click", async () => {
  await loadAllComments();
  commentModal.classList.remove("hidden");
});
closeCommentModal.addEventListener("click", () => commentModal.classList.add("hidden"));
commentModal.addEventListener("click", e => { if (e.target === commentModal) commentModal.classList.add("hidden"); });

commentInput.addEventListener("focus", () => {
  if (!firebase.auth().currentUser) {
    commentInput.blur();
    showCustomAlert("Please login first to comment!");
  }
});

async function sendComment() {
  const text = commentInput.value.trim();
  const user = firebase.auth().currentUser;
  if (!user) { showCustomAlert("Please login first to comment!"); return; }
  if (!text || !currentPostId) return;

  await firebase.database().ref(`videoComments/${currentPostId}`).push().set({
    uid: user.uid,
    username: user.displayName || "Anonymous",
    profileImage: user.photoURL || "dp.jpg",
    text,
    timestamp: Date.now()
  });
  sendCommentNotification(currentPostId, text);
  commentInput.value = "";
  await loadAllComments();
}
sendCommentBtn.addEventListener("click", sendComment);
commentInput.addEventListener("keypress", e => { if (e.key === "Enter") sendComment(); });

// ==============================
// 📤 SHARE
// ==============================
const shareBtn = document.getElementById("shareBtn");
const shareMenu = document.getElementById("shareMenu");
const linkCopied = document.getElementById("linkCopied");

shareBtn.addEventListener("click", e => { e.stopPropagation(); shareMenu.classList.toggle("hidden"); });
document.addEventListener("click", () => shareMenu.classList.add("hidden"));

shareMenu.querySelectorAll(".shareOption").forEach(btn => {
  btn.addEventListener("click", () => {
    const platform = btn.dataset.platform;
    const link = `${window.location.origin}${window.location.pathname}?video=${currentPostId}`;
    const text = encodeURIComponent(link);

    if (platform === "whatsapp") window.open(`https://wa.me/?text=${text}`, "_blank");
    else if (platform === "telegram") window.open(`https://t.me/share/url?url=${text}&text=${text}`, "_blank");
    else if (platform === "copy") {
      navigator.clipboard.writeText(link).then(() => {
        linkCopied.classList.remove("hidden");
        linkCopied.classList.add("show");
        setTimeout(() => { linkCopied.classList.remove("show"); linkCopied.classList.add("hidden"); }, 1200);
      });
    }
    shareMenu.classList.add("hidden");
  });
});

// ---- share link se modal kholna ----
(async function openFromLink() {
  const videoId = new URLSearchParams(window.location.search).get("video");
  if (!videoId) return;
  try {
    const { data: post, error } = await supabaseClient.from("pinora823").select("*").eq("id", videoId).single();
    if (error || !post) { console.warn("Video not found:", error); return; }
    openModal(post);
  } catch (err) { console.error("Error opening from link:", err); }
})();

// ==============================
// 🪙 COINS
// ==============================
const creditText = document.getElementById("creditText");
const creditBox = document.getElementById("creditBox");
if (creditText) creditText.innerText = "...";

function userCoinRef(uid) { return firebase.database().ref(`userCoins/${uid}`); }

async function getUserCoins() {
  const user = firebase.auth().currentUser;
  if (!user) return null;
  const snap = await userCoinRef(user.uid).once("value");
  return Number(snap.val() || 0);
}

async function updateUserCoins(amount) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  await userCoinRef(user.uid).transaction(c => Math.max(Number(c || 0) + amount, 0));
}

function closeLoginPopup() { document.getElementById("loginPopup").classList.add("hidden"); }
function closeNoCoinsPopup() {
  document.getElementById("noCoinsPopup").classList.add("hidden");
  window.location.href = "upload.html";
}
function closeCoinPopup() { document.getElementById("coinPurchasePopup").classList.add("hidden"); }
function showFlagPopup() { document.getElementById("flagPopup").classList.remove("hidden"); }
function closeFlagPopup() { document.getElementById("flagPopup").classList.add("hidden"); }

// ==============================
// ⬇️ DOWNLOAD
// ==============================
const downloadBtn = document.getElementById("downloadBtn");
const progressOverlay = document.getElementById("downloadProgressOverlay");
const progressCircleFill = document.getElementById("progressCircleFill");
const progressPercent = document.getElementById("progressPercent");

downloadBtn.addEventListener("click", async () => {
  if (!currentPostId) return;

  const user = firebase.auth().currentUser;
  if (!user) { document.getElementById("loginPopup").classList.remove("hidden"); return; }

  const coins = await getUserCoins();
  if (coins < 5) { document.getElementById("noCoinsPopup").classList.remove("hidden"); return; }

  let charged = false;
  try {
    const { data: post, error } = await supabaseClient
      .from("pinora823").select("title, file_url").eq("id", currentPostId).single();
    if (error || !post) return; // coin abhi kata nahi

    // coin ab katao
    await updateUserCoins(-5);
    charged = true;

    const titleText = (post.title || "Video").replace(/[\\/:"*?<>|]+/g, "");
    const fileName = `${titleText} - Pinora Web.mp4`;

    progressOverlay.style.display = "flex";
    progressPercent.textContent = "0%";
    progressCircleFill.style.strokeDashoffset = 226.2;

    const response = await fetch(post.file_url);
    if (!response.ok) throw new Error("Download request failed");
    const reader = response.body.getReader();
    const contentLength = +response.headers.get("Content-Length");

    let received = 0;
    const chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (contentLength) {
        const progress = (received / contentLength) * 100;
        progressCircleFill.style.strokeDashoffset = 226.2 * (1 - progress / 100);
        progressPercent.textContent = `${progress.toFixed(0)}%`;
      }
    }

    const blobUrl = URL.createObjectURL(new Blob(chunks));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);

    updateUserInterest(currentPostId);
    setTimeout(() => { progressOverlay.style.display = "none"; }, 800);
  } catch (err) {
    console.error("Download failed:", err);
    progressOverlay.style.display = "none";
    if (charged) {
      await updateUserCoins(5); // refund
      showCustomAlert("Download failed, coins refunded");
    }
  }
});

// ==============================
// 🎉 REWARD POPUP
// ==============================
window.addEventListener("load", () => {
  if (localStorage.getItem("uploadReward")) {
    const popup = document.getElementById("rewardPopup");
    popup.classList.remove("hidden");
    document.getElementById("closeRewardPopup").onclick = () => {
      popup.classList.add("hidden");
      localStorage.removeItem("uploadReward");
    };
  }
});

// ==============================
// 💬 CHAT BUTTON (lock + unread)
// ==============================
const notifDot = document.getElementById("notifDot");
const notifBtn = document.getElementById("btnNotifs");
const btnMessage = document.getElementById("btnmessage");

const chatLock = document.createElement("div");
chatLock.innerHTML = `<i class="fa-solid fa-lock"></i>`;
chatLock.id = "chatLock";
chatLock.style.cssText = `position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.5);color:white;font-size:18px;border-radius:50%;cursor:pointer;z-index:2000;`;

const messageCount = document.createElement("span");
messageCount.style.cssText = `display:none;min-width:16px;height:16px;background:red;color:white;font-size:12px;font-weight:bold;text-align:center;line-height:16px;border-radius:50%;position:absolute;top:0px;right:0px;pointer-events:none;z-index:1001;padding:0 4px;`;

btnMessage.style.position = "fixed";
btnMessage.appendChild(chatLock);
btnMessage.appendChild(messageCount);

btnMessage.onclick = () => {
  if (chatLock.style.display === "flex") {
    showCustomAlert("Upload 2 videos to unlock the chat");
    return;
  }
  window.location.href = "chat.html";
};

async function checkChatButtonLock() {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const { data, error } = await supabaseClient.from("pinora823").select("id").eq("uploader_uid", user.uid);
  if (error) { console.log("video count error", error); return; }
  chatLock.style.display = data.length < 2 ? "flex" : "none";
}

const updateUnreadCount = debounce(async () => {
  const uid = firebase.auth().currentUser?.uid;
  if (!uid) return;
  const unreadSources = new Set();

  const chats = (await firebase.database().ref("chats").once("value")).val() || {};
  Object.keys(chats).forEach(chatId => {
    if (!chatId.includes(uid)) return;
    Object.values(chats[chatId]).forEach(msg => {
      if (msg.sender !== uid && !msg.read) unreadSources.add(chatId);
    });
  });

  const groups = (await firebase.database().ref("groupChats").once("value")).val() || {};
  Object.keys(groups).forEach(gid => {
    Object.values(groups[gid]).forEach(msg => {
      if (msg.sender !== uid && (!msg.seenBy || !msg.seenBy[uid])) unreadSources.add(gid);
    });
  });

  if (unreadSources.size > 0) {
    messageCount.style.display = "block";
    messageCount.innerText = unreadSources.size;
  } else {
    messageCount.style.display = "none";
  }
}, 600);

// ==============================
// 🔴 NOTIFICATION BUTTON
// ==============================
notifBtn.addEventListener("click", () => {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const ref = firebase.database().ref(`notifications/${user.uid}`);
  ref.once("value", snap => {
    snap.forEach(child => {
      if (child.val().read === false) ref.child(child.key).update({ read: true });
    });
  });
  window.location.href = "notification.html";
});

// ==============================
// 🔐 ADMIN (Ctrl + P) — Firebase admins/{uid} se check
// ==============================
document.addEventListener("keydown", async e => {
  if (e.ctrlKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    const user = firebase.auth().currentUser;
    if (!user) { alert("Login first"); return; }
    try {
      const snap = await firebase.database().ref(`admins/${user.uid}`).once("value");
      if (snap.val() === true) window.location.href = "panel.html";
      else alert("Not allowed!");
    } catch (err) { alert("Not allowed!"); }
  }
});

// ==============================
// ✅ VERIFY POPUP
// ==============================
const verifyBtn = document.getElementById("verifyBtn");
const verifyPopup = document.getElementById("verifyPopup");
verifyBtn.onclick = () => verifyPopup.classList.remove("hidden");
document.getElementById("closePopup").onclick = () => verifyPopup.classList.add("hidden");
document.getElementById("buyVerifyBtn").onclick = () => {
  alert("Not Enough Coins 🚀\nPlease First Earn Coins And Buy");
  verifyPopup.classList.add("hidden");
};

// ==============================
// 🔑 EK HI AUTH LISTENER
// ==============================
firebase.auth().onAuthStateChanged(async user => {
  detachAll();
  document.querySelector(".addCoinBtn")?.remove();

  if (!user) {
    userInterest = {};
    followingList = [];
    if (creditText) creditText.innerText = "Please login";
    hideStoriesSkeleton();
    creditBox?.classList.add("guest");
    return;
  }

  const uid = user.uid;
  const db = firebase.database();

  checkChatButtonLock();
  loadStories();

  // 🔴 notification count
  listen(db.ref(`notifications/${uid}`), "value", snap => {
    if (!notifDot) return;
    let unread = 0;
    snap.forEach(child => { if (child.val()?.read === false) unread++; });
    if (unread > 0) { notifDot.style.display = "inline-block"; notifDot.innerText = unread > 99 ? "99+" : unread; }
    else { notifDot.style.display = "none"; notifDot.innerText = ""; }
  });

  // 👥 following (ek baar)
  db.ref(`following/${uid}`).once("value").then(snap => {
    followingList = snap.exists() ? Object.keys(snap.val()) : [];
    if (currentFilter === "following") applyFilters();
  });

  // 💬 unread chats
  listen(db.ref("chats"), "child_added", updateUnreadCount);
  listen(db.ref("chats"), "child_changed", updateUnreadCount);
  listen(db.ref("chats"), "child_removed", updateUnreadCount);
  listen(db.ref("groupChats"), "child_added", updateUnreadCount);
  listen(db.ref("groupChats"), "child_changed", updateUnreadCount);

  // 🧠 interest
  listen(db.ref(`userInterest/${uid}`), "value", snap => { userInterest = snap.val() || {}; });

  // 🚩 deleted video flag
  db.ref(`deletedNotifications/${uid}`).once("value", snap => {
    if (!snap.exists()) return;
    snap.forEach(child => {
      if (child.val().shown === false) {
        showFlagPopup();
        snap.ref.child(child.key).update({ shown: true });
        return true;
      }
    });
  });

  // 🪙 coins
  if (creditText && creditBox) {
    creditBox.classList.remove("guest");
    const ref = userCoinRef(uid);
    const snap = await ref.once("value");
    if (!snap.exists()) await ref.set(40);
    listen(ref, "value", s => { if (s.exists()) creditText.innerText = s.val(); });

    const plus = document.createElement("i");
    plus.className = "fa-solid fa-plus addCoinBtn";
    creditBox.appendChild(plus);
    plus.addEventListener("click", () => document.getElementById("coinPurchasePopup").classList.remove("hidden"));
  }
});

// ==============================
// 🔄 UPDATE CHECK
// ==============================
async function checkForUpdate() {
  try {
    const res = await fetch("update.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const lastSeen = localStorage.getItem("last_seen_version");
    if (!lastSeen) { localStorage.setItem("last_seen_version", currentVersion); return; }
    if (data.version !== lastSeen) showForcedUpdatePopup(data.version);
  } catch (err) { console.error("Version check failed:", err); }
}
window.addEventListener("load", () => {
  checkForUpdate();
  setInterval(checkForUpdate, 60000);
});

function showForcedUpdatePopup(newVersion) {
  if (document.getElementById("updatePopup")) return;
  const popup = document.createElement("div");
  popup.id = "updatePopup";
  popup.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:99999;padding:16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;`;
  popup.innerHTML = `
    <div style="width:100%;max-width:380px;background:#020617;border-radius:22px;padding:26px 22px;text-align:center;box-shadow:0 25px 70px rgba(0,0,0,0.7);animation:scaleIn .35s ease;">
      <div style="width:70px;height:70px;margin:0 auto 14px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:34px;">🚀</div>
      <h2 style="font-size:1.35em;margin-bottom:10px;font-weight:700;">Update Available</h2>
      <p style="font-size:0.95em;color:#cbd5f5;line-height:1.55;margin-bottom:22px;">A new version <b>${esc(newVersion)}</b> is ready.<br>Please update to continue using the app.</p>
      <button id="updateBtn" style="width:100%;padding:14px;font-size:1em;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:14px;color:#fff;font-weight:700;cursor:pointer;box-shadow:0 10px 25px rgba(34,197,94,0.35);">Update Now</button>
      <p style="font-size:0.75em;color:#94a3b8;margin-top:14px;">Mandatory update required</p>
    </div>
    <style>@keyframes scaleIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}#updateBtn:active{transform:scale(.96);}</style>`;
  document.body.appendChild(popup);

  document.getElementById("updateBtn").onclick = async () => {
    const btn = document.getElementById("updateBtn");
    btn.disabled = true;
    btn.innerText = "Updating...";
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) await reg.unregister();
    }
    localStorage.setItem("last_seen_version", newVersion);
    location.reload();
  };
}

// ==============================
// 📖 STORIES
// ==============================
function hasSeenStory(id) { return localStorage.getItem("story_seen_" + id) === "1"; }
function markStorySeen(id) { localStorage.setItem("story_seen_" + id, "1"); }

async function getPinoraProfile(uid) {
  const snap = await firebase.database().ref("users/" + uid).once("value");
  if (!snap.exists()) return null;
  const d = snap.val();
  return { username: d.username || "user", image: d.photoURL || "dp.jpg" };
}

function showStoriesSkeleton() {
  const skel = document.getElementById("storiesSkeleton"), bar = document.getElementById("storiesBar");
  if (!skel || !bar) return;
  bar.style.display = "none";
  skel.style.display = "flex";
}
function hideStoriesSkeleton() {
  const skel = document.getElementById("storiesSkeleton"), bar = document.getElementById("storiesBar");
  if (!skel || !bar) return;
  skel.style.display = "none";
  bar.style.display = "flex";
}
// page khulte hi stories skeleton dikhao + data pehle se mangwa lo (login ka wait nahi)
let storiesPrefetch = supabaseClient
  .from("stories").select("*").order("created_at", { ascending: false })
  .then(r => r)
  .catch(() => ({ data: [] }));
showStoriesSkeleton();

// expired stories ko turant filter karo, delete background mein hota rahe (UI ko rokta nahi)
function deleteExpiredStories(stories) {
  const now = Date.now();
  const alive = [];
  stories.forEach(story => {
    if (now - new Date(story.created_at).getTime() >= STORY_EXPIRY_MS) {
      (async () => {
        try {
          if (story.media_path) await supabaseClient.storage.from("stories").remove([story.media_path]);
          await supabaseClient.from("story_views").delete().eq("story_id", story.id);
          await supabaseClient.from("stories").delete().eq("id", story.id);
        } catch (e) { console.error(e); }
      })();
    } else alive.push(story);
  });
  return alive;
}

async function loadStories(silent = false) {
  const user = firebase.auth().currentUser;
  if (!user) return;
  if (!silent) showStoriesSkeleton();

  // pehli baar pehle se mangwaya hua data use hoga
  const storiesReq = (storiesPrefetch && !silent)
    ? storiesPrefetch
    : supabaseClient.from("stories").select("*").order("created_at", { ascending: false }).then(r => r);
  storiesPrefetch = null;

  // teeno cheezein ek saath (pehle ek ke baad ek hoti thi)
  const [followSnap, res, myProfile] = await Promise.all([
    firebase.database().ref(`following/${user.uid}`).once("value"),
    storiesReq,
    getPinoraProfile(user.uid)
  ]);

  const following = followSnap.exists() ? Object.keys(followSnap.val()) : [];
  following.push(user.uid);

  const data = deleteExpiredStories(res?.data || []);
  window.allStories = data;

  const bar = document.getElementById("storiesBar");
  const myStory = data.find(s => s.user_id === user.uid);

  let html = `
    <div class="story-item" onclick="${myStory
      ? `openStory('${esc(myStory.media_url)}','${esc(myStory.media_type)}','${esc(myStory.id)}')`
      : "addStory()"}">
      <div class="story-ring ${myStory && !hasSeenStory(myStory.id) ? "active" : ""}">
        <img src="${esc(myProfile?.image || "dp.jpg")}">
        ${!myStory ? `<div class="add-story">+</div>` : ""}
      </div>
      <div>Your Story</div>
    </div>`;

  data.forEach(story => {
    if (story.user_id === user.uid || !following.includes(story.user_id)) return;
    html += `
      <div class="story-item" onclick="openStory('${esc(story.media_url)}','${esc(story.media_type)}','${esc(story.id)}')">
        <div class="story-ring ${!hasSeenStory(story.id) ? "active" : ""}">
          <img src="${esc(story.uploader_image || "dp.jpg")}">
        </div>
        <div>${esc(story.uploader_username || "user")}</div>
      </div>`;
  });

  bar.innerHTML = html;
  hideStoriesSkeleton();
}
function addStory() { document.getElementById("storyFileInput").click(); }

document.getElementById("storyFileInput").addEventListener("change", async e => {
  const user = firebase.auth().currentUser;
  if (!user) return;
  const file = e.target.files[0];
  if (!file) return;

  const profile = await getPinoraProfile(user.uid);
  if (!profile) { alert("Profile not found"); return; }

  const ext = file.name.split(".").pop();
  const fileName = `story_${user.uid}_${Date.now()}.${ext}`;
  const isVideo = file.type.startsWith("video");

  const { error: upErr } = await supabaseClient.storage.from("stories").upload(fileName, file, { contentType: file.type });
  if (upErr) { console.error(upErr); alert("Story upload failed"); return; }

  const { data } = supabaseClient.storage.from("stories").getPublicUrl(fileName);

  await supabaseClient.from("stories").insert({
    user_id: user.uid,
    uploader_username: profile.username,
    uploader_image: profile.image,
    media_url: data.publicUrl,
    media_path: fileName,
    media_type: isVideo ? "video" : "image",
    created_at: new Date()
  });

  e.target.value = "";
  loadStories();
});

function openStory(url, type, storyId) {
  const story = window.allStories?.find(s => s.id === storyId);
  if (story && Date.now() - new Date(story.created_at).getTime() >= STORY_EXPIRY_MS) {
    loadStories();
    return;
  }

  currentStoryId = storyId;
  const progressBar = document.getElementById("storyProgressBar");
  progressBar.style.transition = "none";
  progressBar.style.width = "0%";

  const viewer = document.getElementById("storyViewer");
  const img = document.getElementById("storyImage");
  const vid = document.getElementById("storyVideo");

  if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
  viewer.classList.remove("hidden");

  if (storyId) markStorySeen(storyId);
  saveStoryView(storyId);

  if (type === "image") {
    vid.pause();
    vid.style.display = "none";
    img.style.display = "block";
    img.src = url;

    const duration = 7000;
    storyDuration = duration;
    storyStartTime = Date.now();
    isPaused = false;

    setTimeout(() => {
      progressBar.style.transition = `width ${duration}ms linear`;
      progressBar.style.width = "100%";
    }, 50);
    storyTimer = setTimeout(closeStory, duration);
  } else {
    img.style.display = "none";
    vid.style.display = "block";
    vid.src = url;
    vid.currentTime = 0;
    vid.controls = false;
    vid.play().catch(() => {});
    isPaused = false;

    vid.onloadedmetadata = () => {
      storyDuration = vid.duration * 1000;
      storyStartTime = Date.now();
      progressBar.style.transition = `width ${storyDuration}ms linear`;
      progressBar.style.width = "100%";
    };
    vid.onended = closeStory;
  }

  loadSeenCount(storyId);
}

function closeStory() {
  document.getElementById("storyProgressBar").style.width = "0%";
  if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
  document.getElementById("storyViewer").classList.add("hidden");
  const v = document.getElementById("storyVideo");
  v.pause();
  v.removeAttribute("src");
  v.load();
  loadStories(true); // ring update (bina skeleton flicker ke)
}

function togglePauseStory() {
  const progressBar = document.getElementById("storyProgressBar");
  const vid = document.getElementById("storyVideo");

  if (!isPaused) {
    isPaused = true;
    if (storyTimer) { clearTimeout(storyTimer); storyTimer = null; }
    const elapsed = Date.now() - storyStartTime;
    storyDuration = Math.max(0, storyDuration - elapsed);
    progressBar.style.transition = "none";
    if (vid && !vid.paused) vid.pause();
  } else {
    isPaused = false;
    storyStartTime = Date.now();
    progressBar.style.transition = `width ${storyDuration}ms linear`;
    storyTimer = setTimeout(closeStory, storyDuration);
    if (vid && vid.src) vid.play().catch(() => {});
  }
}
document.getElementById("storyViewer").addEventListener("click", togglePauseStory);

// 🔥 har 30 min expiry check
setInterval(() => { if (firebase.auth().currentUser) loadStories(true); }, 30 * 60 * 1000);

// ---- story views (alag table: story_views) ----
async function saveStoryView(storyId) {
  const user = firebase.auth().currentUser;
  if (!user || !storyId) return;

  const story = window.allStories?.find(s => s.id === storyId);
  if (story && story.user_id === user.uid) return; // apni story ka view nahi

  const { data: already } = await supabaseClient
    .from("story_views").select("id").eq("story_id", storyId).eq("viewer_uid", user.uid).maybeSingle();
  if (already) return;

  const profile = await getPinoraProfile(user.uid);
  if (!profile) return;

  await supabaseClient.from("story_views").insert({
    story_id: storyId,
    viewer_uid: user.uid,
    viewer_username: profile.username,
    viewer_image: profile.image,
    created_at: new Date()
  });
}

async function loadSeenCount(storyId) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const box = document.getElementById("storySeenBy");
  box.classList.add("hidden");

  const story = window.allStories?.find(s => s.id === storyId);
  if (!story || story.user_id !== user.uid) return;

  const { count } = await supabaseClient
    .from("story_views").select("*", { count: "exact", head: true }).eq("story_id", storyId);

  if (count > 0) {
    document.getElementById("seenCount").innerText = count;
    box.classList.remove("hidden");
  }
}

async function openSeenList() {
  const { data } = await supabaseClient
    .from("story_views").select("viewer_uid, viewer_username")
    .eq("story_id", currentStoryId).order("created_at", { ascending: false });

  const list = document.getElementById("seenUsersList");
  const profiles = await Promise.all((data || []).map(u => getPinoraProfile(u.viewer_uid)));
  list.innerHTML = (data || []).map((u, i) => `
    <div class="seen-user">
      <img src="${esc(profiles[i]?.image || "dp.jpg")}">
      <span>${esc(u.viewer_username)}</span>
    </div>`).join("");

  const m = document.getElementById("seenListModal");
  m.classList.remove("hidden");
  setTimeout(() => m.classList.add("show"), 10);
}

function closeSeenList() {
  const m = document.getElementById("seenListModal");
  m.classList.remove("show");
  setTimeout(() => m.classList.add("hidden"), 300);
}