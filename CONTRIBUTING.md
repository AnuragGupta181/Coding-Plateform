# Contributing to NextGen Assessment Systems

First off, thank you for considering contributing to NextGen Assessment Systems! It's people like you that make this tool such a great platform.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

- **Check if the bug has already been reported** in the GitHub Issues.
- **Use a clear and descriptive title** for the issue to identify the problem.
- **Describe the exact steps to reproduce the problem** in as many details as possible.
- **Provide specific examples to demonstrate the steps.** Include links to files or copy/paste snippets.

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion, including completely new features and minor improvements to existing functionality.

- **Check if the enhancement has already been suggested** in the GitHub Issues.
- **Use a clear and descriptive title** for the issue to identify the suggestion.
- **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
- **Explain why this enhancement would be useful** to most users.

### Pull Requests

The process described here has several goals:

- Maintain NextGen Assessment Systems's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible platform
- Enable a sustainable system for maintainers to review contributions

Please follow these steps to have your contribution considered by the maintainers:

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies** for both frontend and backend using `pnpm install` in the respective directories.
3. If you've added code that should be tested, **add tests**.
4. If you've changed APIs, **update the documentation**.
5. Ensure the test suite passes.
6. Make sure your code conforms to the standard code style of the project.
7. Issue that pull request!

## Coding Guidelines

### Frontend (React / TypeScript)
- Use functional components and hooks.
- Follow TypeScript best practices, avoiding `any` types where possible.
- Use Tailwind CSS for styling and follow the design system outlined in `index.css`.
- Keep components modular and reusable.

### Backend (Node.js / Express)
- Follow the CQRS route separation pattern where applicable.
- Ensure all endpoints are documented and secured using JWT authentication middleware.
- Handle errors gracefully and return standardized JSON error responses.
- Write clear comments for complex business logic.

## Environment Setup

To set up the project locally:

1. Clone your fork: `git clone https://github.com/your-username/Coding-Plateform.git`
2. Backend:
   - `cd Backend`
   - `pnpm install`
   - Copy `.env.example` to `.env` and fill in the required variables (MongoDB URL, Redis, etc.)
   - `pnpm run dev`
3. Frontend:
   - `cd frontend`
   - `pnpm install`
   - Copy `.env.example` to `.env`
   - `pnpm run dev`

Thank you for your contributions!
