"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Edit,
  Save,
  X,
  Plus,
  FileText,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import {
  type GuestResponse,
  type GuestProfileResponse,
  type GuestNoteResponse,
  type UpdateGuestRequest,
  type AddGuestNoteRequest,
  type GuestBooking,
} from "@/lib/validators";
import {
  updateGuest,
  getGuestNotes,
  addGuestNote,
  getErrorMessage,
} from "@/lib/api/guests";

interface GuestProfileProps {
  guest: GuestResponse;
  bookingHistory: GuestBooking[];
  onUpdate: () => void;
}

export function GuestProfile({
  guest,
  bookingHistory,
  onUpdate,
}: GuestProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<GuestNoteResponse[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNote, setNewNote] = useState("");

  // Form state
  const [formData, setFormData] = useState<UpdateGuestRequest>({
    email: guest.email || null,
    full_name: guest.full_name || null,
    phone: guest.phone || null,
    id_number: guest.id_number || null,
  });

  useEffect(() => {
    loadNotes();
  }, [guest.id]);

  const loadNotes = async () => {
    setIsLoadingNotes(true);
    try {
      const notesData = await getGuestNotes(guest.id);
      setNotes(notesData);
    } catch (err: unknown) {
      console.error("Failed to load notes:", err);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      await updateGuest(guest.id, formData);
      setIsEditing(false);
      onUpdate();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to update guest information");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      email: guest.email || null,
      full_name: guest.full_name || null,
      phone: guest.phone || null,
      id_number: guest.id_number || null,
    });
    setError(null);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      setError("Note cannot be empty");
      return;
    }

    setIsAddingNote(true);
    setError(null);

    try {
      await addGuestNote(guest.id, { note: newNote });
      setNewNote("");
      setIsAddingNote(false);
      loadNotes();
    } catch (err: unknown) {
      setError(getErrorMessage(err) || "Failed to add note");
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Guest Information Card */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-slate-100 flex items-center gap-2">
              <User className="h-5 w-5" />
              Guest Profile
            </CardTitle>
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                className="bg-amber-500 text-slate-900 hover:bg-amber-400"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="ghost"
                  className="text-slate-300 hover:text-slate-100"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  size="sm"
                  disabled={isSaving}
                  className="bg-amber-500 text-slate-900 hover:bg-amber-400"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </Label>
              {isEditing ? (
                <Input
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value || null })
                  }
                  className="bg-slate-700/50 border-slate-600 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{guest.full_name || "—"}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value || null })
                  }
                  className="bg-slate-700/50 border-slate-600 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{guest.email || "—"}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </Label>
              {isEditing ? (
                <Input
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value || null })
                  }
                  className="bg-slate-700/50 border-slate-600 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{guest.phone || "—"}</p>
              )}
            </div>

            {/* ID Number */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                ID Number
              </Label>
              {isEditing ? (
                <Input
                  value={formData.id_number || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, id_number: e.target.value || null })
                  }
                  className="bg-slate-700/50 border-slate-600 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{guest.id_number || "—"}</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-700">
            <p className="text-sm text-slate-400">
              Member since: {format(new Date(guest.created_at), "MMMM d, yyyy")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Booking History */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Booking History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bookingHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <p>No booking history found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-slate-800/50">
                  <TableHead className="text-slate-300">Reference</TableHead>
                  <TableHead className="text-slate-300">Room</TableHead>
                  <TableHead className="text-slate-300">Check-in</TableHead>
                  <TableHead className="text-slate-300">Check-out</TableHead>
                  <TableHead className="text-slate-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingHistory.map((booking) => (
                  <TableRow
                    key={booking.booking.id}
                    className="border-slate-700 hover:bg-slate-800/50"
                  >
                    <TableCell className="text-slate-100 font-mono text-sm">
                      {booking.booking.reference}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {booking.room?.number || "—"}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(
                        new Date(booking.booking.check_in_date),
                        "MMM d, yyyy"
                      )}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {format(
                        new Date(booking.booking.check_out_date),
                        "MMM d, yyyy"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          booking.booking.status === "checked_out"
                            ? "bg-emerald-500 hover:bg-emerald-600"
                            : booking.booking.status === "checked_in"
                            ? "bg-blue-500 hover:bg-blue-600"
                            : booking.booking.status === "upcoming"
                            ? "bg-amber-500 hover:bg-amber-600"
                            : "bg-red-500 hover:bg-red-600"
                        }
                      >
                        {booking.booking.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Interaction Notes */}
      <Card className="bg-slate-800/80 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Interaction Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add Note Form */}
          <div className="mb-6 space-y-2">
            <Label className="text-slate-300">Add Note</Label>
            <Textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Enter interaction note..."
              className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder:text-slate-500 min-h-[100px]"
              disabled={isAddingNote}
            />
            <Button
              onClick={handleAddNote}
              disabled={isAddingNote || !newNote.trim()}
              className="bg-amber-500 text-slate-900 hover:bg-amber-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>

          {/* Notes List */}
          {isLoadingNotes ? (
            <div className="text-center text-slate-400 py-4">
              Loading notes...
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center text-slate-400 py-4">
              <p>No interaction notes yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg"
                >
                  <p className="text-slate-100 whitespace-pre-wrap">{note.note}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

