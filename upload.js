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

  uploadForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("pinTitle").value;
    const file = fileInput.files[0];
    if (!file) return alert("Select file first!");

    // Show popup
    popup.classList.remove("hidden");
    uploadStatus.innerText = "Uploading...";
    progressFill.style.width = "0%";

    const safeFileName = makeSafeFileName(file.name);
    const filePath = `uploads/${Date.now()}-${safeFileName}`;

    // ✅ Fake progress animation (Supabase JS doesn't give real progress)
    let percent = 0;
    const interval = setInterval(() => {
      if (percent < 90) {
        percent += 5;
        progressFill.style.width = percent + "%";
      }
    }, 200);

    // Upload
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

    // Save to db
    const { error } = await supabaseClient
      .from("pinora823")
      .insert([{
        title: title,
        file_url: fileUrl,
        file_type: file.type,
        created_at: new Date().toISOString()
      }]);

    clearInterval(interval);
    progressFill.style.width = "100%";

    if (error) {
      uploadStatus.innerText = "Database error!";
      return;
    }

    // Success
   uploadStatus.innerText = "Video successfully uploaded ✅";
uploadStatus.style.color = "black";


    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  });




    // Navigation
    document.getElementById("btnHome")?.addEventListener("click", () => window.location.href = "index.html");
    document.getElementById("btnSearch")?.addEventListener("click", () => window.location.href = "search.html");
    document.getElementById("btnNotifs")?.addEventListener("click", () => window.location.href = "notification.html");
    document.getElementById("btnProfile")?.addEventListener("click", () => window.location.href = "profile.html");
    document.getElementById("btnUpload")?.addEventListener("click", () => window.location.href = "upload.html");
});
