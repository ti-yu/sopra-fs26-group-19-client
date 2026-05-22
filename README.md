# Lend-a-Hand Server - Frontend

## Introduction
In our society, many individuals (especially elderly people) wish to maintain their independence at home but frequently face small, everyday hurdles,such as grocery shopping, moving heavy items, or basic garden maintenance, that become difficult to manage alone due to missing strength or ilness.
The goal of **Lend-a-Hand** is to bridge this gap by connecting individuals in need of assistance **Recipients**, with passionate local helpers **Volunteers** which help out with small everyday tasks.
---
## Technologies Used

* **TypeScript** - Statically typed superset of JavaScript used as the primary frontend programming language.
* **React** - Component-based declarative UI library for building interactive user interfaces.
* **Next.js** - Full-stack React framework providing routing, server-side rendering, and build optimization.
* **Ant Design (antd)** - Enterprise-grade React UI component library for layout and interface elements.
* **Google Maps API / Marker Clusterer** - Geospatial mapping and location visualization platform.
* **Deno** - JavaScript/TypeScript runtime used for linting and formatting tooling.
* **GitHub Actions** - Automated continuous integration build pipeline runner.
* **SonarQube / SonarCloud** - Structural code checking analytics system.
* **Vercel** - Production cloud deployment platform for Next.js frontend applications.
---
## High-Level Components - page.tsx

### 1. Login Page
* **Role**: The entry point for existing users. Collects credentials and starts the session.
* **Core Files**:
    * [`login/page.tsx`](./src/app/login/page.tsx) — Shows the login form, calls `POST /login`, and saves the token and userId to localStorage.
* **Correlation**: Gets a token and role flag back from the backend, stores them, then sends the user to `/profile/{id}`.

### 2. Registration Page
* **Role**: The signup form for new users. Creates the account, logs the user in automatically, and previews the role color while filling it out.
* **Core Files**:
    * [`registration/page.tsx`](./src/app/registration/page.tsx) — Shows the full signup form with image upload, address autocomplete, and a role toggle. Calls `POST /register`.
* **Correlation**: Sends the compressed profile picture, Google Places address, and all form fields in one request. After signup, follows the same session setup as login.

### 3. Map Page
* **Role**: The main browsing view for volunteers. Shows all open help requests on a map so they can apply or withdraw.
* **Core Files**:
    * [`map/page.tsx`](./src/app/map/page.tsx) — Loads all requests via `GET /help-requests-map`, draws Google Maps markers with clustering, and offers a filter panel plus a list-view toggle.
* **Correlation**: Hides the volunteer's own requests, filters results on the client, and triggers apply/withdraw directly from the marker popup.

### 4. Profile Page
* **Role**: The public profile card for every user. Shows personal info, average rating, and received reviews, and pops up a pending review if one is waiting.
* **Core Files**:
    * [`profile/[id]/page.tsx`](./src/app/profile/[id]/page.tsx) — Loads user data via `GET /profile/{id}` and reviews via `GET /profile/{id}/reviews/received`.
    * [`ReviewModal.tsx`](./src/app/components/ReviewModal.tsx) — Checks for a pending review on load, opens a modal, and handles submitting or dismissing it.
* **Correlation**: Used by both roles and linked from the Navbar, My Applications, and My Requests. The modal handles reviews inline so no extra page is needed.

### 5. Create Help Request Page
* **Role**: Where recipients write new help requests. Captures all the request details and saves them.
* **Core Files**:
    * [`profile/[id]/CreateHelpRequest/page.tsx`](./src/app/profile/[id]/CreateHelpRequest/page.tsx) — Shows the request form (description, work type, date, time, duration, location) and calls `POST /help-requests`.
* **Correlation**: The location must come from Google Places — plain text is rejected. Once saved, the request shows up on the volunteer Map Page right away.

### 6. My Requests Page
* **Role**: The recipient's dashboard for managing their own requests. Groups requests by status and lets the user accept or reject applicants.
* **Core Files**:
    * [`my-requests/page.tsx`](./src/app/my-requests/page.tsx) — Loads all requests and applicants, shows status badges, and offers accept/dismiss/delete buttons.
* **Correlation**: Connects the recipient view to the volunteer's application flow. Once a volunteer is accepted, their contact info appears here so no outside messaging is needed.

