import { Toaster as Sonner } from 'sonner'

function Toaster() {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-800 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-zinc-400',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400'
        }
      }}
    />
  )
}

export { Toaster }
