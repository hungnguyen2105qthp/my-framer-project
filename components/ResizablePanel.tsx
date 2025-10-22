"use client"

import { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from "@/components/ui/button"

type ResizablePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  position?: 'left' | 'right';
};

export function ResizablePanel({
  isOpen,
  onClose,
  children,
  defaultWidth = 400,
  minWidth = 300,
  maxWidth = 800,
  position = 'right',
}: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startResizing = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const stopResizing = () => {
    setIsResizing(false);
  };

  const resize = (e: MouseEvent) => {
    if (isResizing && panelRef.current) {
      const newWidth = position === 'right' 
        ? window.innerWidth - e.clientX 
        : e.clientX;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing]);

  const handleSuggestionClick = (suggestion: string) => {
    if (inputRef.current) {
      inputRef.current.value = suggestion;
      inputRef.current.focus();
    }
  };

  if (!isOpen) return null;

  const positionClasses = position === 'right' 
    ? 'right-0 top-0 bottom-0' 
    : 'left-0 top-0 bottom-0';

  return (
    <>
      <div 
        ref={panelRef}
        className={`fixed ${positionClasses} bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col z-40`}
        style={{ width: `${width}px` }}
      >
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
        
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about this meeting..."
              className="w-full pl-4 pr-12 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Button 
              variant="ghost"
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {["Summarize key points", "List action items", "Extract decisions"].map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs text-left p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
        
        <div
          className={`absolute top-0 bottom-0 w-1 cursor-ew-resize ${
            position === 'right' ? '-left-0.5' : '-right-0.5'
          }`}
          onMouseDown={startResizing}
        />
      </div>
      
      {/* Overlay for mobile */}
      <div 
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={onClose}
      />
    </>
  );
}
