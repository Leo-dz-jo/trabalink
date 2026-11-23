import { useMutation } from "convex/react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Mode = "onsite" | "video" | "phone";

function tomorrow() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  applicantName,
  jobTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: Id<"applications">;
  applicantName: string;
  jobTitle: string;
}) {
  const schedule = useMutation(api.interviews.schedule);
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("45");
  const [mode, setMode] = useState<Mode>("video");
  const [location, setLocation] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const scheduledAt = new Date(`${date}T${time}`).getTime();
    if (Number.isNaN(scheduledAt)) {
      toast.error("Choose a valid date and time.");
      return;
    }
    setSaving(true);
    try {
      await schedule({
        applicationId,
        scheduledAt,
        durationMinutes: Number(duration),
        mode,
        location: mode === "onsite" ? location.trim() || undefined : undefined,
        meetingLink: mode === "video" ? meetingLink.trim() || undefined : undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(`Interview booked with ${applicantName}.`);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not schedule the interview.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <CalendarPlus className="size-4 text-primary" /> Schedule an interview
          </DialogTitle>
          <DialogDescription>
            {applicantName} · {jobTitle}. The applicant is notified immediately and
            the slot appears in their interview list.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="interview-date" className="text-xs font-semibold">
                Date
              </Label>
              <Input
                id="interview-date"
                type="date"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setDate(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interview-time" className="text-xs font-semibold">
                Start time
              </Label>
              <Input
                id="interview-time"
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duration</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Format</Label>
            <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Video call</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
                <SelectItem value="phone">Phone call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "onsite" && (
            <div className="space-y-1.5">
              <Label htmlFor="interview-location" className="text-xs font-semibold">
                Venue or address
              </Label>
              <Input
                id="interview-location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="e.g. 12F One Ayala Tower, Makati"
                className="h-10"
                maxLength={200}
              />
            </div>
          )}

          {mode === "video" && (
            <div className="space-y-1.5">
              <Label htmlFor="interview-link" className="text-xs font-semibold">
                Meeting link
              </Label>
              <Input
                id="interview-link"
                value={meetingLink}
                onChange={(event) => setMeetingLink(event.target.value)}
                placeholder="https://meet.google.com/..."
                className="h-10"
                maxLength={400}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="interview-notes" className="text-xs font-semibold">
              Notes for the candidate <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="interview-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Bring a valid ID, prepare a five-minute walkthrough of your capstone…"
              className="text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CalendarPlus className="size-4" />
            )}
            Book interview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
