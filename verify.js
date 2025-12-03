// ---- Firebase Init ----
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

// Elements
const searchBtn = document.getElementById("searchBtn");
const verifyBtn = document.getElementById("verifyBtn");
const userIdInput = document.getElementById("userIdInput");
const resultBox = document.getElementById("resultBox");
const userImg = document.getElementById("userImg");
const userName = document.getElementById("userName");
const verifyBadge = document.getElementById("verifyBadge");

let searchedUID = null;


// ----------------- SEARCH USER -----------------
searchBtn.addEventListener("click", async () => {
    const uid = userIdInput.value.trim();
    if (!uid) return alert("Enter user UID");

    searchedUID = uid;

    const snap = await firebase.database().ref("users/" + uid).once("value");

    if (!snap.exists()) {
        alert("User not found");
        return;
    }

    let data = snap.val();

    // Show info
    userImg.src = data.photoURL || "default.jpg";
    userName.innerText = data.username || "Unknown";

    resultBox.classList.remove("hidden");
    verifyBtn.classList.remove("hidden");

    // Check if already verified
    if (data.verified === true) {
        verifyBadge.classList.remove("hidden");
        verifyBtn.innerText = "Already Verified";
        verifyBtn.disabled = true;
    } else {
        verifyBadge.classList.add("hidden");
        verifyBtn.innerText = "Add Verify Badge";
    }
});


// ----------------- ADD VERIFY BADGE -----------------
verifyBtn.addEventListener("click", async () => {
    if (!searchedUID) return;

    await firebase.database().ref("users/" + searchedUID).update({
        verified: true
    });

    verifyBadge.classList.remove("hidden");
    verifyBtn.innerText = "Verified ✔";
    verifyBtn.disabled = true;

    alert("User Verified Successfully!");
});
if (data.verified === true) {
    displayUsername.innerHTML = "@" + data.username + 
        ' <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" style="width:16px;margin-left:4px;">';
} else {
    displayUsername.innerText = "@" + data.username;
}

db.ref("users/" + uid).once("value").then(snapshot => {
    if(snapshot.exists()) {
        const u = snapshot.val();
        console.log(u); // ✅ Debug → check kya u.verified true hai ya nahi

        document.getElementById("profilePhoto").src = u.photoURL || "default.jpg";

        if(u.verified === true) {
            document.getElementById("username").innerHTML = "@" + u.username + 
                ' <img src="verify-icon.png" width="16" style="margin-left:4px;">';
        } else {
            document.getElementById("username").innerText = "@" + u.username;
        }

        document.getElementById("name").innerText = (u.name || "") + " " + (u.surname || "");
    }
});
