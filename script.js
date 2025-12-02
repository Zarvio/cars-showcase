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
