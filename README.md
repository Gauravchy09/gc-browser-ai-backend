# ⚡ GC Context-Aware Browser AI Assistant

A wildly powerful, context-aware AI chatbot that lives inside a floating widget on your browser. It instantly reads whatever webpage you are viewing—giving it perfect, private context about what you're doing—and answers any questions using blazing-fast local RAG combined with the Llama-3 model. 

### 📥 <b>[Download the Extension ZIP Here!](https://github.com/Gauravchy09/gc-browser-ai-backend/releases/download/v1.0.0/GC_Assistant.zip)</b>

<br>

<div align="center">
  <img src="assets/demo1.png" width="100%" style="border-radius: 8px; margin-bottom: 20px;" alt="Browser View">
  <br>
  <img src="assets/demo2.png" width="350px" style="border-radius: 8px;" alt="Chat Widget">
</div>

## ✨ Features
- **In-Page Floating Widget:** A beautiful, dark-mode glassmorphic chatbot (like Intercom) that hovers in the bottom-right corner of any webpage.
- **Instant Local RAG:** Creates a miniature knowledge-base automatically every time you visit a new webpage using `SentenceTransformers`. Only relevant text chunks are sent to the AI!
- **Voice UI Embedded:** Click the Microphone 🎤 button to talk to the AI using native Chrome transcribing, and click the Speaker 🔊 button to hear the AI read out answers!
- **Streaming Responses:** Integrates with FastAPI SSE and the cutting-edge `llama-3.3-70b-versatile` model via Groq API to stream tokens in real-time instantly.
- **Privacy-First Embedding:** Your entire webpage is *never* sent over the internet to a third party. Local embeddings scan it, and only the required paragraphs are securely sent to the LLM to get an answer.

---

## 🏗️ Architecture Stack

### **Frontend (`/extension`)**
- **Vanilla JavaScript/CSS:** Lightweight, fast, no React/Webpack bloat.
- **Floating `<iframe>`:** Injects securely over webpages so host CSS never breaks our design.
- **Web Speech API:** Built-in Speech-to-Text and Text-to-Speech natively processed by Chrome.

### **Backend (`/backend`)**
- **FastAPI:** Lightning fast Python server built with Uvicorn.
- **Sentence-Transformers:** `all-MiniLM-L6-v2` handles text semantic mapping natively.
- **FAISS (Facebook AI Similarity Search):** Does in-memory vector searching instantly.
- **Groq API:** Powering the heavy LLM lifting securely and freely.

---

## 🛠️ How to Run Locally

If you want to edit the code or use the bot exclusively on your own machine:

1. **Setup the Backend**
   - Open terminal. Navigate to `backend/`.
   - Rename `.env.example` to `.env` and paste your free [Groq API Key](https://console.groq.com/).
   - Click `start_backend.bat` to automatically build your python environment and start the server at `http://localhost:8000`.

2. **Setup the Extension**
   - Open `extension/sidebar.js` and ensure `API_BASE` is set to `http://localhost:8000`.
   - Open your browser, go to `chrome://extensions`.
   - Turn on **"Developer Mode"** in the top right.
   - Click **"Load Unpacked"** and select your `extension/` folder.

---

## 🚀 How to Deploy So Anyone Can Use It

Because the backend relies on heavy ML models for privacy-first RAG, standard free deployments will crash. We bypass this by separating the Frontend extension from the Backend!

### Step 1. Free Backend Deployment (Hugging Face Spaces)
Hugging Face offers a massive 16GB RAM cloud server specifically for AI projects exactly like yours—for free.
1. Create a free account at [Hugging Face](https://huggingface.co).
2. Click **New Space** -> **Docker** -> **Blank template**. 
3. Go to Space Settings -> Variables and Secrets. Create a secret named `GROQ_API_KEY` with your actual key.
4. Upload all files from inside your `backend/` folder to the Space files tab (Specifically `app.py`, `generator.py`, `retriever.py`, `requirements.txt`, and the highly-tuned `Dockerfile`).
5. Your Docker backend will build and start! Note the "Direct URL" of your space (usually `https://username-spacename.hf.space`).

### Step 2. Free Frontend Distribution (.ZIP)
Bypass the Google Web Store $5 fee entirely by sending your friends a compiled ZIP file.
1. Open `extension/sidebar.js`.
2. Delete the `http://localhost...` URL and replace `API_BASE` with the Hugging Face App URL you just created. Save it.
3. Open your terminal at the root directory of this project and run:
   ```bash
   python build_extension.py
   ```
4. This instantly creates `GC_Assistant.zip`.

### Step 3. Give it to your friends!
1. Send `GC_Assistant.zip` to your friends.
2. Ask them to go to `chrome://extensions` and turn on Developer mode.
3. Tell them to simply instantly **Drag-and-Drop** `GC_Assistant.zip` into the Chrome window. Done! They now have your custom AI assistant on every webpage!
