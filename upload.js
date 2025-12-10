document.addEventListener("DOMContentLoaded", () => {

  const SUPABASE_URL = "https://lxbojhmvcauiuxahjwzk.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4Ym9qaG12Y2F1aXV4YWhqd3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5MzM3NjEsImV4cCI6MjA4MDUwOTc2MX0.xP1QCzWIwnWFZArsk_5C8wCz7vkPrmwmLJkEThT74JA";
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const uploadForm = document.getElementById("uploadForm");
  const fileInput = document.getElementById("pinFile");
  const previewBox = document.getElementById("previewBox");

  const selectBtn = document.getElementById("selectFileBtn");
  const fileNameText = document.getElementById("fileName");

  const popup = document.getElementById("uploadPopup");
  const progressFill = document.getElementById("progressFill");
  const uploadStatus = document.getElementById("uploadStatus");

  // Open file selector
  selectBtn.addEventListener("click", () => {
    fileInput.click();
  });

  // Show name + preview
  fileInput.addEventListener("change", () => {
    previewBox.innerHTML = "";
    const file = fileInput.files[0];
    if (!file) return;

    fileNameText.innerText = file.name;

    const url = URL.createObjectURL(file);

    if (file.type.startsWith("video")) {
      previewBox.innerHTML = `<video src="${url}" controls style="width:100%;border-radius:12px;"></video>`;
    } else {
      previewBox.innerHTML = `<img src="${url}" style="width:100%;border-radius:12px;">`;
    }
  });

  function makeSafeFileName(name) {
    return name.replace(/[^\w\-\.]/g, '_').substring(0, 100);
  }

  // 🔹 Firebase Auth check
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      alert("Please login first!");
      if (uploadForm) uploadForm.querySelector("button[type='submit']").disabled = true;
      return;
    }

    if (uploadForm) uploadForm.querySelector("button[type='submit']").disabled = false;

    // Upload handler
    uploadForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const userRef = firebase.database().ref("users/" + user.uid);
      const userSnap = await userRef.once("value");
      const userData = userSnap.val();

      const uploaderName = userData?.username || "Unknown";
      const uploaderImg  = userData?.photoURL || "https://i.ibb.co/album/default.jpg";

      const title = document.getElementById("pinTitle").value;
      const file = fileInput.files[0];
      if (!file) return alert("Select file first!");

      popup.classList.remove("hidden");
      uploadStatus.innerText = "Uploading...";
      progressFill.style.width = "0%";

      const safeFileName = makeSafeFileName(file.name);
      const filePath = `uploads/${Date.now()}-${safeFileName}`;

      let percent = 0;
      const interval = setInterval(() => {
        if (percent < 90) {
          percent += 5;
          progressFill.style.width = percent + "%";
        }
      }, 200);

      // Upload main file
      const { error: uploadError } = await supabaseClient
        .storage.from("Zarvio")
        .upload(filePath, file);

      if (uploadError) {
        clearInterval(interval);
        uploadStatus.innerText = "Upload failed!";
        return;
      }

      const { data: publicURL } = supabaseClient.storage
        .from("Zarvio")
        .getPublicUrl(filePath);

      const fileUrl = publicURL.publicUrl;

      // Generate thumbnail if video
      let thumbUrl = null;
      if (file.type.startsWith('video')) {
        try {
          const thumbBlob = await generateVideoThumbnail(file);
          const thumbPath = `thumbnails/${Date.now()}-${safeFileName}.jpg`;

          const { error: thumbError } = await supabaseClient
            .storage.from("Zarvio")
            .upload(thumbPath, thumbBlob);

          if (!thumbError) {
            const { data: thumbData } = supabaseClient.storage
              .from("Zarvio")
              .getPublicUrl(thumbPath);
            thumbUrl = thumbData.publicUrl;
          }
        } catch(err) {
          console.error("Thumbnail generation failed:", err);
        }
      }

      // Save to database
      const { error } = await supabaseClient
        .from("pinora823")
        .insert([{
          title: title,
          file_url: fileUrl,
          thumb_url: thumbUrl,
          file_type: file.type,
          created_at: new Date().toISOString(),
          uploader_uid: user.uid,
          uploader_name: uploaderName,
          uploader_image: uploaderImg
        }]);

      clearInterval(interval);
      progressFill.style.width = "100%";

      if (error) {
        uploadStatus.innerText = "Database error!";
        return;
      }

      uploadStatus.innerText = "Uploaded Successfully ✔️";
      uploadStatus.style.color = "black";

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1500);
    });
  });

  // Navigation
  document.getElementById("btnHome")?.addEventListener("click", () => window.location.href = "index.html");
  document.getElementById("btnSearch")?.addEventListener("click", () => window.location.href = "search.html");
  document.getElementById("btnNotifs")?.addEventListener("click", () => window.location.href = "notification.html");
  document.getElementById("btnProfile")?.addEventListener("click", () => window.location.href = "profile.html");
  document.getElementById("btnUpload")?.addEventListener("click", () => window.location.href = "upload.html");

  // Thumbnail generator function
  async function generateVideoThumbnail(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);
      video.muted = true;
      video.currentTime = 1;

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      };

      video.onerror = (e) => reject(e);
    });
  }

});