### 7. Edit Help Request Page
* **Role**: Lets recipients edit a request as long as no volunteer has been accepted yet.
* **Core Files**:
    * [`my-requests/[id]/edit/page.tsx`](./src/app/my-requests/[id]/edit/page.tsx) — Loads the request via `GET /help-requests/{id}`, fills the form with the current values, and saves changes via `PUT /help-requests/{id}`.
* **Correlation**: Uses the same form layout as the Create page. Disabled from My Requests once applicants exist, to avoid messing up the data.

### 8. My Applications Page
* **Role**: The volunteer's tracker for requests they've applied to. Shows the status of each one and reveals contact info once accepted.
* **Core Files**:
    * [`my-applications/page.tsx`](./src/app/my-applications/page.tsx) — Loads applications via `GET /users/{userId}/applications`, shows status badges, and only shows contact info when relevant.
* **Correlation**: The volunteer-side mirror of My Requests. Finished (`DONE`) applications drop to the bottom so the active ones stay on top. Links out to recipient profiles.

### 9. Settings Page
* **Role**: Where users edit their profile and password. Also previews the new role color when the role toggle is flipped.
* **Core Files**:
    * [`settings/page.tsx`](./src/app/settings/page.tsx) — Loads the current profile via `GET /profile/{userId}`, saves edits via `PUT /profile/{userId}`, and changes the password via `POST /profile/{userId}/change-password`.
* **Correlation**: Uses the same profile endpoint as the Profile Page. Switching roles updates the `ThemeProvider` right away, recoloring the whole app without a reload.

### 10. Reviews Page
* **Role**: The hub for post-task reviews. Asks users to rate finished requests and keeps a history of past reviews.
* **Core Files**:
    * [`reviews/page.tsx`](./src/app/reviews/page.tsx) — Loads any pending review via `GET /profile/{userId}/pendingReview`, submits ratings via `POST .../write`, and loads the history via `GET /profile/{userId}/reviews/done`.
* **Correlation**: Pending reviews appear once the backend marks a request as `DONE`. Completed reviews feed the star rating shown on every Profile Page.


### The Core Application Lifecycle — Frontend Session Bootstrap

Here is how data flows across the entire client architecture during a common user event, such as a returning user logging in and landing on their protected dashboard:

1. **Form Submission**: The **Login Page** captures the username and password from its input fields and fires a `POST /login` request to the backend with the credentials as a JSON payload.

2. **Session Persistence**: On a successful response, the page extracts the returned `token`, `userId`, and `isVolunteer` flag and writes them into `localStorage` and `sessionStorage`, establishing the client-side session state that every subsequent page will rely on.

3. **Programmatic Routing**: The Login Page invokes Next.js's router to redirect the user to `/profile/{id}`, handing control over to the protected zone of the app.

4. **Auth Guard Check**: As the protected page mounts, the **`AuthWrapper`** component runs its `useEffect` hook, reads the token from sessionStorage, and either allows render to proceed or redirects back to `/login` if the token is absent — no backend round-trip required.

5. **Theme Context Initialization**: In parallel, the **`ThemeProvider`** reads the `isVolunteer` flag from sessionStorage and feeds it into Ant Design's dynamic token system, switching the global primary color to teal or pink before any UI paints.

6. **Navigation Hydration**: The **`Navbar`** consumes the same role context, renders the role-appropriate set of four destination icons, and fires `GET /profile/{userId}/pendingReview` to decide whether to display the red-dot badge on the profile icon.

7. **Page Data Fetch**: Finally, the **Profile Page** itself fires `GET /profile/{id}` and `GET /profile/{id}/reviews/received`, populating the identity card and the received reviews list. If a pending review surfaces, the **`ReviewModal`** opens inline over the page rather than triggering a separate navigation — closing the bootstrap cycle with the user fully oriented inside the app.

---
## Launch & Deployment

Our Next.js client uses npm as the package manager and includes a local `node_modules` ecosystem, meaning no external web server installations are required to run the frontend locally.

## Getting started with Next.js

- Documentation: <https://nextjs.org/docs>
- Guides: <https://nextjs.org/learn>
- Building your first Next.js app: <https://nextjs.org/docs/getting-started/project-structure>

## Prerequisites

Before launching, ensure your local workspace has:

- **Node.js** (LTS version recommended — verify with `node -v`)
- **npm** (bundled with Node.js — verify with `npm -v`)

### Building with npm

#### Standard Next.js Execution
1. Clone the repository and navigate to the project directory root.
2. Install dependencies and compile the local `node_modules` tree:
   You can use npm to install and run the application.
