import { ref } from 'vue'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/firebase'

export const currentUser = ref<any>(null)
export const loadingAuth = ref(true)

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snap = await getDoc(doc(db, 'users', user.uid))
    currentUser.value = snap.exists() ? snap.data() : null
  } else {
    currentUser.value = null
  }
  loadingAuth.value = false
})
