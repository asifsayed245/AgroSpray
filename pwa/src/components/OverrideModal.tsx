import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

const TARGETS = [
  "compliance",
  "confirmed",
  "crew_assigned",
  "in_progress",
  "complete",
  "invoiced",
  "paid",
  "comp_fail",
  "cancelled",
] as const;

interface Props {
  open: boolean;
  currentState: string;
  onClose: () => void;
  onSubmit: (newState: string, reason: string) => Promise<void> | void;
}

export function OverrideModal({ open, currentState, onClose, onSubmit }: Props) {
  const [target, setTarget] = useState<string>("confirmed");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = reason.trim().length >= 20 && target !== currentState;

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-3xl bg-white p-5 shadow-pop safe-bottom data-[state=open]:animate-fade-in md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl">
          <div className="flex items-start justify-between">
            <div className="row">
              <IconTile tone="warn"><ShieldAlert className="h-5 w-5" /></IconTile>
              <div>
                <Dialog.Title className="text-base font-semibold text-ink-900">
                  Override state
                </Dialog.Title>
                <Dialog.Description className="text-xs text-ink-500">
                  This action is audited. Provide a reason (min 20 chars).
                </Dialog.Description>
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="rounded-full p-1 text-ink-500 hover:bg-ink-900/5">
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <div className="text-xs font-medium text-ink-700 mb-1.5">Move to</div>
              <div className="flex flex-wrap gap-2">
                {TARGETS.filter((t) => t !== currentState).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    className={`pill border ${
                      target === t
                        ? "bg-brand-700 text-white border-brand-700"
                        : "bg-white text-ink-700 border-ink-900/8"
                    }`}
                  >
                    {t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-700 mb-1.5">Reason</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Explain why this transition is being forced (incident, customer service, regulator request, etc.)"
                className="w-full rounded-2xl border border-ink-900/8 bg-white p-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200/70"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-ink-500">
                <span>Minimum 20 characters.</span>
                <span className={reason.length >= 20 ? "text-ok" : "text-ink-400"}>{reason.length} / 20</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <Button variant="outline" block onClick={onClose}>Cancel</Button>
            <Button
              block
              disabled={!valid || submitting}
              onClick={async () => {
                setSubmitting(true);
                await onSubmit(target, reason);
                setSubmitting(false);
              }}
            >
              {submitting ? "Saving…" : "Confirm override"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
