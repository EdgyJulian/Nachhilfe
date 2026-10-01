import { useState, type Dispatch, type SetStateAction } from 'react'
import { ClozeTask } from './ClozeTask.tsx'
import { Modal } from './Modal.tsx'

export type ClozeTaskData = {
  id: string
  type: 'cloze'
  html: string
}

export function AdminView({
  studentName,
  code,
  onStudentNameChange,
  onCodeChange,
  tasks,
  onTasksChange,
}: {
  studentName: string
  code: string
  onStudentNameChange: (studentName: string) => void
  onCodeChange: (code: string) => void
  tasks: ClozeTaskData[]
  onTasksChange: Dispatch<SetStateAction<ClozeTaskData[]>>
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  function addClozeTask() {
    onTasksChange((current) => [...current, { id: crypto.randomUUID(), type: 'cloze', html: '' }])
    setPickerOpen(false)
  }

  function updateTask(id: string, html: string) {
    onTasksChange((current) => current.map((task) => (task.id === id ? { ...task, html } : task)))
  }

  function deleteTask(id: string) {
    onTasksChange((current) => current.filter((task) => task.id !== id))
  }

  return (
    <div className="tool">
      <aside className="sidebar" aria-label="Seitenleiste" />
      <main className="tool-main">
        <div className="sheet-fields">
          <label className="field">
            Name des Schülers
            <input
              type="text"
              name="studentName"
              value={studentName}
              autoComplete="off"
              onChange={(event) => onStudentNameChange(event.target.value)}
            />
          </label>
          <label className="field">
            Code
            <input
              type="text"
              name="sheetCode"
              inputMode="numeric"
              value={code}
              autoComplete="off"
              onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, ''))}
            />
          </label>
        </div>
        <div className="task-stack">
          <div className="task-stack-inner">
            {tasks.map((task) => (
              <ClozeTask
                key={task.id}
                html={task.html}
                onHtmlChange={(html) => updateTask(task.id, html)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
            <button type="button" className="add-task" aria-label="Neue Aufgabe" onClick={() => setPickerOpen(true)}>
              <span aria-hidden="true">+</span>
            </button>
          </div>
        </div>
      </main>
      {pickerOpen && (
        <Modal title="Aufgabentyp" onClose={() => setPickerOpen(false)}>
          <button type="button" className="type-option" onClick={addClozeTask}>
            Lückentext
          </button>
        </Modal>
      )}
    </div>
  )
}
