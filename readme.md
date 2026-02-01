# 🎓 inLoop

![Tech Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20Firebase-orange)

**inLoop** is a centralized web platform designed to streamline student life. It connects students with university clubs, tracks campus events via an interactive calendar with an option to add remainders, and provides a repository for academic resources.

The platform features a **Role-Based Access Control (RBAC)** system, distinguishing between normal Students and Admins who manage content.

---

## 🚀 Live Demo
> **[Click here to visit the live site](https://the-sisyphean.github.io/inL00p/)**
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
    git clone [https://github.com/yourusername/campus-hub.git](https://github.com/yourusername/campus-hub.git)
    cd campus-hub
    ```

2.  **Configure Firebase**
    * Create a project at [Firebase Console](https://console.firebase.google.com/).
    * Enable **Authentication** (Email/Google).
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
