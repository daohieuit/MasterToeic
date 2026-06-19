# Contributing Guidelines (CONTRIBUTING.md)

Welcome to **MASTER TOEIC**! We appreciate your interest in helping improve this platform. 

Here are the guidelines to help you get started with contributing to the project.

---

## 🚀 Setting Up the Local Development Environment

1. **Fork & Clone the Repository:**
   * Fork this repository to your own GitHub account.
   * Clone the fork to your local machine:
     ```bash
     git clone https://github.com/your-username/MasterToeic.git
     cd MasterToeic
     ```

2. **Install Dependencies:**
   * Make sure you are using Node.js v18 or higher.
   * Install the package dependencies:
     ```bash
     npm install
     ```

3. **Configure Environment Variables:**
   * Create a `.env.local` file from the template:
     ```bash
     cp .env.example .env.local
     ```
   * Fill in your Supabase connection parameters (if testing Cloud Sync features).

4. **Launch the Development Server:**
   * Run the local server:
     ```bash
     npm run dev
     ```
   * Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Pull Request (PR) Workflow

1. **Create a New Branch:**
   * Always create a new branch from the latest main branch before making changes:
     ```bash
     git checkout -b feature/your-feature-name
     # or
     git checkout -b fix/bug-description
     ```

2. **Coding Standards:**
   * Keep code clean and do not introduce heavy third-party dependencies unless necessary.
   * Adhere to the "Purple Ban" (no purple or violet color variants) to match our Gold/Charcoal brutalist theme.
   * Format your code and check for TypeScript errors before committing:
     ```bash
     npx tsc --noEmit
     ```

3. **Make Commits:**
   * Use clear and concise commit messages adhering to Conventional Commits:
     * `feat: add feature X`
     * `fix: resolve issue Y`
     * `docs: update documentation Z`
     ```bash
     git commit -m "feat(audio): add noise suppression option for recordings"
     ```

4. **Submit a Pull Request:**
   * Push your branch to your fork:
     ```bash
     git push origin feature/your-feature-name
     ```
   * Open a Pull Request pointing towards the main project. Describe your changes clearly in the PR description template.

---

## 🐛 Reporting Issues

If you find a bug or have a feature request, please open a GitHub **Issue** and provide the following:
* A clear description of the bug or proposal.
* Steps to reproduce the issue.
* Screenshots or console error logs (if applicable).
* Operating System, browser, and version.

Thank you for contributing to MASTER TOEIC and helping developers and students improve their Speaking & Writing skills!
