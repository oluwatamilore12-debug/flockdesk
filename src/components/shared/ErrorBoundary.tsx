import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui'

interface Props {
  children: ReactNode
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <div className="max-w-lg rounded-2xl border border-[#F0F2FA] bg-[#F0F2FA] p-8">
            <h2 className="font-display text-xl font-bold text-[#FF052E]">
              {this.props.label || 'Something went wrong'}
            </h2>
            <p className="mt-2 text-sm text-[#001996]">{this.state.error.message}</p>
            <Button className="mt-4" onClick={() => { this.setState({ error: null }); window.location.reload() }}>
              Reload Page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}