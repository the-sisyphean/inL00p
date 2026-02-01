// app.js

// 1. Import Functions (Logic) from the Internet (CDN)
import { 
    collection, addDoc, getDocs, doc, getDoc, updateDoc, deleteDoc, query, where, setDoc, arrayUnion 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { 
    onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { 
    ref, uploadString, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/9.22.1/firebase-storage.js";

// 2. Import the Database Connection from YOUR file
// (Make sure the path "./firebase.js" is correct)
import { db, auth } from "./firebase.js"; 

// --- GLOBAL STATE ---
let currentUser = null;
let myAdminClubId = null; 
let allClubsData = [];
let eventsData = [];
let currMonth = new Date().getMonth();
let currYear = new Date().getFullYear();
let currentCategoryFilter = 'all';

// --- 3. AUTH STATE LISTENER (The Router) ---
onAuthStateChanged(auth, async (user) => {
    const isLoginPage = document.getElementById('loginFormContainer');
    
    if (user) {
        currentUser = user;
        console.log("User Logged In:", user.email);
        
        // CRITICAL: Ensure user is saved in DB for Admin lookup
        await ensureUserInDB(user);

        if (isLoginPage) {
            window.location.href = "home.html"; // Redirect to app
        } else {
            // We are inside the app, load data
            await checkAdminStatus(user.uid);
            setupUI();
        }
    } else {
        console.log("No user logged in");
        if (!isLoginPage) {
            window.location.href = "index.html"; // Redirect to login
        } else {
            setupLoginListeners(); // Setup login page buttons
        }
    }
});

// --- 4. LOGIN / SIGNUP LOGIC (Index.html) ---

function setupLoginListeners() {
    // Helper to toggle UI
    window.toggleAuthMode = (mode) => {
        const loginBtn = document.getElementById('showLoginBtn');
        const signupBtn = document.getElementById('showSignupBtn');
        const loginForm = document.getElementById('loginFormContainer');
        const signupForm = document.getElementById('signupFormContainer');

        if(mode === 'login') {
            loginForm.classList.remove('hidden');
            signupForm.classList.add('hidden');
            loginBtn.className = "btn btn-active";
            signupBtn.className = "btn btn-inactive";
        } else {
            loginForm.classList.add('hidden');
            signupForm.classList.remove('hidden');
            loginBtn.className = "btn btn-inactive";
            signupBtn.className = "btn btn-active";
        }
    };

    // Handle Login
    const loginForm = document.getElementById('loginForm');
    if(loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const pass = document.getElementById('loginPass').value;
            try {
                await signInWithEmailAndPassword(auth, email, pass);
                // Listener handles redirect
            } catch (error) { alert("Login Failed: " + error.message); }
        });
    }

    // Handle Signup
    const signupForm = document.getElementById('signupForm');
    if(signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const pass = document.getElementById('signupPass').value;
            try {
                await createUserWithEmailAndPassword(auth, email, pass);
                // Listener handles DB sync and redirect
            } catch (error) { alert("Signup Failed: " + error.message); }
        });
    }

    // Handle Google
    const googleBtn = document.getElementById('googleLoginBtn');
    if(googleBtn) {
        googleBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
            } catch (error) { console.error(error); }
        });
    }
}

// --- 5. CORE DATABASE FUNCTIONS ---

// Sync User to 'users' collection (Necessary for "Add Admin" feature)
async function ensureUserInDB(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        // setDoc with merge:true updates if exists, creates if not
        await setDoc(userRef, { 
            email: user.email, 
            uid: user.uid 
        }, { merge: true });
    } catch(e) { console.error("Error syncing user to DB:", e); }
}

// Check if User is an Admin of any club
async function checkAdminStatus(uid) {
    const q = query(collection(db, "clubs"), where("admins", "array-contains", uid));
    const snap = await getDocs(q);

    if (!snap.empty) {
        const clubDoc = snap.docs[0];
        myAdminClubId = clubDoc.id;
        
        // Show Admin Section in Sidebar
        const adminSection = document.getElementById('adminToolsSection');
        if(adminSection) {
            adminSection.classList.remove('admin-only');
            adminSection.classList.add('is-admin-visible');
            document.getElementById('adminClubName').innerText = `Managing: ${clubDoc.data().name}`;
        }
    } else {
        myAdminClubId = null;
    }
}

