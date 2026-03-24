# 𝔾 Galois Explorer

A modern, responsive React frontend for the Galois Cryptography API. This explorer allows users to interactively test and visualize operations across Prime Fields (𝔽ₚ), Elliptic Curves (ECC), Number Theory (ℕ), and Diffie-Hellman Key Exchanges (DHKE).

## ✨ Features

* **Interactive API Playground:** Send parameterized requests to the backend and view beautifully formatted JSON responses in real-time.
* **Modern UI/UX:** Features a clean, academic typography scale (Fraunces & Fragment Mono) with an intuitive sidebar for desktop and a swipeable pill-menu for mobile devices.
* **Fully Responsive:** Fluidly scales from mobile screens up to 4K ultrawide monitors (featuring Application Shell Containment).
* **Network Resilient:** Includes built-in request timeouts and button debouncing to prevent hanging loading states and API spamming.
* **Session History:** Keeps track of your recent API calls and results during your active session.

## 🗂️ Project Structure

The application is built with modularity in mind:
* `src/App.jsx` - Main application shell, state management, and layout.
* `src/components.jsx` - Reusable UI elements (Buttons, Inputs, JsonTree, Sidebar).
* `src/data.js` - Application constants, routing paths, and API parameter definitions.
* `src/utils.js` - Helper functions for network calls, debouncing, and URL resolution.
* `src/theme.css` - Global stylesheet using CSS Variables for easy theming.

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js installed. You will also need the Python backend running (typically via `uvicorn main:app --reload` on `localhost:8000`).

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install