# Task 2: Dynamic Task Manager & Productivity Tracker (CRUD)

A lightweight, responsive task management and productivity tracking web application built with HTML5, Tailwind CSS, and modern JavaScript (ES6+), featuring instant state persistence using the browser localStorage API.

## 🔗 Links
- **Live Demo:** [Taskflow-Pro](https://taskflow-pro-sigma-neon.vercel.app/) 
- **GitHub Repository:** [OnikTechHub/Dynamic-Task-Manager-Productivity-Tracker](https://github.com/OnikTechHub/Dynamic-Task-Manager-Productivity-Tracker)

## 📋 Core Features & Requirements Met
- **Complete CRUD Operations:**
  - **Create:** Add new tasks with title, category (e.g., Work, Personal, Study), priority levels (Low, Medium, High), and due dates.
  - **Read:** View tasks in a clean, categorized list with priority badges, status indicators, and due dates.
  - **Update:** Toggle task completion status (active/completed) with smooth transitions and edit existing task details.
  - **Delete:** Remove individual tasks or clear all completed tasks with a confirmation action.
- **Filtering & Search:**
  - Status filter tabs to switch between **All**, **Active**, and **Completed** tasks.
  - Instant search bar to filter tasks dynamically by title and keywords.
- **Data Persistence (localStorage):**
  - Task state managed via a JavaScript array (`tasks = []`) synchronized with helper functions `saveToLocalStorage()` and `loadFromLocalStorage()` so data persists across browser reloads.
- **UI/UX & Responsiveness:**
  - Fully responsive layout optimized for mobile, tablet, and desktop screens.
  - Clean summary counter displaying Total, In Progress, and Completed tasks with a visual progress bar.

## 💻 Local Setup
This project runs directly in the browser with zero build steps or external dependencies.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/OnikTechHub/Dynamic-Task-Manager-Productivity-Tracker.git
   ```

2. **Run locally:**
   - Open `index.html` directly in any web browser, or
   - Use VS Code **Live Server**, or
   - Run a local static server:
     ```bash
     npx serve .
     # or
     python -m http.server 8000
     ```

## 🚀 Deployment (Vercel)
1. Push your code to your GitHub repository.
2. Log in to [Vercel](https://vercel.com) and click **"Add New..."** > **"Project"**.
3. Import the `Dynamic-Task-Manager-Productivity-Tracker` repository.
4. Keep the default settings (**Framework Preset:** `Other`, **Root Directory:** `./`) and click **Deploy**.
