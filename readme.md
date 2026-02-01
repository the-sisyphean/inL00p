# ♾️ inLoop

![Tech Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20Firebase-orange)

**inLoop** is the ultimate campus synchronizer. We bridge the gap between Club Secretaries and the student body, ensuring no event goes unnoticed and no resource stays hidden.

---

## 🚀 Live Demo
> **[Click here to visit the live site](https://the-sisyphean.github.io/inL00p/)**

---

## ❓ The Problem
**Have you ever struggled to find all campus clubs and their resources in one place?**
**Have you ever missed an amazing event simply because you couldn't keep track of scattered schedules?**

Currently, campus life is fragmented. Students have to check multiple social media pages, noticeboards, and group chats just to stay updated. This leads to:
* Low attendance at events due to lack of awareness.
* Difficulty finding study resources provided by academic clubs.
* A disconnected campus community.

## 💡 The Solution
We introduce **inLoop**. 

inLoop is a centralized platform that takes information directly from the source—**Club Secretaries (Admins)**—and relays it instantly to the rest of the campus.
* **Centralized Hub:** Every club, every event, and every resource is in one navigable dashboard.
* **Admin Powers:** Club Secretaries have special access to post updates, upload resources, and manage the calendar.
* **Personalized Sync:** Students can RSVP to events, creating a personalized schedule with reminders so they never miss out again.

---

## ✨ Key Features

### 👤 Student Experience
* **Dashboard:** A personalized view of your upcoming schedule and interested events.
* **Club Explorer:** Filter clubs by category (Tech, Cultural, Sports) to find your niche.
* **RSVP System:** One-click interest button that adds events to your personal tracking list.

### 🛡️ Admin & Club Management
* **Role-Based Access:** Secure login for Club Secretaries (Admins) vs. standard students.
* **Content Management:** Admins can create clubs, post events to the global calendar, and edit details.
* **Resource Repository:** A dedicated space for admins to upload study guides, PDFs, and links for their members.

---

## ✨ Key Features

### 👤 User Experience
* **Authentication:** Secure Login/Signup via Email & Password or **Google Sign-In**.
* **Dashboard:** Personalized schedule view showing events the user is interested in.
* **Responsive Design:** Fully functional on desktop and mobile with a sleek **Dark Mode** UI.

### 📅 Calendar & Events
* **Interactive Calendar:** Visual monthly view of all campus activities.
* **RSVP System:** Students can mark interest in events, which automatically adds them to their personal schedule.
* **Event Details:** Pop-up modals with time, location, and category info.

### 🏛️ Club Management
* **Club Discovery:** Filter clubs by categories (Tech, Art, Sports, etc.).
* **Dynamic Content:** Clubs feature custom banners, descriptions, and resource links.
* **Resource Hub:** Downloadable PDFs inside urls and external links specific to each club.

### 🛡️ Admin Privileges (Security)
* **Role-Based Access:** Admin tools are hidden from standard users.
* **Content Management:** Admins can:
    * Create and Edit Clubs.
    * Post new Events to the global calendar.
    * Upload Resources.
    * Promote other users to Admin status.

---

## 🛠️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript (ES6 Modules) |
| **Backend / DB** | Firebase Firestore (NoSQL) |
| **Auth** | Firebase Authentication |
| **Deployment** | GitHub Pages |

---

## 📸 Screenshots

| Dashboard | Calendar View |
| :---: | :---: |
| ![Dashboard Screenshot](https://via.placeholder.com/400x200?text=Dashboard+View) | ![Calendar Screenshot](https://via.placeholder.com/400x200?text=Calendar+View) |

| Club Details | Admin Tools |
| :---: | :---: |
| ![Club Details](https://via.placeholder.com/400x200?text=Club+Page) | ![Admin Tools](https://via.placeholder.com/400x200?text=Admin+Modal) |

*(Note: Replace these placeholder links with actual screenshots of your app)*

---

## ⚙️ Local Setup & Installation

If you want to run this project locally, follow these steps:

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/the-sisyphean/inL00p.git](https://github.com/the-sisyphean/inL00p.git)
    cd inL00p
    ```

2.  **Configure Firebase**
    * Create a project at [Firebase Console](https://console.firebase.google.com/).
    * Enable **Authentication** (Email/Google).
    * **Important for Local Testing:** Go to **Authentication** > **Settings** > **Authorized Domains**. Ensure `localhost` and `127.0.0.1` are listed. If you are using a specific IP for Live Server, add that there too.
    * Enable **Firestore Database**.
    * Create a file named `firebase.js` in your root folder (or `core` folder) and paste your config:
    ```javascript
    import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js](https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js)";
    // ... import auth and firestore

    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.appspot.com",
        messagingSenderId: "SENDER_ID",
        appId: "APP_ID"
    };

    const app = initializeApp(firebaseConfig);
    export const auth = ...
    export const db = ...
    ```

3.  **Run the App**
    * Since this uses ES6 Modules, you must run it on a local server (you cannot just double-click `index.html`).
    * Using VS Code: Install the **Live Server** extension and click "Go Live".
---

## 📂 Project Structure

```text
/
├── index.html          # Login/Landing Page
├── home.html           # User Dashboard
├── clubs.html          # Club Browser
├── calendar.html       # Global Calendar
├── style.css           # Global Styles & Admin Logic
├── app.js              # Main Logic (Auth, UI, Database)
├── firebase.js         # Firebase Configuration
└── README.md           # Documentation

