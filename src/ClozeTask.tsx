import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
  type RefObject,
} from 'react'
import { Modal } from './Modal.tsx'

function elementFromNode(node: Node | null): Element | null {
  if (!node) return null
  return node instanceof Element ? node : node.parentElement
}

function findGap(node: Node | null, editor: HTMLElement): HTMLElement | null {
  const gap = elementFromNode(node)?.closest('.gap-word')
  if (gap instanceof HTMLElement && editor.contains(gap)) return gap
  return null
}

function selectedGap(editor: HTMLElement): HTMLElement | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const range = selection.getRangeAt(0)
  if (!editor.contains(range.commonAncestorContainer)) return null

  const startGap = findGap(range.startContainer, editor)
  const endGap = findGap(range.endContainer, editor)
  if (startGap && startGap === endGap) return startGap

  if (range.startContainer === range.endContainer && range.startContainer instanceof Element) {
    const selected = [...range.startContainer.childNodes].slice(range.startOffset, range.endOffset)
    const only = selected.length === 1 ? selected[0] : null
    if (only instanceof HTMLElement && only.classList.contains('gap-word') && editor.contains(only)) {
      return only
    }
  }

  return null
}

function rangeIntersectsGap(range: Range): boolean {
  const ancestor = range.commonAncestorContainer
  const root = ancestor instanceof Element ? ancestor : ancestor.parentElement
  if (!root) return false

  for (const gap of root.querySelectorAll('.gap-word')) {
    if (range.intersectsNode(gap)) return true
  }

  return false
}

function trimRange(range: Range): boolean {
  if (range.startContainer.nodeType === Node.TEXT_NODE) {
    const text = range.startContainer.textContent ?? ''
    let start = range.startOffset
    const endLimit = range.endContainer === range.startContainer ? range.endOffset : text.length
    while (start < endLimit && /\s/.test(text[start] ?? '')) start += 1
    if (start !== range.startOffset) range.setStart(range.startContainer, start)
  }

  if (range.collapsed) return false

  if (range.endContainer.nodeType === Node.TEXT_NODE) {
    const text = range.endContainer.textContent ?? ''
    let end = range.endOffset
    const startLimit = range.endContainer === range.startContainer ? range.startOffset : 0
    while (end > startLimit && /\s/.test(text[end - 1] ?? '')) end -= 1
    if (end !== range.endOffset) range.setEnd(range.endContainer, end)
  }

  return !range.collapsed
}

function wrapRange(range: Range) {
  const span = document.createElement('span')
  span.className = 'gap-word'

  try {
    range.surroundContents(span)
  } catch {
    span.append(range.extractContents())
    range.insertNode(span)
  }
}

function unwrap(gap: HTMLElement) {
  const parent = gap.parentNode
  if (!parent) return

  while (gap.firstChild) parent.insertBefore(gap.firstChild, gap)
  gap.remove()
  parent.normalize()
}

function insertPlainText(text: string) {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(text)
  range.insertNode(node)
  range.setStartAfter(node)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

export function ClozeTask({
  html,
  onHtmlChange,
  onDelete,
}: {
  html: string
  onHtmlChange: (html: string) => void
  onDelete: () => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<Range | null>(null)
  const gapRef = useRef<HTMLElement | null>(null)
  const initialHtml = useRef(html)
  const onHtmlChangeRef = useRef(onHtmlChange)
  const [isGapSelected, setIsGapSelected] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    onHtmlChangeRef.current = onHtmlChange
  })

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) return

    editor.innerHTML = initialHtml.current
    if (!initialHtml.current) editor.focus()
  }, [])

  useEffect(() => {
    function syncSelection() {
      const editor = editorRef.current
      if (!editor) return

      const gap = selectedGap(editor)
      setIsGapSelected((current) => (current === (gap !== null) ? current : gap !== null))
    }

    document.addEventListener('selectionchange', syncSelection)
    return () => document.removeEventListener('selectionchange', syncSelection)
  }, [])

  const publish = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return

    for (const gap of editor.querySelectorAll('.gap-word')) {
      if (!gap.textContent) gap.remove()
    }

    onHtmlChangeRef.current(editor.innerHTML)
  }, [])

  function rememberSelection() {
    const editor = editorRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0 || !selection.anchorNode) return
    if (!editor.contains(selection.anchorNode) || selection.isCollapsed) return

    rangeRef.current = selection.getRangeAt(0).cloneRange()
    gapRef.current = selectedGap(editor)
  }

  function handleMouseDown(event: MouseEvent<HTMLButtonElement>) {
    rememberSelection()
    event.preventDefault()
  }

  function handleMark() {
    const editor = editorRef.current
    if (!editor) return

    const gap = gapRef.current
    if (gap && editor.contains(gap)) {
      unwrap(gap)
    } else {
      const range = rangeRef.current
      if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return
      if (!trimRange(range) || rangeIntersectsGap(range)) return
      wrapRange(range)
    }

    window.getSelection()?.removeAllRanges()
    rangeRef.current = null
    gapRef.current = null
    setIsGapSelected(false)
    publish()
  }

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      event.preventDefault()
      insertPlainText(event.clipboardData.getData('text/plain'))
      publish()
    },
    [publish],
  )

  return (
    <article className="task-card">
      <button
        type="button"
        className="discard-button"
        aria-label="Aufgabe verwerfen"
        onClick={() => setConfirmOpen(true)}
      >
        <TrashIcon />
      </button>
      <button type="button" className="mark-button" onMouseDown={handleMouseDown} onClick={handleMark}>
        {isGapSelected ? 'Lückenwort aufheben' : 'Zum Lückenwort machen'}
      </button>
      <ClozeEditor editorRef={editorRef} onInput={publish} onPaste={handlePaste} />
      {confirmOpen && (
        <Modal title="Sind Sie sicher?" onClose={() => setConfirmOpen(false)}>
          <div className="confirm-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmOpen(false)}>
              Nein
            </button>
            <button type="button" className="submit-button" onClick={onDelete}>
              Ja
            </button>
          </div>
        </Modal>
      )}
    </article>
  )
}

const ClozeEditor = memo(function ClozeEditor({
  editorRef,
  onInput,
  onPaste,
}: {
  editorRef: RefObject<HTMLDivElement | null>
  onInput: () => void
  onPaste: (event: ClipboardEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      ref={editorRef}
      className="cloze-editor"
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label="Lückentext"
      spellCheck
      suppressContentEditableWarning
      onInput={onInput}
      onPaste={onPaste}
    />
  )
})

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
