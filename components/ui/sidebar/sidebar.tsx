"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PanelLeft } from "lucide-react"
import { Slot } from "@radix-ui/react-slot"

export interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

export interface SidebarProviderProps {
  children: React.ReactNode;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface SidebarComponentProps extends React.HTMLAttributes<HTMLDivElement> {}
export interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {}
export interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {}
export interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  asChild?: boolean;
}

export interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const SidebarProviderComponent = React.forwardRef<HTMLDivElement, SidebarProviderProps>(
  ({ children }, ref) => {
    const [isOpen, setIsOpen] = React.useState(true)

    return (
      <SidebarContext.Provider value={{ isOpen, setIsOpen }}>
        <div ref={ref} className="flex min-h-screen">
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProviderComponent.displayName = "SidebarProvider"

const SidebarComponent = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ children, className, ...props }, ref) => {
    const { isOpen } = useSidebar()

    return (
      <div
        ref={ref}
        className={cn(
          "bg-gray-50 dark:bg-gray-900 border-r dark:border-gray-800 transition-all duration-300",
          isOpen ? "w-64" : "w-0 overflow-hidden",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
SidebarComponent.displayName = "Sidebar"

const SidebarHeaderComponent = React.forwardRef<HTMLDivElement, SidebarComponentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4", className)} {...props} />
  )
)
SidebarHeaderComponent.displayName = "SidebarHeader"

const SidebarContentComponent = React.forwardRef<HTMLDivElement, SidebarComponentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 overflow-auto", className)} {...props} />
  )
)
SidebarContentComponent.displayName = "SidebarContent"

const SidebarMenuComponent = React.forwardRef<HTMLUListElement, SidebarMenuProps>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn("space-y-1", className)} {...props} />
  )
)
SidebarMenuComponent.displayName = "SidebarMenu"

const SidebarMenuItemComponent = React.forwardRef<HTMLLIElement, SidebarMenuItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("", className)} {...props} />
  )
)
SidebarMenuItemComponent.displayName = "SidebarMenuItem"

const SidebarMenuButtonComponent = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, isActive, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(
          "flex w-full items-center px-4 py-2 text-sm rounded-lg",
          isActive
            ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
          className
        )}
        {...props}
      />
    )
  }
)
SidebarMenuButtonComponent.displayName = "SidebarMenuButton"

const SidebarTriggerComponent = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(
  ({ variant = "ghost", size = "icon", className, ...props }, ref) => {
    const { setIsOpen } = useSidebar()

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        onClick={() => setIsOpen(prev => !prev)}
        className={cn("h-8 w-8", className)}
        {...props}
      >
        <PanelLeft className="h-4 w-4" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    )
  }
)
SidebarTriggerComponent.displayName = "SidebarTrigger"

export const SidebarProvider = SidebarProviderComponent
export const Sidebar = SidebarComponent
export const SidebarHeader = SidebarHeaderComponent
export const SidebarContent = SidebarContentComponent
export const SidebarMenu = SidebarMenuComponent
export const SidebarMenuItem = SidebarMenuItemComponent
export const SidebarMenuButton = SidebarMenuButtonComponent
export const SidebarTrigger = SidebarTriggerComponent 