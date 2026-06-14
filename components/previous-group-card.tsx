"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, ArchiveRestore } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviousGroupCardProps {
  groupId: string;
  groupName: string;
  leftAt: string | null;
}

/**
 * Card for a group in the "Previous Groups" section.
 * Shows group name, leave date, and a "Remove" button to delete from history.
 */
export function PreviousGroupCard({
  groupId,
  groupName,
  leftAt,
}: PreviousGroupCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemove = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/previous`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      }
    } catch {
      // WHY: Silent fail is acceptable here — the card will remain visible
    } finally {
      setIsDeleting(false);
    }
  };

  const leftDate = leftAt
    ? new Date(leftAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="glass-panel rounded-lg p-4 opacity-70 hover:opacity-100 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-bg-secondary rounded-full border border-border/50 group-hover:border-accent-magenta/30 transition-colors">
            <ArchiveRestore className="w-4 h-4 text-text-muted group-hover:text-accent-magenta" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-text-secondary group-hover:text-text-primary transition-colors">
              {groupName}
            </h3>
            {leftDate && (
              <p className="text-[10px] text-text-muted font-mono mt-1">
                Archived {leftDate}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRemove}
          disabled={isDeleting}
          className="text-text-muted hover:text-accent-magenta hover:bg-accent-magenta/10"
          title={`Remove ${groupName} from history`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
