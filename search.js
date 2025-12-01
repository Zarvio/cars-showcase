document.addEventListener("DOMContentLoaded", function() {
    // Dummy sample thumbnails
    const sampleVideos = [
        "https://i.imgur.com/3y5QZ4F.jpeg",
        "https://i.imgur.com/5ZQXYZ7.jpeg",
        "https://i.imgur.com/H7TrF6E.jpeg",
        "https://i.imgur.com/sWQ2Qpt.jpeg",
        "https://i.imgur.com/DLQow0m.jpeg",
        "https://i.imgur.com/9Y1QVoG.jpeg"
    ];

    const resultsGrid = document.getElementById("resultsGrid");
    const searchInput = document.getElementById("searchInput");

    function loadVideos(videos = sampleVideos) {
        resultsGrid.innerHTML = "";
        videos.forEach(src => {
            let box = document.createElement("div");
            box.className = "video";
            box.innerHTML = `<img src="${src}" alt="Video Thumbnail">`;
            resultsGrid.appendChild(box);
        });
    }

    loadVideos();

    // Search Filter
    searchInput.addEventListener("input", () => {
        let val = searchInput.value.toLowerCase();
        if (val === "") {
            loadVideos();
            return;
        }

        let filtered = sampleVideos.filter(v => v.toLowerCase().includes(val));
        loadVideos(filtered);
    });

  // Navigation Buttons Redirect

document.getElementById("btnHome").addEventListener("click", () => {
    window.location.href = "index.html";
});

document.getElementById("btnSearch").addEventListener("click", () => {
    window.location.href = "search.html";
});

document.getElementById("btnNotifs").addEventListener("click", () => {
    window.location.href = "notification.html"; // बाद में बनायेंगे
});

document.getElementById("btnProfile").addEventListener("click", () => {
    window.location.href = "profile.html"; // बाद में बनायेंगे
});

});