-   macOS: `npm`
-   Linux: `npm`
-   Windows: `npm`

### Install

```bash
npm install
```

### Run

```bash
npm run dev
```

You can verify that the server is running by visiting `localhost:3000` in your browser.

### Test

```bash
npm test
```

### Development Mode
You can start the frontend in development mode, this will automatically trigger a hot reload of the application
once the content of a file has been changed.

Open a terminal window and run:

`npm run dev`

If you want to run the linter alongside development to catch issues as you code, open a second terminal and run:

`npm run lint -- --watch`

If you want to verify the production build behaves correctly instead, use the following commands:

`npm run build`

and then:

`npm run start`

## Debugging
If something is not working and/or you don't know what is going on. We recommend using a debugger and step-through the process step-by-step.

To configure a debugger for the Next.js dev server (i.e. the process you start with `npm run dev` command), do the following:

1. Open Tab: **Run**/Edit Configurations
2. Add a new **Node.js** (or **Attach to Node.js/Chrome**) configuration and name it properly
3. Start the Server in Debug mode: `NODE_OPTIONS='--inspect' npm run dev`
4. Press `Shift + F9` or use **Run**/Debug "Name of your task"
5. Set breakpoints in the application where you need them (in your IDE or via Chrome DevTools at `chrome://inspect`)
6. Step through the process one step at a time

---

## Git Workflow & Collaboration Guide

To keep our codebase stable and prevent team members from accidentally overwriting each other's changes, **never write code or push commits directly to the `main` branch**. Always use the following **Feature-Branch Workflow** to isolate your work for each specific GitHub Issue:

### 1. Sync Your Local Machine with the Cloud
Before starting any new task or writing a single line of code, pull the latest, verified changes from your team to avoid merge conflicts later.
```bash
# Switch your local workspace to the main branch
git checkout main

# Download and merge the latest code from GitHub
git pull origin main 
```

### 2. Create a Dedicated Branch for Your GitHub Issue
Every feature, bug fix, or sub-task must live on its own separate branch. Name the branch clearly after the issue number or task you are tackling.
```bash
# Creates a new branch and immediately switches you onto it
git checkout -b task-<issue-number>

# Example:
git checkout -b task-104-login-screen
```
### 3. Monitor Your Work in Progress
As you edit or add files, use diagnostic commands frequently to see exactly what changes are sitting in your workspace.
```bash
# Lists which files have been modified, deleted, or are currently untracked
git status

# Shows a line-by-line comparison of your code changes since your last save
git diff
```
### 4. Save and Upload Your Progress
Once your feature is complete and working locally, bundle your changes, create a local snapshot, and publish your branch up to GitHub.
```bash
# 1. Stage all modified files to prepare them for a snapshot save
git add .

# 2. Commit the staged changes with a clear, descriptive message and the task number with a #
git commit -m "implemented screenreader aria labels for request inputs #127"

# 3. Push your local branch up to the remote GitHub repository
git push origin task-<issue-number>
```
### 5. Merge Your Code on GitHub via Pull Request
1. Navigate to the project repository page on GitHub in your web browser.

2. Click the green "Compare & pull request" banner that automatically appears at the top of the page.

3. Link the Pull Request to your original task tracking card or issue.

4. Verify that the automated GitHub Actions continuous integration pipeline tests run successfully (turn green).

5. Once reviewed and approved by a team member, click "Squash and merge" to safely absorb your completed branch back into the stable main production codebase.

---
## Roadmap
### 1. UI Polish
* **Animations & Details**: Add animations when things are happening for a smoother UI experience. A "pulse" for the pin on the map can be considered, since mobjects with movement are easier for the eye to see. As well as more detailed animations when the user presses all sorts of buttons. But be careful to not overwhelm or confuse elderly users!
* **Nightmode**: Implement Night mode, so Users have a better UX and better sleep.

### 2. Accessibility
* **Add proper Font-Size Change**: Even though Users can change the fot size via ctrl +, it would be good to have a proper, permanent font-size-change for each user.

---
## Authors and Acknowledgment

This platform was designed, engineered, and maintained by:

* **Timur Yu** ([ti-yu](https://github.com/ti-yu))
* **Lisa Gehrig** ([lisgeh2](https://github.com/lisgeh2))
* **Jonathan Boggia** ([jonathanboggia](https://github.com/jonathanboggia))
* **Romeo Pestalozzi** ([romevp](https://github.com/romevp))
---
## License
MIT, APACHE
