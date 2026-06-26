# ✦ Collaborative Canvas

A real-time collaborative whiteboard built with React, Konva, and Socket.io. Multiple users can draw simultaneously on a shared canvas, with changes syncing instantly across all connected sessions.

🌐 **Live Demo:** [whiteboard.henriquesantos.dev](https://whiteboard.henriquesantos.dev)

---

## 📸 Preview

> Enter your name, pick a tool, choose a color and thickness, and start drawing — all in real-time with other collaborators.

---

## ✨ Features

- 🖊️ **Drawing tools:** Pen, Eraser, Rectangle, Circle
- 🎨 **Color picker** with customizable stroke thickness slider
- 👥 **Real-time collaboration** — see who's drawing live via Socket.io
- 📋 **Active collaborators panel** showing all connected users
- 🗑️ **Clear All** to reset the canvas for everyone
- 🖼️ Canvas rendering powered by **Konva** / **react-konva**

---

## 🛠️ Tech Stack

### Frontend
- **React 19**
- **react-konva** + **Konva** — HTML5 Canvas rendering
- **Socket.io Client** — real-time WebSocket communication
- **CSS3**
- **gh-pages** for deployment

### Backend
- **Node.js** + **Socket.io Server** — required to run locally for real-time sync

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16+)
- npm
- A running Socket.io backend server

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/Henr1queSantos/hs_collaborative-whiteboard.git

# Navigate into the project
cd hs_collaborative-whiteboard

# Install dependencies
npm install

# Start the app
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> ⚠️ **Note:** Real-time collaboration requires a Socket.io backend server running and connected. Without it, the canvas will work locally but won't sync between users.

### Build for production

```bash
npm run build
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

---

## 📁 Project Structure

```
hs_collaborative-whiteboard/
├── public/
├── src/
│   ├── components/
│   ├── App.js
│   └── index.js
├── package.json
└── README.md
```

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👤 Author

**Henrique Santos**

- Portfolio: [henriquesantos.dev](https://henriquesantos.dev)
- GitHub: [@Henr1queSantos](https://github.com/Henr1queSantos)
