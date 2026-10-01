import { Fragment, type ReactNode } from 'react'
import type { ClozeTaskData } from './AdminView.tsx'

export function WorksheetView({
  studentName,
  tasks,
}: {
  studentName: string
  tasks: ClozeTaskData[]
}) {
  return (
    <main className="worksheet">
      <div className="worksheet-inner">
        {studentName && <h1>{studentName}</h1>}
        {tasks.map((task) => (
          <article key={task.id} className="worksheet-task">
            {renderCloze(task.html)}
          </article>
        ))}
      </div>
    </main>
  )
}

function renderCloze(html: string): ReactNode {
  const document = new DOMParser().parseFromString(html, 'text/html')
  return renderNodes(document.body, 'cloze')
}

function renderNodes(parent: Node, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []

  parent.childNodes.forEach((node, index) => {
    const key = `${keyPrefix}-${index}`

    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) nodes.push(node.textContent)
      return
    }

    if (!(node instanceof HTMLElement)) return

    if (node.classList.contains('gap-word')) {
      const length = Math.max((node.textContent ?? '').length, 3)
      nodes.push(
        <input
          key={key}
          className="gap-blank"
          aria-label="Lücke"
          style={{ width: `${length + 1}ch` }}
        />,
      )
      return
    }

    if (node.tagName === 'BR') {
      nodes.push(<br key={key} />)
      return
    }

    if (node.tagName === 'DIV' || node.tagName === 'P') {
      nodes.push(
        <span key={key} className="cloze-line">
          {renderNodes(node, key)}
        </span>,
      )
      return
    }

    nodes.push(<Fragment key={key}>{renderNodes(node, key)}</Fragment>)
  })

  return nodes
}
