import { auth, db, provider } from './firebase.js'; 
import { 
    signInWithRedirect, signInWithPopup, signOut, onAuthStateChanged, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { 
    collection, addDoc, getDocs, onSnapshot, doc, getDoc, updateDoc,
    query, where, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- GLOBAL STATE ---
let currentDate = new Date();
let calendarEvents = [];
let currentPageClubId = null; 
let currentPageClubName = null; 
let currentUser = null; 

// --- 1. AUTH CHECKER & REDIRECT LOGIC ---
onAuthStateChanged(auth, (user) => {
    const path = window.location.pathname;
    // precise check for login page
    const isLoginPage = path.includes('index.html') || path === '/' || path.endsWith('/');

    if (user) {
        currentUser = user; 
        // If logged in but on login page -> Go to Home
        if (isLoginPage) {
            window.location.href = "home.html";
        } else {
            // If on home/club pages -> Start App
            initApp(user);
        }
    } else {
        // If not logged in and NOT on login page -> Go to Login
        if (!isLoginPage) {
            window.location.href = "index.html";
        }
    }
});

// --- 2. PAGE INITIALIZATION ---
function initApp(user) {
    const urlParams = new URLSearchParams(window.location.search);
    currentPageClubId = urlParams.get('id');

    setupUI(user);

    // A. HOME PAGE (My Schedule)
    if (document.getElementById('my-schedule-list')) {
        loadMySchedule(user.uid);
    }

    // B. CLUBS GRID PAGE
    if (document.getElementById('clubs-grid')) {
        loadClubs();
        setupClubForms();
    }

    // C. CALENDAR
    if (document.getElementById('calendarDays')) {
        startCalendarListener(); 
        const evtForm = document.getElementById("newEventForm");
        if(evtForm) evtForm.addEventListener("submit", (e) => handleAddEvent(e));
    }

    // D. CLUB DETAILS PAGE
    if (document.getElementById('detailClubName')) {
        if(currentPageClubId) {
            loadClubDetails(currentPageClubId);
            if(document.getElementById('resourcesList')) loadResources(currentPageClubId);
        }
        const resForm = document.getElementById("newResourceForm");
        if(resForm) resForm.addEventListener("submit", (e) => handleAddResource(e, currentPageClubId));
    }
}

function setupUI(user) {
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) logoutBtn.addEventListener('click', () => signOut(auth));

    const emailDisplay = document.getElementById('user-email-display');
    if(emailDisplay) emailDisplay.textContent = user.email;

    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    if(menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (!sidebar.contains(e.target) && !menuBtn.contains(e.target) && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
        });
    }
}

function setupClubForms() {
    const clubForm = document.getElementById("createClubForm");
    if(clubForm) clubForm.addEventListener("submit", handleCreateClub);
    const editForm = document.getElementById("editClubForm");
    if(editForm) editForm.addEventListener("submit", handleUpdateClub);
}

// --- 3. LOGIN / SIGNUP FUNCTIONS ---
window.toggleAuthMode = (mode) => {
    const login = document.getElementById('loginFormContainer');
    const signup = document.getElementById('signupFormContainer');
    const lBtn = document.getElementById('showLoginBtn');
    const sBtn = document.getElementById('showSignupBtn');
    
    if (mode === 'login') {
        login.classList.remove('hidden'); signup.classList.add('hidden');
        lBtn.style.background = 'var(--primary)'; lBtn.style.color = 'white';
        sBtn.style.background = 'transparent'; sBtn.style.color = '#888';
    } else {
        login.classList.add('hidden'); signup.classList.remove('hidden');
        sBtn.style.background = 'var(--primary)'; sBtn.style.color = 'white';
        lBtn.style.background = 'transparent'; lBtn.style.color = '#888';
    }
};

