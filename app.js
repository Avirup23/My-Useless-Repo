import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAO_pnpn8XrUsg5foSwDc1Ef2anwYlxDG0",
    authDomain: "i-have-some-thoughts.firebaseapp.com",
    projectId: "i-have-some-thoughts",
    storageBucket: "i-have-some-thoughts.firebasestorage.app",
    messagingSenderId: "1074938809862",
    appId: "1:1074938809862:web:3c5c1ca040e6163dc83d87"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const postsRef = collection(db, "posts");

window.submitPost = async () => {
  const text = document.getElementById("postText").value;
  if (!text) return;

  await addDoc(postsRef, {
    content: text,
    createdAt: new Date(),
    author: "anonymous"
  });

  document.getElementById("postText").value = "";
  loadPosts();
};

async function loadPosts() {
  const q = query(postsRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  const div = document.getElementById("posts");
  div.innerHTML = "";

  snapshot.forEach(doc => {
    const p = document.createElement("div");
    p.className = "post";
    p.textContent = doc.data().content;
    div.appendChild(p);
  });
}

loadPosts();
