// src/firebase.ts
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCYhKJTHizmnE630rHbaXghLgLJ1z32zAg',
  authDomain: 'gotrans-d9239.firebaseapp.com',
  projectId: 'gotrans-d9239',
  storageBucket: 'gotrans-d9239.appspot.com',
  messagingSenderId: '626680036538',
  appId: '1:626680036538:web:0cbf558d1d935f89f3d683',
}

const app = initializeApp(firebaseConfig)

// ⛔ BẮT BUỘC export
export const auth = getAuth(app)
export const db = getFirestore(app)