// --- UPDATED GOOGLE LOGIN LOGIC ---
const googleBtn = document.getElementById('googleLoginBtn');
if(googleBtn) googleBtn.addEventListener('click', async () => {
    try {
        // We use popup here to avoid redirect issues on local environments
        await signInWithPopup(auth, provider);
        // Success! The onAuthStateChanged at the top will handle the redirect to home.html
    } catch (error) {
        console.error("Google Login Error:", error);
        alert("Google Login Failed: " + error.message);
    }
});

const emailLoginBtn = document.getElementById('emailLoginBtn');
if(emailLoginBtn) emailLoginBtn.addEventListener('click', async () => {
    try { await signInWithEmailAndPassword(auth, document.getElementById('loginEmail').value, document.getElementById('loginPass').value); }
    catch(e) { alert(e.message); }
});

const emailSignupBtn = document.getElementById('emailSignupBtn');
if(emailSignupBtn) emailSignupBtn.addEventListener('click', async () => {
    try { await createUserWithEmailAndPassword(auth, document.getElementById('signupEmail').value, document.getElementById('signupPass').value); }
    catch(e) { alert(e.message); }
});

// --- 4. IMAGE HELPER (Base64 for Free Storage) ---
function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Resize to max 800px to save database space
                const MAX_WIDTH = 800; 
                const MAX_HEIGHT = 600;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress
            };
        };
        reader.onerror = (error) => reject(error);
    });
}

// --- 5. CLUB FUNCTIONS ---
async function loadClubs(filter = 'all') {
    const grid = document.getElementById('clubs-grid');
    if(!grid) return;
    try {
        const snapshot = await getDocs(collection(db, "clubs"));
        grid.innerHTML = '';
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            const clubId = docSnap.id; 
            if(filter !== 'all' && d.category !== filter) return;
            
            const safeData = JSON.stringify(d).replace(/"/g, '&quot;');
            
            // Image Logic: Use uploaded image OR fallback color
            let bannerStyle = `background: linear-gradient(45deg, ${d.color}, #111);`;
            let logoHTML = `<div class="club-logo">🏛️</div>`;
            
            if (d.image && d.image.startsWith('data:image')) {
                bannerStyle = `background-image: url('${d.image}'); background-size: cover; background-position: center;`;
                logoHTML = ''; 
            }

            const el = document.createElement('div');
            el.className = 'club-card';
            el.onclick = () => window.location.href = `club_details.html?id=${clubId}`;
            el.innerHTML = `
                <div class="edit-btn" onclick="openEditClubModal(event, '${clubId}', ${safeData})">
                    <i class="fas fa-pencil-alt"></i>
                </div>
                <div class="club-banner" style="${bannerStyle}">
                    ${logoHTML}
                </div>
                <div class="club-card-body">
                    <h4 style="margin:0">${d.name}</h4>
                    <p style="font-size:0.8rem; color:#aaa; line-height:1.2; height:2.4em; overflow:hidden;">${d.description}</p>
                    <span class="badge" style="background:${d.color}">${d.category}</span>
                </div>`;
            grid.appendChild(el);
        });
        if(grid.innerHTML === '') grid.innerHTML = '<p style="color:#666">No clubs found.</p>';
    } catch(e) { console.error(e); }
}

window.switchClubTab = (cat) => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    loadClubs(cat);
}

window.openEditClubModal = (e, id, data) => {
    e.stopPropagation(); 
    document.getElementById('editClubId').value = id;
    document.getElementById('editClubName').value = data.name;
    document.getElementById('editClubCategory').value = data.category;
    document.getElementById('editClubColor').value = data.color;
    document.getElementById('editClubDesc').value = data.description;
    document.getElementById('existingClubImage').value = data.image || "";
    document.getElementById('editClubImageFile').value = ""; // clear input
    document.getElementById('editClubModal').classList.remove('hidden');
};

