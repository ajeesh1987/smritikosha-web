# Smritikosha Web

A web application for families to collaboratively build a digital legacy box, preserving photos, stories, and memories across generations.

**Status:** Early MVP Development (Work in Progress)

## Vision

To provide a private, secure, and emotionally resonant space for families to capture, share, and cherish the life stories of their loved ones.

## Tech Stack

* **Frontend:** Vite + Vanilla JavaScript
* **Backend & DB:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
* **Styling:** Tailwind CSS
* **Language:** JavaScript (ES Modules)

## Getting Started (Local Development)

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

**Prerequisites:**

* Node.js (LTS version recommended)
* npm or yarn
* Git
* (Optional) Supabase CLI (`npm install -g supabase`) for local Supabase workflows

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd smritikosha-web
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up environment variables:**
    * Create a `.env.local` file in the project root.
    * Add your Supabase credentials:
      ```plaintext
      VITE_SUPABASE_URL=YOUR_SUPABASE_URL
      VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
      ```
    * For server-side API routes, also set:
      ```plaintext
      SUPABASE_URL=YOUR_SUPABASE_URL
      SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
      ```
    * Keep this file out of source control.

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
5.  **Open the application:**
    Navigate to the local URL shown by Vite (typically `http://localhost:5173`).

## Current Features (MVP v0.1)

* User Registration (Email/Password)
* Email Verification Flow (Simulated in prototype)
* User Login

## Roadmap (Planned Features)

* Web creation and management
* Content contribution (Photo upload, Story submission)
* Collaboration features (Inviting family members)
* Content viewing and organization


## License

Currently private and proprietary. All Rights Reserved.

---

If you'd like, we can add a one-command setup script (`npm run setup`) next.
