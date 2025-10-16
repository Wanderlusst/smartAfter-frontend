'use client';

import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:backdrop-blur-sm",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          loading: "group-[.toast]:bg-blue-50 group-[.toast]:border-blue-200 dark:group-[.toast]:bg-blue-900/20 dark:group-[.toast]:border-blue-800",
          success: "group-[.toast]:bg-green-50 group-[.toast]:border-green-200 dark:group-[.toast]:bg-green-900/20 dark:group-[.toast]:border-green-800",
          error: "group-[.toast]:bg-red-50 group-[.toast]:border-red-200 dark:group-[.toast]:bg-red-900/20 dark:group-[.toast]:border-red-800",
        },
        style: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
