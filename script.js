// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyArgnPP7ZPdO86qT1wm7wqw_qS_IhNW1qk",
    authDomain: "lv1w-29520.firebaseapp.com",
    projectId: "lv1w-29520",
    storageBucket: "lv1w-29520.firebasestorage.app",
    messagingSenderId: "574419777057",
    appId: "1:574419777057:web:47db3d4ef8de155d269560",
    measurementId: "G-1QXRLXB33N"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// User authentication and posts logic
let userId = null;
let userName = null;

// Restore login on page reload
auth.onAuthStateChanged(async (user) => {
    if (user) {
        userId = user.uid;

        // Check if username is saved in Firestore
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
            userName = userDoc.data().name;
        } else {
            // Ask for username only once
            let nameInput = "";
            while (!nameInput.trim()) {
                nameInput = prompt("What do you want to be called?");
            }
            userName = nameInput.trim();
            await db.collection("users").doc(userId).set({ name: userName });
        }

        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        loadPosts();
        toggleVisibility("forum-container");
        toggleVisibility("login-container", false);
    } else {
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
    }
});

const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then(async (result) => {
        userId = result.user.uid;

        // Check if username exists in Firestore
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
            userName = userDoc.data().name;
        } else {
            // Ask for username the first time
            let nameInput = "";
            while (!nameInput.trim()) {
                nameInput = prompt("What do you want to be called?");
            }
            userName = nameInput.trim();
            await db.collection("users").doc(userId).set({ name: userName });
        }

        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        loadPosts();
        toggleVisibility("forum-container");
        toggleVisibility("login-container", false); // Hide login after successful login
    }).catch((error) => {
        console.error("Login Error: ", error);
    });
};

const logout = () => {
    auth.signOut().then(() => {
        toggleVisibility("login-container");
        toggleVisibility("forum-container", false);
    }).catch((error) => {
        console.error("Logout Error: ", error);
    });
};

const submitPost = () => {
    const postText = document.getElementById("post-text").value;
    if (postText.trim() !== "") {
        db.collection("posts").add({
            userId: userId,
            userName: userName,
            content: postText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            document.getElementById("post-text").value = "";
            loadPosts();
        });
    }
};

const loadPosts = () => {
    db.collection("posts").orderBy("timestamp", "desc").get().then((querySnapshot) => {
        const postsDiv = document.getElementById("posts");
        postsDiv.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const postData = doc.data();
            const postElement = document.createElement("div");
            postElement.innerHTML = `
                <h3>${postData.userName}</h3>
                <p>${postData.content}</p>
                <small>Posted on ${postData.timestamp ? new Date(postData.timestamp.seconds * 1000).toLocaleString() : "Unknown"}</small>
            `;
            postsDiv.appendChild(postElement);
        });
    });
};

const toggleVisibility = (id, show = true) => {
    document.getElementById(id).style.display = show ? "block" : "none";
};