// --- 6. MAIN APP UI SETUP ---

function setupUI() {
    const path = window.location.pathname;

    const emailDisp = document.getElementById('user-email-display');
    if(emailDisp) emailDisp.textContent = currentUser.email;

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.onclick = () => signOut(auth);

    if (path.includes('home.html')) loadHomeData();
    else if (path.includes('clubs.html')) loadClubs();
    else if (path.includes('club_details.html')) loadClubDetails();
}

// --- 7. HOME PAGE LOGIC (Feed + Admin Tools) ---

async function loadHomeData() {
    // Load Events Today
    const today = new Date().toISOString().split('T')[0];
    const q = query(collection(db, "events"), where("date", "==", today));
    const snap = await getDocs(q);
    const list = document.getElementById('happening-today-list');
    
    if(list) {
        list.innerHTML = '';
        if(snap.empty) list.innerHTML = '<p style="color:#666">No events today.</p>';
        snap.forEach(d => {
            const evt = d.data();
            list.innerHTML += `<div style="background:#2a2a2a; padding:10px; border-radius:5px; margin-bottom:5px; border-left:3px solid var(--primary)">
                <strong>${evt.title}</strong> <span style="float:right; color:#888">${evt.time}</span>
            </div>`;
        });
    }

    // Add Admin Form Listener
    const addAdminForm = document.getElementById('addAdminForm');
    if(addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('newAdminEmail').value.trim();
            
            if(!myAdminClubId) return alert("You don't have a club to manage.");

            try {
                // Find User UID by Email
                const userQuery = query(collection(db, "users"), where("email", "==", email));
                const userSnap = await getDocs(userQuery);

                if(userSnap.empty) return alert("User not found. They must log in to the app once.");

                const newAdminUid = userSnap.docs[0].data().uid;

                // Update Club
                await updateDoc(doc(db, "clubs", myAdminClubId), {
                    admins: arrayUnion(newAdminUid)
                });

                alert(`${email} added as admin!`);
                closeModals();
            } catch(err) { console.error(err); alert("Failed to add admin."); }
        });
    }
}

// --- 8. CLUBS PAGE LOGIC ---

async function loadClubs() {
    const grid = document.getElementById('clubs-grid');
    if(!grid) return;

    // Search Listener
    document.getElementById('searchInput').addEventListener('keyup', filterAndRenderClubs);

    // Fetch Data
    const snap = await getDocs(collection(db, "clubs"));
    allClubsData = [];
    let isUserAdminOfAny = false;

    snap.forEach(doc => {
        const data = doc.data();
        const isMyClub = data.admins && data.admins.includes(currentUser.uid);
        if(isMyClub) isUserAdminOfAny = true;
        allClubsData.push({ id: doc.id, ...data, isMyClub });
    });

    // Toggle Create Button
    const createBtn = document.getElementById('createClubBtn');
    if(createBtn) {
        // Hide if user is already an admin (Max 1 club rule)
        if(isUserAdminOfAny) {
            createBtn.classList.add('admin-only');
            createBtn.classList.remove('is-admin-visible');
        } else {
            createBtn.classList.remove('admin-only');
            createBtn.classList.add('is-admin-visible');
        }
    }

    filterAndRenderClubs();
}