async function handleCreateClub(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Processing...";
    submitBtn.disabled = true;

    try {
        const fileInput = document.getElementById("clubImageFile");
        let imageString = "";
        if (fileInput.files.length > 0) {
            imageString = await convertImageToBase64(fileInput.files[0]);
        }

        await addDoc(collection(db, "clubs"), {
            name: document.getElementById("clubName").value,
            category: document.getElementById("clubCategory").value,
            color: document.getElementById("clubColor").value,
            description: document.getElementById("clubDesc").value,
            image: imageString,
            createdAt: new Date().toISOString()
        });
        window.closeModals();
        loadClubs();
        document.getElementById("createClubForm").reset();
    } catch(e) { alert(e.message); }
    finally { submitBtn.innerText = "Create Club"; submitBtn.disabled = false; }
}

async function handleUpdateClub(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "Updating...";
    submitBtn.disabled = true;
    
    const id = document.getElementById('editClubId').value;
    const clubRef = doc(db, "clubs", id);

    try {
        const fileInput = document.getElementById("editClubImageFile");
        const existingImage = document.getElementById("existingClubImage").value;
        
        let imageString = existingImage; 
        if (fileInput.files.length > 0) {
            imageString = await convertImageToBase64(fileInput.files[0]);
        }

        await updateDoc(clubRef, {
            name: document.getElementById("editClubName").value,
            category: document.getElementById("editClubCategory").value,
            color: document.getElementById("editClubColor").value,
            description: document.getElementById("editClubDesc").value,
            image: imageString
        });
        window.closeModals();
        loadClubs(); 
    } catch(e) { alert("Error updating: " + e.message); }
    finally { submitBtn.innerText = "Save Changes"; submitBtn.disabled = false; }
}

// --- 6. CALENDAR & EVENT LOGIC ---
function startCalendarListener() {
    onSnapshot(collection(db, "events"), (snap) => {
        calendarEvents = [];
        snap.forEach(d => calendarEvents.push({id: d.id, ...d.data()}));
        renderCalendar();
    });
}

function renderCalendar() {
    const container = document.getElementById("calendarDays");
    const label = document.getElementById("monthLabel");
    if(!container) return;

    const eventsToShow = currentPageClubId 
        ? calendarEvents.filter(e => e.clubId === currentPageClubId)
        : calendarEvents;

    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    label.innerText = new Date(y, m).toLocaleString('default', { month: 'long', year: 'numeric' });
    container.innerHTML = "";

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for(let i=0; i<firstDay; i++) container.innerHTML += `<div></div>`;

    for(let i=1; i<=daysInMonth; i++) {
        const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const evts = eventsToShow.filter(e => e.date === dateStr);
        const hasEvt = evts.length ? `<div class="dot"></div>` : '';
        const isToday = new Date().toDateString() === new Date(y, m, i).toDateString() ? 'today' : '';
        
        const el = document.createElement('div');
        el.className = `day ${isToday}`;
        el.innerHTML = `<span>${i}</span>${hasEvt}`;
        el.onclick = () => window.openDateModal(dateStr, evts);
        container.appendChild(el);
    }
}

window.changeMonth = (d) => { currentDate.setMonth(currentDate.getMonth() + d); renderCalendar(); };
window.goToToday = () => { currentDate = new Date(); renderCalendar(); };

async function handleAddEvent(e) {
    e.preventDefault();
    const clubIdToSave = currentPageClubId || 'global';
    const clubNameToSave = currentPageClubName || 'Global';
    try {
        await addDoc(collection(db, "events"), {
            title: document.getElementById("evtTitle").value,
            date: document.getElementById("evtDate").value,
            time: document.getElementById("evtTime").value,
            category: document.getElementById("evtCategory").value,
            clubId: clubIdToSave,
            clubName: clubNameToSave 
        });
        window.closeModals();
    } catch(e) { alert(e.message); }
}

// --- 7. RSVP / INTEREST LOGIC ---
window.toggleInterest = async (eventId, eventTitle, eventDate, eventTime) => {
    if(!currentUser) return alert("Please login first");
    const btn = document.getElementById(`btn-${eventId}`);
    
    const q = query(collection(db, `users/${currentUser.uid}/interested`), where("eventId", "==", eventId));
    const snapshot = await getDocs(q);

    if(!snapshot.empty) {
        snapshot.forEach(async (d) => await deleteDoc(doc(db, `users/${currentUser.uid}/interested`, d.id)));
        btn.innerHTML = '<i class="far fa-star"></i> Interest';
        btn.style.background = '#333';
    } else {
        await addDoc(collection(db, `users/${currentUser.uid}/interested`), {
            eventId: eventId, title: eventTitle, date: eventDate, time: eventTime, savedAt: new Date()
        });
        btn.innerHTML = '<i class="fas fa-star"></i> Interested';
        btn.style.background = '#e67e22';
    }
};

