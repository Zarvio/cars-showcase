// Toote hue (404) images ko apne aap default DP bana do
(function () {
  const FALLBACK = "default.jpg";   // agar tumhare paas default.jpg hai to yahan "default.jpg" likh do

  function fix(img) {
    if (img.dataset.fixed === "1") return;
    // sirf profile / dp type images pe lagao, video thumbnails pe nahi
    const cls = img.className || "";
    const isDP =
      /uploaderDP|modalUploaderDP|smallDP|insta-dp|login-avatar|profile-pic|avatar|chat-item|follower-item|comment-item|seen-user/i.test(cls) ||
      img.id === "profilePic" || img.id === "chatUserImg" ||
      img.closest(".follower-item, .comment-item, .seen-user, .story-ring, .chat-item, .user-select-item, .suggestion-item, .notif-item, #groupMembersList");
    if (!isDP) return;

    img.addEventListener("error", function onErr() {
      if (img.src.indexOf(FALLBACK) !== -1) return;   // infinite loop se bachao
      img.dataset.fixed = "1";
      img.src = FALLBACK;
    });

    // agar image pehle hi fail ho chuki hai (load hone se pehle error aa gaya)
    if (img.complete && img.naturalWidth === 0 && img.src) {
      img.dataset.fixed = "1";
      img.src = FALLBACK;
    }
  }

  function scan(root) {
    (root.querySelectorAll ? root.querySelectorAll("img") : []).forEach(fix);
  }

  // jo images dynamic (JS se) banti hain unke liye
  new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType !== 1) return;
      if (n.tagName === "IMG") fix(n); else scan(n);
    }));
  }).observe(document.documentElement, { childList: true, subtree: true });

  // error event bubble nahi hota, isliye capture mein sunte hain (sabse pakka tareeka)
  document.addEventListener("error", function (e) {
    const t = e.target;
    if (t && t.tagName === "IMG") {
      if (t.src.indexOf(FALLBACK) !== -1) return;
      const cls = t.className || "";
      const isDP =
        /uploaderDP|modalUploaderDP|smallDP|insta-dp|login-avatar|profile-pic|avatar|msg-avatar/i.test(cls) ||
        t.id === "profilePic" || t.id === "chatUserImg" ||
        t.closest(".follower-item, .comment-item, .seen-user, .story-ring, .chat-item, .user-select-item, .suggestion-item, .notif-item, #groupMembersList, .avatar-ring, .uploaderOverlay, .modalUploader, .uploaderHeaderSmall");
      if (isDP) t.src = FALLBACK;
    }
  }, true);

  scan(document);
})();