function filterAndRenderClubs() {
    const grid = document.getElementById('clubs-grid');
    const term = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allClubsData.filter(c => {
        return (currentCategoryFilter === 'all' || c.category === currentCategoryFilter) &&
               c.name.toLowerCase().includes(term);
    });

    grid.innerHTML = '';
    if(filtered.length === 0) {
        grid.innerHTML = '<p style="text-align:center">No clubs found.</p>'; return;
    }

    filtered.forEach(c => {
        const safeData = JSON.stringify(c).replace(/"/g, '&quot;').replace(/'/g, "\\'");
        
        // Edit Button only for Club Admin
        const editBtn = c.isMyClub 
            ? `<div onclick="event.stopPropagation(); openEditClubModal('${c.id}', ${safeData})" style="cursor:pointer; position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); padding:8px; border-radius:50%; color:white;"><i class="fas fa-pencil-alt"></i></div>`
            : '';
            
        let bgStyle = c.image ? `background-image:url('${c.image}'); background-size:cover;` : `background:linear-gradient(45deg, ${c.color}, #111);`;

        const div = document.createElement('div');
        div.className = 'club-card';
        div.onclick = () => window.location.href = `club_details.html?id=${c.id}`;
        div.innerHTML = `
            ${editBtn}
            <div class="club-banner" style="${bgStyle}"></div>
            <div class="club-card-body">
                <h4>${c.name}</h4>
                <p style="font-size:0.8rem; color:#aaa">${c.description}</p>
                <span class="badge" style="background:${c.color}">${c.category}</span>
            </div>
        `;
        grid.appendChild(div);
    });
}

// --- 9. CLUB DETAILS LOGIC ---

async function loadClubDetails() {
    const params = new URLSearchParams(window.location.search);
    const clubId = params.get('id');
    if(!clubId) return;

    window.currentClubId = clubId;

    const docRef = doc(db, "clubs", clubId);
    const snap = await getDoc(docRef);
    
    if(snap.exists()) {
        const data = snap.data();
        
        document.getElementById('headerClubName').textContent = data.name;
        document.getElementById('detailClubName').textContent = data.name;
        document.getElementById('detailCategory').textContent = data.category;
        document.getElementById('detailCategory').style.background = data.color;
        document.getElementById('detailDesc').textContent = data.description;

        // Check Permissions
        const isAdmin = data.admins && data.admins.includes(currentUser.uid);
        window.isCurrentClubAdmin = isAdmin;

        if(isAdmin) {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.classList.remove('admin-only');
                el.classList.add('is-admin-visible');
            });
        }
        renderCalendar();
    }
}

// --- 10. CALENDAR & EVENTS LOGIC ---

window.renderCalendar = async () => {
    let q = query(collection(db, "events"));
    if(window.currentClubId) {
        q = query(collection(db, "events"), where("clubId", "==", window.currentClubId));
    }
    const snap = await getDocs(q);
    eventsData = [];
    snap.forEach(d => eventsData.push({id: d.id, ...d.data()}));

    const calDays = document.getElementById('calendarDays');
    if(calDays) {
        calDays.innerHTML = '';
        const firstDay = new Date(currYear, currMonth, 1).getDay();
        const daysInMonth = new Date(currYear, currMonth + 1, 0).getDate();
        
        document.getElementById('monthLabel').innerText = new Date(currYear, currMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

        for(let i=0; i<firstDay; i++) calDays.innerHTML += `<div></div>`;
        for(let i=1; i<=daysInMonth; i++) {
            const dateKey = `${currYear}-${String(currMonth+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
            const hasEvent = eventsData.some(e => e.date === dateKey);
            const dot = hasEvent ? '<div class="event-dot"></div>' : '';
            calDays.innerHTML += `<div onclick="openDayModal(${i})">${i}${dot}</div>`;
        }
    }
}

window.openDayModal = (day) => {
    const list = document.getElementById('modalEventList');
    list.innerHTML = '';
    const dateKey = `${currYear}-${String(currMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    document.getElementById('modalDateTitle').innerText = dateKey;

    const evts = eventsData.filter(e => e.date === dateKey);
    if(evts.length === 0) list.innerHTML = '<p style="text-align:center;color:#666">No events.</p>';

    evts.forEach(evt => {
        const safe = JSON.stringify(evt).replace(/"/g, '&quot;');
        const actions = window.isCurrentClubAdmin ? `
            <div class="event-actions">
                <i class="fas fa-pencil-alt" onclick="openEditEventModal(${safe})"></i>
                <i class="fas fa-trash" onclick="deleteEvent('${evt.id}')"></i>
            </div>` : '';
            
        list.innerHTML += `<div class="event-list-item">
            <div><strong>${evt.title}</strong><br><small>${evt.time}</small></div>
            ${actions}
        </div>`;
    });
    document.getElementById('eventModal').classList.remove('hidden');
}

// --- 11. MODAL HANDLERS & FORMS ---

// Create Club
const createClubForm = document.getElementById('createClubForm');
if(createClubForm) {
    createClubForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('clubName').value;
        const category = document.getElementById('clubCategory').value;
        const color = document.getElementById('clubColor').value;
        const desc = document.getElementById('clubDesc').value;
        const fileInput = document.getElementById('clubImageFile');
        
        let imageUrl = "";
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async function(e) {
                await addDoc(collection(db, "clubs"), {
                    name, category, color, description: desc, image: e.target.result,
                    admins: [currentUser.uid]
                });
                window.location.reload();
            };
            reader.readAsDataURL(file);
        } else {
            await addDoc(collection(db, "clubs"), {
                name, category, color, description: desc, image: "",
                admins: [currentUser.uid]
            });
            window.location.reload();
        }
    });
}

// Edit Club
window.openEditClubModal = (id, data) => {
    document.getElementById('editClubId').value = id;
    document.getElementById('editClubName').value = data.name;
    document.getElementById('editClubCategory').value = data.category;
    document.getElementById('editClubColor').value = data.color;
    document.getElementById('editClubDesc').value = data.description;
    document.getElementById('existingClubImage').value = data.image || "";
    document.getElementById('editClubModal').classList.remove('hidden');
}

const editClubForm = document.getElementById('editClubForm');
if(editClubForm) {
    editClubForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = document.getElementById('editClubId').value;
        const fileInput = document.getElementById('editClubImageFile');
        let img = document.getElementById('existingClubImage').value;

        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                await updateDoc(doc(db, "clubs", id), {
                    name: document.getElementById('editClubName').value,
                    category: document.getElementById('editClubCategory').value,
                    color: document.getElementById('editClubColor').value,
                    description: document.getElementById('editClubDesc').value,
                    image: e.target.result
                });
                window.location.reload();
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            await updateDoc(doc(db, "clubs", id), {
                name: document.getElementById('editClubName').value,
                category: document.getElementById('editClubCategory').value,
                color: document.getElementById('editClubColor').value,
                description: document.getElementById('editClubDesc').value,
            });
            window.location.reload();
        }
    });
}

