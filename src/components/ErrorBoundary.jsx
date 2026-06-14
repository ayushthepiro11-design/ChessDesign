import { Component } from 'react'

/**
 * ErrorBoundary — catches render-time errors anywhere in the tree and
 * renders a friendly fallback with a Reload button. Logs the error to
 * the console for the developer.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ChessCard] render error:', error, info?.componentStack)
  }

  handleReload = () => {
    // Reset internal state and try the children again without a full reload.
    this.setState({ error: null })
  }

  handleHardReload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-canvas dark:bg-canvas-dark text-ink dark:text-ink-dark font-sans">
        <div className="max-w-md w-full rounded-2xl border-2 border-line dark:border-line-dark p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] bg-chip/70 dark:bg-chip-dark/70 backdrop-blur">
          <div className="flex items-center gap-3 mb-3">
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-[#C96442]/10 text-[#C96442] font-serif text-lg">!</span>
            <h1 className="font-serif text-xl font-semibold tracking-tight">Something broke</h1>
          </div>
          <p className="text-sm text-muted dark:text-muted-dark mb-4 leading-relaxed">
            ChessCard hit an unexpected error while rendering. You can try again — if it keeps happening, a hard reload usually fixes it.
          </p>
          {this.state.error?.message ? (
            <pre className="text-[11px] leading-snug text-muted dark:text-muted-dark bg-chip dark:bg-chip-dark/50 rounded-md p-3 mb-4 overflow-auto max-h-32 font-mono">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="boing flex-1 h-9 rounded-md border-2 border-line dark:border-line-dark bg-ink text-canvas dark:bg-canvas dark:text-ink-dark text-sm font-medium hover:-translate-y-0.5"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={this.handleHardReload}
              className="boing flex-1 h-9 rounded-md border-2 border-line dark:border-line-dark text-sm font-medium hover:-translate-y-0.5"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }
}
