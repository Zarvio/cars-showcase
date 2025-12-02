// Bottom nav redirects
document.getElementById("btnHome").addEventListener("click", () => {
    window.location.href = "index.html";
});

document.getElementById("btnSearch").addEventListener("click", () => {
    window.location.href = "search.html";
});

document.getElementById("btnUpload").addEventListener("click", () => {
    window.location.href = "upload.html";
});

document.getElementById("btnNotifs").addEventListener("click", () => {
    window.location.href = "notification.html";
});

document.getElementById("btnProfile").addEventListener("click", () => {
    window.location.href = "profile.html";
});

// Simple Upload Form Handler
document.getElementById("uploadForm").addEventListener("submit", function(e){
    e.preventDefault();
    let title = document.getElementById("pinTitle").value;
    let url = document.getElementById("pinURL").value;
    alert("Uploaded: " + title + "\n" + url);
    this.reset();
});
