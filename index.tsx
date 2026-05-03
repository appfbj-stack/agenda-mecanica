import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthScreen from './src/AuthScreen';
import { isLoggedIn, clearToken, authMe } from './src/api';

function Root() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(isLoggedIn());

  // Valida o token armazenado na primeira renderização
  React.useEffect(() => {
    if (isLoggedIn()) {
      authMe()
        .then(() => setAuthed(true))
        .catch(() => {
          clearToken();
          setAuthed(false);
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-indigo-600 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-5xl mb-4">🔧</div>
          <p className="text-lg font-medium opacity-80">Verificando sessão...</p>
        </div>
      </div>
    );
  }

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