async function checkInterestStatus(eventId) {
    if(!currentUser) return false;
    const q = query(collection(db, `users/${currentUser.uid}/interested`), where("eventId", "==", eventId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

async function loadMySchedule(uid) {
    const list = document.getElementById('my-schedule-list');
    if(!list) return;

    onSnapshot(collection(db, `users/${uid}/interested`), (snap) => {
        list.innerHTML = '';
        if(snap.empty) {
            list.style.display = 'block'; 
            list.innerHTML = '<p style="color:#666">No upcoming events marked.</p>';
            return;
        }
        list.style.display = 'grid'; 
        let events = [];
        snap.forEach(doc => events.push(doc.data()));
        events.sort((a,b) => new Date(a.date + 'T' + (a.time||'00:00')) - new Date(b.date + 'T' + (b.time||'00:00')));

        events.forEach(e => {
            list.innerHTML += `
                <div class="schedule-card">
                    <div>
                        <h4>${e.title}</h4>
                        <div class="meta">
                            <div><i class="far fa-calendar"></i> ${formatShortDate(e.date)}</div>
                            <div style="margin-top:4px;"><i class="far fa-clock"></i> ${e.time || 'All Day'}</div>
                        </div>
                    </div>
                    <div style="text-align:right; margin-top:10px;">
                        <span style="background:#333; color:#4a90e2; font-size:0.7rem; padding:4px 8px; border-radius:4px; font-weight:bold;">GOING</span>
                    </div>
                </div>`;
        });
    });
}
function formatShortDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
}

// --- 8. MODAL UTILS & GOOGLE LINK ---
window.openDateModal = async (date, evts) => {
    const modal = document.getElementById("eventModal");
    const list = document.getElementById("modalEventList");
    const dateObj = new Date(date);
    document.getElementById("modalDateTitle").innerText = dateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    if(evts.length > 0) {
        evts.sort((a, b) => (a.time || "00:00").localeCompare(b.time || "00:00"));
        list.innerHTML = '<p style="text-align:center; color:#888;">Loading...</p>';
        
        let htmlContent = '';
        for (const e of evts) {
            let displayClubName = e.clubName;
            if (!displayClubName && currentPageClubId && e.clubId === currentPageClubId) {
                displayClubName = currentPageClubName;
            }
            displayClubName = displayClubName || 'Club Event';

            const isInterested = await checkInterestStatus(e.id);
            const btnStyle = isInterested ? 'background:#e67e22;' : 'background:#333;';
            const btnText = isInterested ? '<i class="fas fa-star"></i> Interested' : '<i class="far fa-star"></i> Interest';

            htmlContent += `
            <div style="padding:15px 0; border-bottom:1px solid #333">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <b style="font-size:1.1rem; display:block;">${e.title}</b>
                        <span style="font-size:0.8rem; color:#888;">${displayClubName}</span>
                    </div>
                    <span style="background:#333; padding:2px 8px; border-radius:4px; font-size:0.8rem;">
                        ${e.time ? convertTime(e.time) : 'All Day'}
                    </span>
                </div>
                <div style="margin-top:10px; display:flex; gap:10px;">
                    <button id="btn-${e.id}" onclick="toggleInterest('${e.id}', '${e.title}', '${e.date}', '${e.time}')" class="btn" style="${btnStyle} padding:5px 10px; font-size:0.8rem;">${btnText}</button>
                    <a href="${generateGoogleCalendarLink(e.title, e.date, e.time, displayClubName)}" target="_blank" class="btn" style="background:#333; padding:5px 10px; font-size:0.8rem;"><i class="fas fa-bell"></i> Google Remind</a>
                </div>
            </div>`;
        }
        list.innerHTML = htmlContent;
    } else {
        list.innerHTML = '<p style="text-align:center; padding:20px; color:#666">No events scheduled.</p>';
    }
    modal.classList.remove("hidden");
};

function convertTime(time24) {
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

function generateGoogleCalendarLink(title, dateStr, timeStr, clubName) {
    let startDateTime, endDateTime;
    if (timeStr) {
        const start = new Date(`${dateStr}T${timeStr}:00`);
        const end = new Date(start.getTime() + (60 * 60 * 1000));
        const format = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0];
        startDateTime = format(start);
        endDateTime = format(end);
    } else {
        startDateTime = dateStr.replace(/-/g, '');
        endDateTime = startDateTime;
    }
    const details = `Event by ${clubName}.`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(details)}`;
}

// --- 9. CLUB DETAILS & RESOURCES ---
async function loadClubDetails(id) {
    try {
        const docRef = doc(db, "clubs", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            currentPageClubName = data.name; 
            document.getElementById('headerClubName').innerText = data.name;
            document.getElementById('detailClubName').innerText = data.name;
            document.getElementById('detailDesc').innerText = data.description;
            document.getElementById('detailCategory').innerText = data.category;
            document.getElementById('detailCategory').style.background = data.color;
        } else {
            document.getElementById('detailClubName').innerText = "Club not found";
        }
    } catch (e) { console.error("Error loading details:", e); }
}

async function loadResources(clubId) {
    const list = document.getElementById("resourcesList");
    if(!list) return;
    try {
        const snapshot = await getDocs(collection(db, "resources"));
        list.innerHTML = '';
        let count = 0;
        snapshot.forEach(docSnap => {
            const r = docSnap.data();
            if(r.clubId !== clubId) return;
            count++;
            let icon = 'fa-link';
            let color = '#4a90e2';
            if(r.type === 'pdf') { icon = 'fa-file-pdf'; color = '#e74c3c'; }
            if(r.type === 'video') { icon = 'fa-video'; color = '#e67e22'; }
            list.innerHTML += `
                <div style="background:#1e1e1e; padding:15px; border-radius:8px; display:flex; align-items:center; gap:15px; border:1px solid #333;">
                    <div style="font-size:1.5rem; color:${color}; width:40px; text-align:center;"><i class="fas ${icon}"></i></div>
                    <div style="flex:1;">
                        <h4 style="margin:0; font-size:1rem;">${r.title}</h4>
                        <span style="font-size:0.75rem; color:#888; text-transform:uppercase;">${r.type}</span>
                    </div>
                    <a href="${r.url}" target="_blank" class="btn" style="background:#333; padding:5px 12px; font-size:0.8rem;">Open <i class="fas fa-external-link-alt" style="margin-left:5px;"></i></a>
                </div>`;
        });
        if(count === 0) list.innerHTML = '<p style="text-align:center; color:#666; margin-top:20px;">No resources uploaded yet.</p>';
    } catch(e) { console.error(e); }
}

async function handleAddResource(e, clubId) {
    e.preventDefault();
    try {
        await addDoc(collection(db, "resources"), {
            clubId: clubId,
            title: document.getElementById("resTitle").value,
            type: document.getElementById("resType").value,
            url: document.getElementById("resUrl").value,
            createdAt: new Date().toISOString()
        });
        window.closeModals();
        loadResources(clubId);
    } catch(e) { alert(e.message); }
}

// --- 10. MODAL HELPERS ---
window.openCreateClubModal = () => document.getElementById("createClubModal").classList.remove("hidden");
window.openAddEventModal = () => document.getElementById("addEventModal").classList.remove("hidden");
window.openAddResourceModal = () => document.getElementById("addResourceModal").classList.remove("hidden");
window.closeModals = () => document.querySelectorAll(".event-modal").forEach(el => el.classList.add("hidden"));