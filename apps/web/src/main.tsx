import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminApp from './admin/AdminApp.tsx'

function isAdmin() {
  return window.location.hash.startsWith('#/admin')
}

function Root() {
  const [admin, setAdmin] = useState(isAdmin())
  useEffect(() => {
    const onHash = () => setAdmin(isAdmin())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return admin ? <AdminApp /> : <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
