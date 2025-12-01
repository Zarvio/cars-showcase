// ------------------ Firebase Config ------------------
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
const loginBox = document.getElementById("loginBox");
const nameBox = document.getElementById("nameBox");
const usernameBox = document.getElementById("usernameBox");
const doneBox = document.getElementById("doneBox");

// Buttons
const googleLoginBtn = document.getElementById("googleLoginBtn");
const saveNameBtn = document.getElementById("saveNameBtn");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");

// Inputs
const firstName = document.getElementById("firstName");
const lastName = document.getElementById("lastName");
const usernameInput = document.getElementById("username");
const errorMsg = document.getElementById("errorMsg");

let currentUser;

// ------------------ GOOGLE LOGIN ------------------
googleLoginBtn.onclick = function () {
    var provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider).then(res => {
        currentUser = res.user;

        // Check if user data already exists
        firebase.database().ref("users/" + currentUser.uid).once("value")
            .then(snapshot => {

                if (snapshot.exists()) {
                    // Already fully set → go to done
                    loginBox.classList.add("hidden");
                    doneBox.classList.remove("hidden");
                } else {
                    // Need to enter name
                    loginBox.classList.add("hidden");
                    nameBox.classList.remove("hidden");
                }
            });

    }).catch(err => alert(err.message));
};

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = user;

        // Check if user data exists
        firebase.database().ref("users/" + currentUser.uid).once("value")
            .then(snapshot => {
                if (snapshot.exists()) {
                    // User already setup → show done/profile
                    loginBox.classList.add("hidden");
                    doneBox.classList.remove("hidden");

                    // Optionally load user profile
                    loadUserProfile(snapshot.val());
                } else {
                    // Need to enter name
                    loginBox.classList.add("hidden");
                    nameBox.classList.remove("hidden");
                }
            });
    } else {
        // User not logged in → show login
        loginBox.classList.remove("hidden");
        nameBox.classList.add("hidden");
        usernameBox.classList.add("hidden");
        doneBox.classList.add("hidden");
    }
});




// ------------------ SAVE NAME ------------------
saveNameBtn.onclick = () => {
    if (firstName.value.trim() === "" || lastName.value.trim() === "") {
        alert("Please enter full name");
        return;
    }

    nameBox.classList.add("hidden");
    usernameBox.classList.remove("hidden");
};

// ------------------ SAVE USERNAME ------------------
saveUsernameBtn.onclick = () => {
    let username = usernameInput.value.trim().toLowerCase();

    if (username.length < 4) {
        errorMsg.innerText = "Username must be at least 4 characters.";
        return;
    }

    // Check if username exists
    firebase.database().ref("usernames/" + username).once("value")
        .then(snapshot => {

            if (snapshot.exists()) {
                errorMsg.innerText = "Username already taken!";
            } else {

                // Save username
                firebase.database().ref("users/" + currentUser.uid).set({
                    name: firstName.value.trim(),
                    surname: lastName.value.trim(),
                    email: currentUser.email,
                    username: username
                });

                // Mark username as used
                firebase.database().ref("usernames/" + username).set(currentUser.uid);

                usernameBox.classList.add("hidden");
                doneBox.classList.remove("hidden");
            }
        });
};
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

function loadUserProfile(userData) {
    document.getElementById("profileBox").classList.remove("hidden");
    document.getElementById("profilePic").src = userData.photoURL || "default.jpg";

    // Load followers/following
    firebase.database().ref("followers/" + currentUser.uid).once("value")
        .then(snap => document.getElementById("followersCount").innerText = "Followers: " + (snap.numChildren() || 0));

    firebase.database().ref("following/" + currentUser.uid).once("value")
        .then(snap => document.getElementById("followingCount").innerText = "Following: " + (snap.numChildren() || 0));
}

// Upload profile photo
document.getElementById("uploadPhoto").onchange = function (e) {
    const file = e.target.files[0];
    const storageRef = firebase.storage().ref("profilePics/" + currentUser.uid);
    storageRef.put(file).then(() => {
        storageRef.getDownloadURL().then(url => {
            document.getElementById("profilePic").src = url;
            firebase.database().ref("users/" + currentUser.uid + "/photoURL").set(url);
        });
    });
};
