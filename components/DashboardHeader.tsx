"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPlus, Upload, Mic } from "lucide-react";
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useBotStatus } from '@/app/context/bot-status-context';

// Dynamically import dialogs with no SSR
const InviteDialog = dynamic(() => import('@/app/dialogs/InviteDialog'), { ssr: false });
const ImportDialog = dynamic(() => import('@/app/dialogs/ImportDialog'), { ssr: false });
const RecordDialog = dynamic(() => import('@/app/dialogs/RecordDialog'), { ssr: false });

interface DashboardHeaderProps {
  title: string;
  onToggleHistory?: () => void;
  onTogglePrompts?: () => void;
  onToggleTools?: () => void;
  showHistory?: boolean;
  showPrompts?: boolean;
  showTools?: boolean;
}

export default function DashboardHeader({
  title,
  onToggleHistory = () => {},
  onTogglePrompts = () => {},
  onToggleTools = () => {},
  showHistory = false,
  showPrompts = false,
  showTools = false,
}: DashboardHeaderProps) {
  const router = useRouter();
  const { addBot } = useBotStatus();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showRecordDialog, setShowRecordDialog] = useState(false);

  const handleBotJoined = (botId: string, meetingUrl: string) => {
    addBot(botId, meetingUrl);
  };

  const handleStartRecording = () => {
    setShowRecordDialog(true);
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 h-16 flex-shrink-0 bg-white dark:bg-gray-950 sticky top-0 z-20">
        <span className="text-lg font-semibold text-gray-900 dark:text-white truncate" title={title}>
          {title}
        </span>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-700"
            onClick={() => setShowInviteDialog(true)}
          >
            <UserPlus className="h-4 w-4" />
            <span>Invite</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200 dark:border-gray-700"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 dark:bg-purple-900 dark:hover:bg-purple-800 dark:text-purple-100"
            onClick={handleStartRecording}
          >
            <Mic className="h-4 w-4" />
            <span>Record</span>
          </Button>
        </div>
      </header>

      {/* Dialogs */}
      {showInviteDialog && (
        <InviteDialog 
          open={showInviteDialog} 
          onOpenChange={setShowInviteDialog}
          onBotJoined={handleBotJoined}
        />
      )}
      {showImportDialog && (
        <ImportDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      )}
      {showRecordDialog && (
        <RecordDialog open={showRecordDialog} onOpenChange={setShowRecordDialog} />
      )}
    </>
  );
}