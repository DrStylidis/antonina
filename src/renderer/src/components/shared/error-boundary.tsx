import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="text-center max-w-sm">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
            <h3 className="text-[15px] font-semibold mb-2">Something went wrong</h3>
            <p className="text-[13px] text-zinc-500 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Try again
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
