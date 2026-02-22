import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import WebSocketService from './services/WebSocketService';

WebSocketService.connect('ws://localhost:8080/ws'); // Attempt to connect
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
