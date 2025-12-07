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

        posts.forEach(post => {
            const box = document.createElement("div");
            box.classList.add("pin-box");

            let media;
            if (post.file_type.startsWith("video")) {
                media = document.createElement("video");
                media.src = post.file_url;
                media.muted = true;
                media.loop = true;
            } else if (post.file_type.startsWith("image")) {
                media = document.createElement("img");
                media.src = post.file_url;
            }

            if (media) {
                media.style.width = "100%";
                media.style.height = "150px";
                media.style.objectFit = "cover";
                media.style.borderRadius = "12px";
                media.style.cursor = "pointer";

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

                    modalTitle.innerText = post.title || "";
                    modal.classList.remove("hidden");

                    // Related videos
                    relatedVideos.innerHTML = "";
                    allPosts.forEach(other => {
                        if (other.id === post.id) return;

                        let related;
                        if (other.file_type.startsWith("video")) {
                            related = document.createElement("video");
                            related.src = other.file_url;
                            related.muted = true;
                            related.loop = true;
                        } else {
                            related = document.createElement("img");
                            related.src = other.file_url;
                        }

                        if (related) {
                            related.style.width = "120px";
                            related.style.height = "70px";
                            related.style.borderRadius = "8px";
                            related.style.cursor = "pointer";

                            related.addEventListener("click", () => {
                                if (other.file_type.startsWith("video")) {
                                    modalVideo.src = other.file_url;
                                    modalVideo.style.display = "block";
                                    modalImage.style.display = "none";
                                } else {
                                    modalImage.src = other.file_url;
                                    modalImage.style.display = "block";
                                    modalVideo.style.display = "none";
                                }
                                modalTitle.innerText = other.title || "";
                            });

                            relatedVideos.appendChild(related);
                        }
                    });
                });

                box.appendChild(media);
                main.appendChild(box);
            }
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

