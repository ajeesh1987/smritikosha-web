# MemoryBox (SmritiKoshaApp)

A web application for families to collaboratively build a digital legacy box, preserving photos, stories, and memories across generations.

**Status:** Early MVP Development (Work in Progress)

## Vision

To provide a private, secure, and emotionally resonant space for families to capture, share, and cherish the life stories of their loved ones.

## Tech Stack

* **Frontend:** [Specify Framework: e.g., Next.js (React), Nuxt (Vue), SvelteKit (Svelte)]
* **Backend & DB:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
* **Styling:** Tailwind CSS
* **Language:** JavaScript / TypeScript [Choose one or both]

## Getting Started (Local Development)

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

**Prerequisites:**

* Node.js (LTS version recommended)
* npm or yarn
* Git
* Docker Desktop (for Supabase local development)
* Supabase CLI (`npm install -g supabase`)

**Installation & Setup:**

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/SmritiKoshaApp/MemoryBox.git](https://github.com/SmritiKoshaApp/MemoryBox.git)
    cd MemoryBox
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up Supabase:**
    * Link your project (run this inside the `MemoryBox` folder):
        ```bash
        supabase login
        supabase link --project-ref <your-project-ref>
        # Get <your-project-ref> from your Supabase project's dashboard URL
        ```
    * Copy Supabase environment variables: Create a file named `.env.local` in the project root. **Important: Add `.env.local` to your `.gitignore` file to avoid committing secrets!**
        * Go to your Supabase Project Dashboard > Project Settings > API.
        * Copy the `Project URL` and the `anon` `public` key.
        * Add them to your `.env.local` file like this:
            ```plaintext
            # For Next.js (adjust prefix if using Vite/other)
            NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
            NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
            ```
            *(Note: Adjust the variable names `NEXT_PUBLIC_...` if your chosen framework uses a different convention for exposing environment variables to the browser, e.g., `VITE_...` for Vite)*
    * Start local Supabase services (optional, but recommended for local dev):
        ```bash
        supabase start
        ```
        *(This uses Docker to run Postgres etc. locally)*

4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
5.  **Open the application:**
    Navigate to `http://localhost:3000` (or the port specified by your framework) in your browser.

## Current Features (MVP v0.1)

* User Registration (Email/Password)
* Email Verification Flow (Simulated in prototype)
* User Login

## Roadmap (Planned Features)

* Memory Box creation and management
* Content contribution (Photo upload, Story submission)
* Collaboration features (Inviting family members)
* Content viewing and organization
* [Add other key features you plan]

## License

Currently private and proprietary. All Rights Reserved.

---

*Remember to replace bracketed placeholders like `[Specify Framework: ...]` and provide the correct environment variable names/instructions for your chosen frontend framework.*
