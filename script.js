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

const login = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).then((result) => {
        userId = result.user.uid;
        userName = result.user.displayName || `User-${Math.floor(Math.random() * 10000)}`;
        document.getElementById("user-name").innerText = `Welcome, ${userName}`;
        loadPosts();
        toggleVisibility("forum-container");
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
                <small>Posted on ${new Date(postData.timestamp.seconds * 1000).toLocaleString()}</small>
            `;
            postsDiv.appendChild(postElement);
        });
    });
};

const toggleVisibility = (id, show = true) => {
    document.getElementById(id).style.display = show ? "block" : "none";
};

function login() {
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("Logged in:", result.user);
            document.getElementById("login-container").style.display = "none"; // Hides login button
            document.getElementById("forum-container").style.display = "block"; // Shows forum
        })
        .catch((error) => {
            console.error("Login Error:", error);
        });
}
