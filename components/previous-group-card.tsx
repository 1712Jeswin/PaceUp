"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

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
    <div className="neon-card p-4 opacity-60 hover:opacity-80 transition-opacity">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-display font-semibold text-text-secondary">
            {groupName}
          </h3>
          {leftDate && (
            <p className="text-[10px] text-text-muted font-mono mt-1">
              Left {leftDate}
            </p>
          )}
        </div>
        <button
          onClick={handleRemove}
          disabled={isDeleting}
          className="p-2 rounded-md text-text-muted hover:text-accent-magenta hover:bg-accent-magenta/10 transition-colors disabled:opacity-50"
          aria-label={`Remove ${groupName} from history`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
