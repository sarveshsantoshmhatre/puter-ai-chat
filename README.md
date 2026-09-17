# Puter AI Chat

A simple responsive AI chat application powered by Puter.js.

## Features

- Streaming AI responses
- Multi-turn conversation context
- Model selector
- Local browser chat history
- New and clear chat controls
- Responsive desktop and mobile layout
- No application-side AI API key
- Direct browser integration with Puter.js

## Run locally on Ubuntu

Puter.js apps should be served over HTTP instead of opening `index.html` directly with `file://`.

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000`.

## How it works

The app loads Puter.js from:

```html
<script src="https://js.puter.com/v2/"></script>
```

Chat messages are sent with `puter.ai.chat()` using the conversation message array and streaming responses.

## Deployment

This is a static frontend and can be deployed with GitHub Pages or another static hosting provider.

## Documentation

- https://docs.puter.com/
- https://docs.puter.com/AI/chat/
- https://developer.puter.com/