// Add Event
const newEventForm = document.getElementById('newEventForm');
if(newEventForm) {
    newEventForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        await addDoc(collection(db, "events"), {
            title: document.getElementById('evtTitle').value,
            date: document.getElementById('evtDate').value,
            time: document.getElementById('evtTime').value,
            category: document.getElementById('evtCategory').value,
            clubId: window.currentClubId
        });
        closeModals();
        renderCalendar();
    });
}

// Edit Event Logic
window.openEditEventModal = (evt) => {
    document.getElementById('eventModal').classList.add('hidden');
    document.getElementById('editEvtId').value = evt.id;
    document.getElementById('editEvtTitle').value = evt.title;
    document.getElementById('editEvtDate').value = evt.date;
    document.getElementById('editEvtTime').value = evt.time;
    document.getElementById('editEvtCategory').value = evt.category;
    document.getElementById('editEventModal').classList.remove('hidden');
}

const editEventForm = document.getElementById('editEventForm');
if(editEventForm) {
    editEventForm.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = document.getElementById('editEvtId').value;
        await updateDoc(doc(db, "events", id), {
            title: document.getElementById('editEvtTitle').value,
            date: document.getElementById('editEvtDate').value,
            time: document.getElementById('editEvtTime').value,
            category: document.getElementById('editEvtCategory').value
        });
        closeModals();
        renderCalendar();
    });
}

window.deleteEvent = async (id) => {
    if(confirm("Delete event?")) {
        await deleteDoc(doc(db, "events", id));
        closeModals();
        renderCalendar();
    }
}

// Global Helpers
window.openCreateClubModal = () => document.getElementById('createClubModal').classList.remove('hidden');
window.openAddAdminModal = () => document.getElementById('addAdminModal').classList.remove('hidden');
window.openAddEventModal = () => document.getElementById('addEventModal').classList.remove('hidden');
window.openAddResourceModal = () => document.getElementById('addResourceModal').classList.remove('hidden');
window.closeModals = () => document.querySelectorAll('.event-modal').forEach(m => m.classList.add('hidden'));
window.switchClubTab = (cat) => {
    currentCategoryFilter = cat;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    filterAndRenderClubs();
}
window.goToToday = () => {
    const d = new Date();
    currMonth = d.getMonth();
    currYear = d.getFullYear();
    renderCalendar();
}
window.changeMonth = (d) => {
    currMonth += d;
    renderCalendar();
}