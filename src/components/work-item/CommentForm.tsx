"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { addComment } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ itemId }: { itemId: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await addComment(itemId, body);
          if (res?.error) setError(res.error);
          else setBody("");
        });
      }}
      className="space-y-2"
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment…"
        rows={3}
        aria-label="Comment body"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" size="sm" disabled={pending || !body.trim()}>
        <Send className="size-4" /> Comment
      </Button>
    </form>
  );
}
