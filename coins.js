document.addEventListener("DOMContentLoaded", () => {

  const findBtn = document.getElementById("findUserBtn");
  const foundUserInfo = document.getElementById("foundUserInfo");
  const currentCoins = document.getElementById("currentCoins");
  const coinActions = document.getElementById("coinActions");
  const coinAmount = document.getElementById("coinAmount");
  const coinHistoryDiv = document.getElementById("coinHistory");

  let targetUID = null;

  /* 🔐 Admin check */
  firebase.auth().onAuthStateChanged(async admin => {
    if (!admin) {
      window.location.href = "login.html";
      return;
    }

    const snap = await firebase.database().ref("admins/" + admin.uid).once("value");
    if (!snap.exists()) alert("Access Denied!");
  });

  /* 🔎 Find User */
  findBtn.addEventListener("click", async () => {
    const uname = document.getElementById("searchUsername").value.trim();
    if (!uname) return;

    const snap = await firebase.database().ref("users").once("value");

    let found = false;
    snap.forEach(child => {
      const u = child.val();
      if (u.username === uname) {
        found = true;
        targetUID = child.key;
        foundUserInfo.innerText = "User: " + uname;
        loadCoins();
      }
    });

    if (!found) {
      foundUserInfo.innerText = "User not found!";
      coinActions.classList.add("hidden");
      coinHistoryDiv.innerHTML = "";
    }
  });

  /* 🪙 Load Coins */
  async function loadCoins() {
    const snap = await firebase.database().ref(`userCoins/${targetUID}`).once("value");
    currentCoins.innerText = "Current Coins: " + (snap.val() || 0);
    coinActions.classList.remove("hidden");
    loadHistory();
  }

  /* 🧾 Load History */
  async function loadHistory() {
    coinHistoryDiv.innerHTML = "Loading...";

    const snap = await firebase.database()
      .ref(`coinHistory/${targetUID}`)
      .limitToLast(20)
      .once("value");

    if (!snap.exists()) {
      coinHistoryDiv.innerHTML = "No history found";
      return;
    }

    let html = "";
    snap.forEach(child => {
      const h = child.val();
      const date = new Date(h.time).toLocaleString();
      html += `
        <p>
          ${h.type === "add" ? "➕" : "➖"} ${h.amount} coins
          <br><small>${date}</small>
        </p><hr>`;
    });
    coinHistoryDiv.innerHTML = html;
  }

  /* ➕ Add Coins */
  document.getElementById("addCoinsBtn").onclick = async () => {
    const amt = Number(coinAmount.value);
    if (!amt || !targetUID) return;

    await firebase.database().ref(`userCoins/${targetUID}`).transaction(c => (Number(c||0)+amt));
    await firebase.database().ref(`coinHistory/${targetUID}`).push({
      type: "add", amount: amt, time: Date.now()
    });
    loadCoins();
  };

  /* ➖ Remove Coins */
  document.getElementById("removeCoinsBtn").onclick = async () => {
    const amt = Number(coinAmount.value);
    if (!amt || !targetUID) return;

    await firebase.database().ref(`userCoins/${targetUID}`).transaction(c => Math.max(0, (Number(c||0)-amt)));
    await firebase.database().ref(`coinHistory/${targetUID}`).push({
      type: "remove", amount: amt, time: Date.now()
    });
    loadCoins();
  };

}); // DOMContentLoaded end
