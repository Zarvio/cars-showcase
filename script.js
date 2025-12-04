// Navbar switching effect
const items = document.querySelectorAll(".nav-item");

items.forEach(btn => {
    btn.addEventListener("click", () => {
        items.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
    });
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
document.getElementById("btnUpload").addEventListener("click", () => {
    window.location.href = "upload.html"; // ये पेज तुम बनाओगे
});


const adminBtn = document.getElementById("adminPanelBtn");
const adminPanelBtn = document.getElementById("adminPanelBtn");

// Ctrl + P दबाने पर button दिखाओ
document.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault(); // default print action रोको
        adminPanelBtn.classList.remove("hidden");
    }
});

// Button click → password verify → panel.html
adminPanelBtn.addEventListener("click", () => {
    const pass = prompt("Enter Admin Password:");
    if (pass === "deepak55") {
        window.location.href = "panel.html";
    } else {
        alert("Wrong password!");
    }
});

