import React, { useState } from 'react';
import { authLogin, authRegister, authResetPassword, setToken } from './api';

type Mode = 'login' | 'register' | 'reset';

interface Props {
  onAuth: () => void;
}

export default function AuthScreen({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // campos
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [workshopName, setWorkshopName] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await authLogin(email, password);
        setToken(res.access_token);
        onAuth();
      } else if (mode === 'register') {
        const res = await authRegister({ workshop_name: workshopName, email, password, name });
        setToken(res.access_token);
        onAuth();
      } else {
        await authResetPassword(email);
        setSuccess('Se o e-mail existir, você receberá as instruções.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-950 via-slate-900 to-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🔧</div>
          <h1 className="text-3xl font-bold text-white">Oficina+</h1>
          <p className="text-slate-400 mt-1">Sistema de Gestão para Oficinas</p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-8 shadow-2xl border border-slate-700">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition ${
                  mode === m
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Nome da Oficina</label>
                  <input
                    required
                    value={workshopName}
                    onChange={e => setWorkshopName(e.target.value)}
                    placeholder="Ex: Oficina do João"
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Seu nome</label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="João Silva"
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            {mode === 'reset' ? (
              <div>
                <label className="text-xs text-slate-400 mb-1 block">E-mail</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">E-mail</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Senha</label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 text-red-400 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/40 border border-green-500/40 text-green-400 rounded-xl px-4 py-3 text-sm">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition"
            >
              {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar conta' : 'Enviar instruções'}
            </button>
          </form>

          {mode === 'login' && (
            <button
              onClick={() => { setMode('reset'); setError(''); }}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-300 transition"
            >
              Esqueci minha senha
            </button>
          )}
          {mode === 'reset' && (
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              className="mt-4 w-full text-sm text-slate-500 hover:text-slate-300 transition"
            >
              ← Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
