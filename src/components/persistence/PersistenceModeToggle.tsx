'use client';

import { Database, HardDrive } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePersistenceMode } from '@/hooks/usePersistenceMode';
import type { PersistenceMode } from '@/lib/persistence/mode';

interface PersistenceModeToggleProps {
  compact?: boolean;
}

export default function PersistenceModeToggle({ compact = false }: PersistenceModeToggleProps) {
  const { mode, setMode } = usePersistenceMode();

  return (
    <div className="flex items-center gap-2">
      {!compact && <span className="text-sm text-slate-600">Storage</span>}
      <Tabs
        value={mode}
        onValueChange={(value) => setMode(value as PersistenceMode)}
      >
        <TabsList className="h-9">
          <TabsTrigger value="frontend" className="gap-1.5 px-2 text-xs">
            <HardDrive className="h-3.5 w-3.5" />
            Frontend
          </TabsTrigger>
          <TabsTrigger value="backend" className="gap-1.5 px-2 text-xs">
            <Database className="h-3.5 w-3.5" />
            Backend
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
