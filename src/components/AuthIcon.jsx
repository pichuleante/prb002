import React, { useState } from 'react'
import AuthModal from './AuthModal'
import '../styles/Auth.css'

export default function AuthIcon() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="auth-icon"
        aria-label="abrir autenticación"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5z" />
        </svg>
      </button>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  )
}
