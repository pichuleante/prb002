import React, { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const { data } = await supabase.auth.getUser()
        if (mounted) setUser(data?.user ?? null)
      } catch (err) {
        // ignore
      }
    })()
    return () => (mounted = false)
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      const { data } = await supabase.auth.getUser()
      setUser(data?.user ?? null)
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    setLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>✕</button>

        {user ? (
          <div>
            <p>Conectado como <strong>{user.email}</strong></p>
            <button onClick={handleSignOut} disabled={loading} className="auth-action">Cerrar sesión</button>
          </div>
        ) : (
          <>
            <div className="auth-tabs">
              <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
              <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Registrarse</button>
            </div>

            <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="auth-form">
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                Contraseña
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>
              {error && <div className="auth-error">{error}</div>}
              <button type="submit" disabled={loading} className="auth-action">
                {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
