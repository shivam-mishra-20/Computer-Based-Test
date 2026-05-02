"use client";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

interface AdminTimeSlotsConfigProps {
  onTimeSlotsUpdated: () => void;
}

export default function AdminTimeSlotsConfig({ onTimeSlotsUpdated }: AdminTimeSlotsConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [morningSlots, setMorningSlots] = useState<TimeSlot[]>([]);
  const [eveningSlots, setEveningSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTimeSlots();
    }
  }, [isOpen]);

  const loadTimeSlots = async () => {
    setLoading(true);
    try {
      const [mSlots, eSlots] = await Promise.all([
        apiFetch("/schedule/timeslots?view=morning"),
        apiFetch("/schedule/timeslots?view=evening"),
      ]);
      setMorningSlots(Array.isArray(mSlots) ? mSlots : []);
      setEveningSlots(Array.isArray(eSlots) ? eSlots : []);
    } catch (error) {
      console.error("Failed to load time slots", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/schedule/timeslots", {
        method: "PUT",
        body: JSON.stringify({ morningSlots, eveningSlots }),
      });
      setIsOpen(false);
      onTimeSlotsUpdated();
    } catch (error) {
      console.error("Failed to save time slots", error);
      alert("Failed to save time slots.");
    } finally {
      setSaving(false);
    }
  };

  const updateSlot = (
    type: "morning" | "evening",
    index: number,
    field: keyof TimeSlot,
    value: string
  ) => {
    const isMorning = type === "morning";
    const slots = isMorning ? [...morningSlots] : [...eveningSlots];
    slots[index] = { ...slots[index], [field]: value };
    
    // Auto-generate label if both start and end exist and label is empty or we just updated start/end
    if (field === "start" || field === "end") {
       const startStr = slots[index].start;
       const endStr = slots[index].end;
       if (startStr && endStr) {
          slots[index].label = `${to12HourLabel(startStr)} - ${to12HourLabel(endStr)}`;
       }
    }

    if (isMorning) setMorningSlots(slots);
    else setEveningSlots(slots);
  };

  const addSlot = (type: "morning" | "evening") => {
    const isMorning = type === "morning";
    const slots = isMorning ? [...morningSlots] : [...eveningSlots];
    slots.push({ start: "00:00", end: "01:00", label: "12:00 AM - 1:00 AM" });
    if (isMorning) setMorningSlots(slots);
    else setEveningSlots(slots);
  };

  const removeSlot = (type: "morning" | "evening", index: number) => {
    const isMorning = type === "morning";
    const slots = isMorning ? [...morningSlots] : [...eveningSlots];
    slots.splice(index, 1);
    if (isMorning) setMorningSlots(slots);
    else setEveningSlots(slots);
  };

  function to12HourLabel(hhmm: string): string {
    if (!hhmm || !hhmm.includes(":")) return hhmm;
    const [hStr, mStr] = hhmm.split(":");
    const hours24 = Number(hStr);
    const minutes = Number(mStr);
    if (isNaN(hours24) || isNaN(minutes)) return hhmm;
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  }

  const renderSlotGroup = (title: string, type: "morning" | "evening", slots: TimeSlot[]) => (
    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <button
          onClick={() => addSlot(type)}
          className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200 font-medium transition-colors"
        >
          + Add Slot
        </button>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300">
        {slots.length === 0 && (
          <p className="text-xs text-slate-500 italic py-2">No slots defined.</p>
        )}
        {slots.map((slot, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
            <input
              type="time"
              value={slot.start}
              onChange={(e) => updateSlot(type, idx, "start", e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 w-32"
            />
            <span className="text-slate-400 font-medium">to</span>
            <input
              type="time"
              value={slot.end}
              onChange={(e) => updateSlot(type, idx, "end", e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 w-32"
            />
            <input
              type="text"
              value={slot.label}
              onChange={(e) => updateSlot(type, idx, "label", e.target.value)}
              placeholder="Label"
              className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-emerald-500 flex-1"
            />
            <button
              onClick={() => removeSlot(type, idx)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Remove slot"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all duration-200"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Manage Time Slots
      </button>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Configure Global Time Slots"
        description="These time slots will be used to build the Timetable Grid across all classes."
        wide
        footer={
          <>
            <button
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Time Slots"}
            </button>
          </>
        }
      >
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="py-2">
            {renderSlotGroup("Morning Slots", "morning", morningSlots)}
            {renderSlotGroup("Evening Slots", "evening", eveningSlots)}
          </div>
        )}
      </Modal>
    </>
  );
}
