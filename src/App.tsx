import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AdminView, type ClozeTaskData } from './AdminView.tsx'
import { isValidLogin } from './accounts.ts'
import { WorksheetView } from './WorksheetView.tsx'
import './App.css'

function AdminLoginPopup({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closedByCleanup = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    dialog.showModal()

    return () => {
      closedByCleanup.current = true
      if (dialog.open) dialog.close()
    }
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const username = String(data.get('name') ?? '').trim()
    const password = String(data.get('password') ?? '')

    if (isValidLogin(username, password)) {
      onSuccess()
      return
    }

    setError('Name oder Passwort ist falsch.')
  }

  return (
    <dialog
      ref={dialogRef}
      className="popup"
      aria-labelledby="admin-login-title"
      onClose={() => {
        if (!closedByCleanup.current) onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <h2 id="admin-login-title">Admin Login</h2>
      <form onSubmit={handleSubmit}>
        <label className="field">
          Name
          <input type="text" name="name" autoComplete="username" />
        </label>
        <label className="field">
          Passwort
          <input type="password" name="password" autoComplete="current-password" />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="submit-button">
          Anmelden
        </button>
      </form>
    </dialog>
  )
}

export default function App() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [sheetCode, setSheetCode] = useState('')
  const [enteredCode, setEnteredCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [tasks, setTasks] = useState<ClozeTaskData[]>([])

  function openWorksheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const code = enteredCode.trim()
    if (code && code === sheetCode) {
      setCodeError('')
      setSheetOpen(true)
      return
    }

    setCodeError(code ? 'Diesen Code gibt es nicht.' : 'Bitte Code eingeben.')
  }

  function returnToStart() {
    setLoggedIn(false)
    setSheetOpen(false)
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-start">
          {(loggedIn || sheetOpen) && (
            <button
              type="button"
              className="back-button"
              aria-label="Zurück zur Startansicht"
              onClick={returnToStart}
            >
              <BackIcon />
            </button>
          )}
        </div>
        <button type="button" className="login-button" onClick={() => setLoginOpen(true)}>
          Admin Login
        </button>
      </header>
      {loggedIn ? (
        <AdminView
          studentName={studentName}
          code={sheetCode}
          onStudentNameChange={setStudentName}
          onCodeChange={setSheetCode}
          tasks={tasks}
          onTasksChange={setTasks}
        />
      ) : sheetOpen ? (
        <WorksheetView studentName={studentName} tasks={tasks} />
      ) : (
        <main className="landing">
          <h1>Herzlich Willkommen!</h1>
          <form className="code-form" onSubmit={openWorksheet}>
            <input
              className="code-input"
              type="text"
              name="code"
              inputMode="numeric"
              placeholder="Bitte Code eingeben"
              aria-label="Bitte Code eingeben"
              autoComplete="off"
              value={enteredCode}
              onChange={(event) => {
                setEnteredCode(event.target.value.replace(/\D/g, ''))
                setCodeError('')
              }}
            />
            <button type="submit" className="visually-hidden">
              Arbeitsblatt öffnen
            </button>
            {codeError && <p className="form-error">{codeError}</p>}
          </form>
        </main>
      )}
      {loginOpen && (
        <AdminLoginPopup
          onClose={() => setLoginOpen(false)}
          onSuccess={() => {
            setLoggedIn(true)
            setSheetOpen(false)
            setLoginOpen(false)
          }}
        />
      )}
    </div>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19 12H5M11 6l-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
