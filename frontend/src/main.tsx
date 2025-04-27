import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import WebSocketService from './services/WebSocketService';

const wsUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:8080/ws`;
WebSocketService.connect(wsUrl); // Attempt to connect
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
