import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthScreen from './src/AuthScreen';
import { isLoggedIn, clearToken, authMe } from './src/api';

function Root() {
  const [authed, setAuthed] = useState(isLoggedIn());

  // Valida o token armazenado na primeira renderização
  React.useEffect(() => {
    if (isLoggedIn()) {
      authMe().catch(() => {
        clearToken();
        setAuthed(false);
      });
    }
  }, []);

  if (!authed) {
    return <AuthScreen onAuth={() => setAuthed(true)} />;
  }
  return <App onLogout={() => { clearToken(); setAuthed(false); }} />;
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
