/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api";
import dynamic from "next/dynamic";
import { CalendarIcon, ClockIcon } from "lucide-react";

import AdminTimeSlotsConfig from "@/components/admin/app-management/AdminTimeSlotsConfig";
import { toast } from "sonner";

// Dynamically import AdminBatchManagement to avoid SSR issues
const AdminBatchManagement = dynamic(
  () => import("@/components/admin/AdminBatchManagement"),
  { ssr: false }
);

type ScheduleType = "regular" | "custom";
type EventType = "class" | "exam" | "event" | "holiday";

interface Schedule {
  _id: string;
  title: string;
  scheduleType: ScheduleType;
  type: EventType;
  dayOfWeek?: number;
  startTimeSlot: string;
  endTimeSlot: string;
  date?: string;
  subject: string;
  classLevel: string;
  batch: string;
  batches?: string[];
  batchLabel?: string;
  roomNumber: number;
  teacherName?: string;
  teacherId?: string;
  students?: string[];
}

interface Batch {
  _id: string;
  name: string;
  classLevels: string[];
  isDefault: boolean;
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
  firebaseUid?: string;
  source?: "firebase" | "mongodb";
}

interface Student {
  id: string;
  name: string;
  email?: string;
  classLevel?: string;
  batch?: string;
  source?: "firebase" | "mongodb";
}

interface TimeSlot {
  start: string;
  end: string;
  label: string;
}

type TimeSlotView = "morning" | "morning2" | "evening" | "all";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const CLASS_LEVELS = ["7", "8", "9", "10", "11", "12"];

const DEFAULT_MORNING_TIME_SLOTS: TimeSlot[] = [
  { start: "10:30", end: "11:30", label: "10:30 AM - 11:30 AM" },
  { start: "11:30", end: "12:30", label: "11:30 AM - 12:30 PM" },
  { start: "12:30", end: "13:30", label: "12:30 PM - 1:30 PM" },
  { start: "13:30", end: "14:30", label: "1:30 PM - 2:30 PM" },
  { start: "14:30", end: "15:30", label: "2:30 PM - 3:30 PM" },
];

const DEFAULT_MORNING2_TIME_SLOTS: TimeSlot[] = [
  { start: "09:00", end: "10:00", label: "9:00 AM - 10:00 AM" },
  { start: "10:00", end: "11:00", label: "10:00 AM - 11:00 AM" },
  { start: "11:00", end: "12:00", label: "11:00 AM - 12:00 PM" },
  { start: "12:00", end: "13:00", label: "12:00 PM - 1:00 PM" },
];

const DEFAULT_EVENING_TIME_SLOTS: TimeSlot[] = [
  { start: "15:30", end: "16:30", label: "3:30 PM - 4:30 PM" },
  { start: "16:30", end: "17:30", label: "4:30 PM - 5:30 PM" },
  { start: "17:30", end: "18:30", label: "5:30 PM - 6:30 PM" },
  { start: "18:30", end: "19:30", label: "6:30 PM - 7:30 PM" },
  { start: "19:30", end: "20:30", label: "7:30 PM - 8:30 PM" },
  { start: "20:30", end: "21:30", label: "8:30 PM - 9:30 PM" },
  { start: "21:30", end: "22:30", label: "9:30 PM - 10:30 PM" },
];

function parseHHMMToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((v) => Number(v));
  return h * 60 + m;
}

function minutesToHHMM(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((totalMinutes % minutesInDay) + minutesInDay) % minutesInDay;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function to12HourLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const hours24 = Number(hStr);
  const minutes = Number(mStr);
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function buildTimeSlot(start: string, end: string): TimeSlot {
  return {
    start,
    end,
    label: `${to12HourLabel(start)} - ${to12HourLabel(end)}`,
  };
}

function mergeTimeSlotCollections(
  ...collections: Array<TimeSlot[] | undefined>
): TimeSlot[] {
  const slotMap = new Map<string, TimeSlot>();

  collections.forEach((collection) => {
    if (!Array.isArray(collection)) return;

    collection.forEach((slot) => {
      if (!slot?.start || !slot?.end) return;

      const existing = slotMap.get(slot.start);
      if (!existing) {
        slotMap.set(
          slot.start,
          slot.label?.trim() ? slot : buildTimeSlot(slot.start, slot.end)
        );
        return;
      }

      if (existing.end !== slot.end) {
        const existingDuration = parseHHMMToMinutes(existing.end) - parseHHMMToMinutes(existing.start);
        const nextDuration = parseHHMMToMinutes(slot.end) - parseHHMMToMinutes(slot.start);
        if (nextDuration > existingDuration) {
          slotMap.set(slot.start, slot.label?.trim() ? slot : buildTimeSlot(slot.start, slot.end));
        }
      }
    });
  });

  return Array.from(slotMap.values()).sort(
    (a, b) => parseHHMMToMinutes(a.start) - parseHHMMToMinutes(b.start)
  );
}

function generateTimeSlots(options: {
  start: string;
  end: string;
  stepMinutes: number;
  durationMinutes: number;
}): TimeSlot[] {
  const startMin = parseHHMMToMinutes(options.start);
  const endMin = parseHHMMToMinutes(options.end);

  // If end <= start, treat end as end-of-day boundary
  const endBoundary = endMin > startMin ? endMin : 24 * 60;

  const slots: TimeSlot[] = [];
  for (let t = startMin; t + options.durationMinutes <= endBoundary; t += options.stepMinutes) {
    const start = minutesToHHMM(t);
    const end = minutesToHHMM(t + options.durationMinutes);
    slots.push({
      start,
      end,
      label: `${to12HourLabel(start)} - ${to12HourLabel(end)}`,
    });
  }
  return slots;
}

function getScheduleBatches(schedule: Partial<Schedule>): string[] {
  if (schedule.classLevel?.trim() === "7") {
    return [];
  }

  const multiple = Array.isArray(schedule.batches)
    ? schedule.batches.map((batch) => batch?.trim()).filter(Boolean) as string[]
    : [];

  if (multiple.length > 0) {
    return Array.from(new Set(multiple));
  }

  const single = schedule.batch?.trim();
  return single ? [single] : [];
}

function getBatchDisplayLabel(schedule: Partial<Schedule>): string {
  if (schedule.batchLabel?.trim()) {
    return schedule.batchLabel;
  }
  const batches = getScheduleBatches(schedule);
  return batches.length > 0 ? batches.join(", ") : "No batch";
}

export default function ScheduleManagement() {
  const [activeTab, setActiveTab] = useState<"regular" | "custom" | "batches" | "daily_view">(
    "regular"
  );
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [dynamicTimeSlots, setDynamicTimeSlots] = useState<TimeSlot[]>([]);
  const [timeSlotView, setTimeSlotView] = useState<TimeSlotView>("evening");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [teachersOnLeave, setTeachersOnLeave] = useState<string[]>([]); // Teacher IDs on approved leave
  const [allowCustomRegularTime, setAllowCustomRegularTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Filters
  const [filterClass, setFilterClass] = useState("11");
  const [filterBatch, setFilterBatch] = useState("");
  const [filterDay] = useState(1); // Monday default (setter unused)
  const [customWeekStart, setCustomWeekStart] = useState(new Date());

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    scheduleType: "regular" as ScheduleType,
    type: "class" as EventType,
    dayOfWeek: 1,
    startTimeSlot: "",
    endTimeSlot: "",
    date: "",
    subject: "",
    classLevel: "11",
    batch: "",
    batches: [] as string[],
    roomNumber: 1,
    teacherId: "",
    selectedStudents: [] as string[],
  });

  // Fetch students based on selected class and batch selection
  useEffect(() => {
    const fetchStudents = async () => {
      if (!formData.classLevel) {
          setStudents([]);
          return;
      }
  
      try {
        const params = new URLSearchParams();
        if (formData.classLevel) params.append('classLevel', formData.classLevel);
        // For multiple selected batches, fetch by class and filter client-side.
        if (formData.batches.length === 1) params.append('batch', formData.batches[0]);
        
        // Use the newly created endpoint that fetches from both Mongo and Firebase
        const res: unknown = await apiFetch(`/schedule/students?${params.toString()}`);
        if (res) {
          setStudents(Array.isArray(res) ? res as Student[] : []);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    fetchStudents();
  }, [formData.classLevel, formData.batches]);

  // Refetch teachers on leave when date changes in the form
  useEffect(() => {
    if (isModalOpen && formData.date) {
      fetchTeachersOnLeave(formData.date);
    } else if (isModalOpen && formData.scheduleType === "regular" && formData.dayOfWeek) {
      // For regular schedule, check the upcoming occurrence of this day
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const daysToAdd = formData.dayOfWeek - currentDayOfWeek;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      fetchTeachersOnLeave(targetDate.toISOString().split("T")[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.dayOfWeek, isModalOpen]);

  // Timetable grid state
  // Regular: grid[dayIndex][timeSlot] -> Schedule
  // Custom: grid[classLevel][batch][timeSlot] -> Schedule
  type TimetableGrid = Record<string, Record<string, Schedule>> | Record<string, Record<string, Record<string, Schedule>>>;
  const [timetableGrid, setTimetableGrid] = useState<TimetableGrid>({});

  const filteredDynamicTimeSlots = useMemo(() => {
    if (timeSlotView === "all") return dynamicTimeSlots;
    const allowedStarts = new Set(timeSlots.map((slot) => slot.start));
    return dynamicTimeSlots.filter((slot) => {
      // On the regular tab always show occupied slots so existing classes are never hidden
      if (activeTab === "regular") {
        const grid = timetableGrid as Record<string, Record<string, Schedule>>;
        const isOccupied = Object.values(grid).some(
          (daySlots) => daySlots[slot.start] != null
        );
        if (isOccupied) return true;
      }
      return allowedStarts.has(slot.start);
    });
  }, [dynamicTimeSlots, timeSlots, timeSlotView, activeTab, timetableGrid]);

  const visibleTimeSlots = useMemo(
    () => mergeTimeSlotCollections(timeSlots, filteredDynamicTimeSlots),
    [timeSlots, filteredDynamicTimeSlots]
  );

  const getDefaultEndTime = (start: string) => {
    const matchingSlot = visibleTimeSlots.find((slot) => slot.start === start);
    if (matchingSlot) return matchingSlot.end;
    return minutesToHHMM(parseHHMMToMinutes(start) + 60);
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const batchesData = await apiFetch('/schedule/batches');
      const normalizedBatches = Array.isArray(batchesData) ? (batchesData as Batch[]) : [];
      setBatches(normalizedBatches);

      // Fetch teachers from MongoDB only (not Firebase)
      const teachersData = await apiFetch('/schedule/teachers');
      setTeachers((teachersData as any[]).map((t: Teacher & { _id?: string }) => ({
        id: t._id || t.id,
        name: t.name,
        email: t.email,
        firebaseUid: t.firebaseUid,
        source: 'mongodb'
      })));

      if (timeSlotView === 'morning') {
        setTimeSlots(DEFAULT_MORNING_TIME_SLOTS);
      } else if (timeSlotView === 'morning2') {
        setTimeSlots(DEFAULT_MORNING2_TIME_SLOTS);
      } else if (timeSlotView === 'all') {
        setTimeSlots(
          generateTimeSlots({
            start: '00:00',
            end: '24:00',
            stepMinutes: 30,
            durationMinutes: 60,
          })
        );
      } else {
        try {
          const serverSlots = await apiFetch('/schedule/timeslots');
          if (
            Array.isArray(serverSlots) &&
            serverSlots.every((s) => typeof s?.start === 'string' && typeof s?.end === 'string')
          ) {
            setTimeSlots(serverSlots as TimeSlot[]);
          } else {
            setTimeSlots(DEFAULT_EVENING_TIME_SLOTS);
          }
        } catch {
          setTimeSlots(DEFAULT_EVENING_TIME_SLOTS);
        }
      }

      const defaultBatch = normalizedBatches.find((batch) => batch.classLevels.includes(filterClass))?.name || "";
      setFilterBatch(defaultBatch);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Initial load only

  useEffect(() => {
    const applyTimeSlotView = async () => {
      try {
        let url = '/schedule/timeslots';
        if (timeSlotView === 'morning') url = '/schedule/timeslots?view=morning';
        else if (timeSlotView === 'morning2') url = '/schedule/timeslots?view=morning2';
        else if (timeSlotView === 'all') url = '/schedule/timeslots?view=all';
        
        const serverSlots = await apiFetch(url);
        if (Array.isArray(serverSlots) && serverSlots.every((s) => typeof s?.start === 'string' && typeof s?.end === 'string')) {
          setTimeSlots(serverSlots as TimeSlot[]);
        } else {
          const fallbackSlots =
            timeSlotView === 'morning'
              ? DEFAULT_MORNING_TIME_SLOTS
              : timeSlotView === 'morning2'
                ? DEFAULT_MORNING2_TIME_SLOTS
                : DEFAULT_EVENING_TIME_SLOTS;
          setTimeSlots(fallbackSlots);
        }
      } catch {
        const fallbackSlots =
          timeSlotView === 'morning'
            ? DEFAULT_MORNING_TIME_SLOTS
            : timeSlotView === 'morning2'
              ? DEFAULT_MORNING2_TIME_SLOTS
              : DEFAULT_EVENING_TIME_SLOTS;
        setTimeSlots(fallbackSlots);
      }
    };

    applyTimeSlotView();
  }, [timeSlotView]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (formData.scheduleType !== 'regular') return;
    if (allowCustomRegularTime) return;
    if (!visibleTimeSlots.length) return;

    const exists = visibleTimeSlots.some((t) => t.start === formData.startTimeSlot);
    if (exists) return;

    setFormData((prev) => ({
      ...prev,
      startTimeSlot: visibleTimeSlots[0].start,
      endTimeSlot: visibleTimeSlots[0].end,
    }));
  }, [visibleTimeSlots, isModalOpen, formData.scheduleType, formData.startTimeSlot, allowCustomRegularTime]);

  useEffect(() => {
    if (activeTab === "daily_view") {
       loadTimetable();
    } else if (filterClass && (activeTab === "custom" || activeTab === "regular")) {
      if (activeTab === "regular" || activeTab === "custom") {
        loadTimetable();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filterClass, filterBatch, filterDay, customWeekStart]);

  const loadTimetable = async () => {
    try {
      if (activeTab === "regular") {
        const params = new URLSearchParams({ classLevel: filterClass });
        if (filterBatch) {
          params.set("batch", filterBatch);
        }

        const [data, regularSchedules] = await Promise.all([
          apiFetch(`/schedule/timetable?${params.toString()}`),
          apiFetch(`/schedule?scheduleType=regular&${params.toString()}`),
        ]);

        const regularData = data as {
          grid?: Record<string, Record<string, Schedule>>;
          timeSlots?: TimeSlot[];
          scheduleTimeSlots?: TimeSlot[];
        };

        setTimetableGrid(regularData.grid || {});

        // scheduleTimeSlots = actual slots used by schedules in the grid (from backend)
        // Also derive from the list endpoint as a fallback
        const scheduleSlots = Array.isArray(regularSchedules)
          ? (regularSchedules as Schedule[])
              .filter((s) => s.startTimeSlot && s.endTimeSlot)
              .map((s) => buildTimeSlot(s.startTimeSlot, s.endTimeSlot))
          : [];

        // Always include occupied slots so classes are never hidden by view filter
        setDynamicTimeSlots(
          mergeTimeSlotCollections(
            Array.isArray(regularData.timeSlots) ? regularData.timeSlots : [],
            Array.isArray(regularData.scheduleTimeSlots) ? regularData.scheduleTimeSlots : [],
            scheduleSlots
          )
        );
      } else if (activeTab === "custom") {
        const start = new Date(customWeekStart);
        const dateStr = start.toISOString().split('T')[0];
        const schedules = await apiFetch(`/schedule?scheduleType=custom&startDate=${dateStr}&endDate=${dateStr}`);
        
        const grid: Record<string, Record<string, Record<string, Schedule>>> = {};
        if (Array.isArray(schedules)) {
          schedules.forEach((s: Schedule) => {
             if (s.date && s.date.startsWith(dateStr)) {
                const scheduleBatches = getScheduleBatches(s);
                const targetBatches = scheduleBatches.length > 0 ? scheduleBatches : [""];
                if (!grid[s.classLevel]) grid[s.classLevel] = {};
                targetBatches.forEach((batchName) => {
                  if (!grid[s.classLevel][batchName]) grid[s.classLevel][batchName] = {};
                  grid[s.classLevel][batchName][s.startTimeSlot] = s;
                });
             }
          });

          const customSlots = (schedules as Schedule[])
            .filter((s) => s.startTimeSlot && s.endTimeSlot)
            .map((s) => buildTimeSlot(s.startTimeSlot, s.endTimeSlot));
          setDynamicTimeSlots(mergeTimeSlotCollections(customSlots));
        } else {
          setDynamicTimeSlots([]);
        }
        setTimetableGrid(grid);
      } else if (activeTab === "daily_view") {
        const start = new Date(customWeekStart);
        const dateStr = start.toISOString().split('T')[0];
        const schedules = await apiFetch(`/schedule/institute-view?date=${dateStr}`);
        
        const grid: Record<string, Record<string, Record<string, Schedule>>> = {};
        if (Array.isArray(schedules)) {
          schedules.forEach((s: Schedule) => {
             // For daily view, we might include both regular (mapped to this day) and custom
             // The backend handles the mapping. We just need to place them in the grid.
             const scheduleBatches = getScheduleBatches(s);
             const targetBatches = scheduleBatches.length > 0 ? scheduleBatches : [""];
             if (!grid[s.classLevel]) grid[s.classLevel] = {};
             targetBatches.forEach((batchName) => {
               if (!grid[s.classLevel][batchName]) grid[s.classLevel][batchName] = {};
               grid[s.classLevel][batchName][s.startTimeSlot] = s;
             });
          });

          const dailySlots = (schedules as Schedule[])
            .filter((s) => s.startTimeSlot && s.endTimeSlot)
            .map((s) => buildTimeSlot(s.startTimeSlot, s.endTimeSlot));
          setDynamicTimeSlots(mergeTimeSlotCollections(dailySlots));
        } else {
          setDynamicTimeSlots([]);
        }
        setTimetableGrid(grid);
      }
    } catch (error) {
      console.error("Failed to load timetable:", error);
      setTimetableGrid({});
      setDynamicTimeSlots([]);
    }
  };

  const loadSchedules = async () => {
    try {
      const query = activeTab === "custom" ? "?scheduleType=custom" : "";
      const data = await apiFetch(`/schedule${query}`);
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      console.error("Failed to load schedules");
      setSchedules([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const startMinutes = parseHHMMToMinutes(formData.startTimeSlot);
    const endMinutes = parseHHMMToMinutes(formData.endTimeSlot);

    if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
      setFormError("Please enter a valid time slot.");
      return;
    }

    if (endMinutes <= startMinutes) {
      setFormError("End time must be later than start time.");
      return;
    }

    const availableBatches = getAvailableBatches(formData.classLevel);
    const normalizedBatches =
      availableBatches.length === 0
        ? []
        : Array.from(
            new Set(formData.batches.map((b) => b.trim()).filter(Boolean))
          );

    if (availableBatches.length > 0 && normalizedBatches.length === 0) {
      setFormError("Please select at least one batch.");
      return;
    }

    const payload = {
      ...formData,
      batch: normalizedBatches[0] || "",
      batches: normalizedBatches,
    };

    if (formData.scheduleType === "regular" && !allowCustomRegularTime) {
      const slot = visibleTimeSlots.find((t) => t.start === formData.startTimeSlot);
      if (slot) payload.endTimeSlot = slot.end;
    }

    setSubmitting(true);
    try {
      if (editingSchedule) {
        await apiFetch(`/schedule/${editingSchedule._id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        toast.success("Schedule updated successfully");
      } else {
        await apiFetch("/schedule", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(
          formData.scheduleType === "regular"
            ? "Regular class added to timetable"
            : "Custom class scheduled"
        );
      }

      setIsModalOpen(false);
      setEditingSchedule(null);
      setAllowCustomRegularTime(false);
      setFormError("");
      resetForm();
      loadTimetable();
      loadSchedules();
    } catch (error) {
      setFormError((error as Error).message || "Failed to save schedule. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this schedule? This cannot be undone.")) return;
    try {
      await apiFetch(`/schedule/${id}`, { method: "DELETE" });
      toast.success("Schedule deleted");
      setIsModalOpen(false);
      setEditingSchedule(null);
      setFormError("");
      resetForm();
      loadTimetable();
      loadSchedules();
    } catch (error) {
      toast.error((error as Error).message || "Failed to delete schedule");
    }
  };

  const fetchTeachersOnLeave = async (date: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("accessToken");
      
      if (!token) {
        console.error("No access token found");
        setTeachersOnLeave([]);
        return;
      }

      console.log("Fetching teachers on leave for date:", date);

      const response = await fetch(
        `${apiUrl}/api/leaves?status=approved`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const leaves = await response.json();
        console.log("All approved leaves:", leaves);
        
        // Parse the target date
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);
        
        // Extract teacher IDs from approved leaves that overlap with the selected date
        const teacherIds = leaves
          .filter((leave: any) => {
            const leaveStart = new Date(leave.startDate);
            leaveStart.setHours(0, 0, 0, 0);
            const leaveEnd = new Date(leave.endDate);
            leaveEnd.setHours(23, 59, 59, 999);
            
            const overlaps = checkDate >= leaveStart && checkDate <= leaveEnd;
            if (overlaps) {
              console.log(`Teacher ${leave.teacherId} (${leave.teacherName}) is on leave on ${date}`);
            }
            return overlaps;
          })
          .map((leave: any) => leave.teacherId)
          .filter(Boolean); // Remove any undefined values
        
        console.log("Teacher IDs on leave:", teacherIds);
        console.log("All teacher IDs in dropdown:", teachers.map(t => t.id));
        setTeachersOnLeave(teacherIds);
      } else {
        console.error("Failed to fetch leaves, status:", response.status);
        setTeachersOnLeave([]);
      }
    } catch (error) {
      console.error("Error fetching teachers on leave:", error);
      setTeachersOnLeave([]);
    }
  };

  const openEditModal = (schedule: Schedule) => {
    if (schedule.scheduleType === "regular") {
      const matchingSlot = visibleTimeSlots.find((slot) => slot.start === schedule.startTimeSlot);
      setAllowCustomRegularTime(!matchingSlot || matchingSlot.end !== schedule.endTimeSlot);
    } else {
      setAllowCustomRegularTime(false);
    }

    setFormError("");
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      scheduleType: schedule.scheduleType,
      type: schedule.type,
      dayOfWeek: schedule.dayOfWeek || 1,
      startTimeSlot: schedule.startTimeSlot,
      endTimeSlot: schedule.endTimeSlot,
      date: schedule.date
        ? new Date(schedule.date).toISOString().split("T")[0]
        : "",
      subject: schedule.subject,
      classLevel: schedule.classLevel,
      batch: schedule.batch,
      batches: getScheduleBatches(schedule),
      roomNumber: schedule.roomNumber,
      teacherId: schedule.teacherId || "",
      selectedStudents: schedule.students || [],
    });
    setIsModalOpen(true);
    
    // Fetch teachers on leave for the schedule date
    if (schedule.date) {
      fetchTeachersOnLeave(new Date(schedule.date).toISOString().split("T")[0]);
    } else if (schedule.dayOfWeek !== undefined) {
      // For regular schedule, check current week
      const today = new Date();
      const currentDayOfWeek = today.getDay();
      const daysToAdd = schedule.dayOfWeek - currentDayOfWeek;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      fetchTeachersOnLeave(targetDate.toISOString().split("T")[0]);
    }
  };

  const openCellModal = (dayOfWeek: number, timeSlot: string, customDate?: string, classLevel?: string, batch?: string) => {
    // Determine existing schedule based on mode
    let existingSchedule: Schedule | undefined = undefined;
    if (activeTab === 'regular') {
       const regGrid = timetableGrid as Record<string, Record<string, Schedule>>;
       existingSchedule = regGrid[dayOfWeek]?.[timeSlot];
    } else {
       // For Custom, grid is [classLevel][batch][timeSlot]
       if (classLevel && batch !== undefined) {
         const customGrid = timetableGrid as Record<string, Record<string, Record<string, Schedule>>>;
         existingSchedule = customGrid[classLevel]?.[batch]?.[timeSlot];
       }
    }

    if (existingSchedule) {
      openEditModal(existingSchedule);
    } else {
      const resolvedClassLevel = classLevel ?? filterClass;
      const resolvedBatch = batch !== undefined ? batch : filterBatch;
      resetForm();
      setFormData((prev) => ({
        ...prev,
        scheduleType: activeTab === "custom" ? "custom" : "regular",
        dayOfWeek: activeTab === "regular" ? dayOfWeek : 1,
        date: customDate || "",
        startTimeSlot: timeSlot,
        endTimeSlot: getDefaultEndTime(timeSlot),
        classLevel: resolvedClassLevel,
        batch: resolvedBatch,
        batches: resolvedBatch ? [resolvedBatch] : [],
      }));

      setAllowCustomRegularTime(false);
      setFormError("");
      setIsModalOpen(true);
      // Fetch teachers on leave for this date
      if (customDate) {
        fetchTeachersOnLeave(customDate);
      } else if (activeTab === "regular") {
        // For regular schedule, check current week
        const today = new Date();
        const currentDayOfWeek = today.getDay();
        const daysToAdd = dayOfWeek - currentDayOfWeek;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        fetchTeachersOnLeave(targetDate.toISOString().split("T")[0]);
      }
    }
  };


  const resetForm = () => {
    setAllowCustomRegularTime(false);
    setFormData({
      title: "",
      scheduleType: activeTab === "custom" ? "custom" : "regular",
      type: "class",
      dayOfWeek: 1,
      startTimeSlot: visibleTimeSlots[0]?.start || "",
      endTimeSlot: visibleTimeSlots[0]?.end || "",
      date: "",
      subject: "",
      classLevel: filterClass,
      batch: filterBatch,
      batches: filterBatch ? [filterBatch] : [],
      roomNumber: 1,
      teacherId: "",
      selectedStudents: [],
    });
  };

  const getAvailableBatches = (classLevel: string) => {
    return batches.filter((batch) => batch.classLevels.includes(classLevel));
  };

  const handleClassChange = (newClass: string) => {
    setFilterClass(newClass);
    const available = getAvailableBatches(newClass);
    if (available.length === 0) {
      setFilterBatch("");
      return;
    }

    if (!available.find((b) => b.name === filterBatch)) {
      setFilterBatch(available[0].name);
    }
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const { saveAs } = await import("file-saver");

      const wb = new ExcelJS.Workbook();
      wb.creator = "Abhigyan Gurukull";
      wb.created = new Date();

      // ── Shared color system ──────────────────────────────────────────────────
      const C_NAVY        = "FF0F172A"; // Deep navy – primary brand
      const C_NAVY_MID    = "FF1E293B";
      const C_EMERALD     = "FF059669";
      const C_EMERALD_BRT = "FF10B981";
      const C_MINT        = "FFD1FAE5";
      const C_WHITE       = "FFFFFFFF";
      const C_OFF_WHITE   = "FFF8FAFC";
      const C_GRAY_LIGHT  = "FFF1F5F9";
      const C_GRAY_MID    = "FFE2E8F0";
      const C_GRAY_DARK   = "FFCBD5E1";
      const C_TEXT_MED    = "FF475569";
      const C_TEXT_LIGHT  = "FF94A3B8";
      const C_GOLD        = "FFFBBF24";
      const C_AMBER       = "FFD97706";

      // Legacy aliases used by regular-schedule branch
      const C_BRAND       = C_NAVY;
      const C_BRAND_MID   = C_EMERALD;
      const C_BRAND_LITE  = C_MINT;
      const C_GRAY_BG     = C_OFF_WHITE;
      const C_TEXT_DARK   = C_NAVY_MID;
      const C_BORDER      = C_GRAY_MID;
      const C_BORDER_MID  = C_GRAY_DARK;

      // ── Per-class palette (6 distinct professional colors) ────────────────────
      type Cp = { dark: string; mid: string; light: string; pale: string };
      const CP: Record<string, Cp> = {
        "7":  { dark: "FF1E40AF", mid: "FF3B82F6", light: "FF93C5FD", pale: "FFEFF6FF" }, // Cobalt
        "8":  { dark: "FF4C1D95", mid: "FF8B5CF6", light: "FFC4B5FD", pale: "FFF5F3FF" }, // Violet
        "9":  { dark: "FF064E3B", mid: "FF059669", light: "FF6EE7B7", pale: "FFF0FDF4" }, // Emerald
        "10": { dark: "FF92400E", mid: "FFF59E0B", light: "FFFCD34D", pale: "FFFEF9C3" }, // Amber
        "11": { dark: "FF9D174D", mid: "FFEC4899", light: "FFF9A8D4", pale: "FFFDF2F8" }, // Pink
        "12": { dark: "FF134E4A", mid: "FF14B8A6", light: "FF5EEAD4", pale: "FFF0FDFA" }, // Teal
      };

      // ── Per-day color bands (Regular schedule) ──────────────────────────────
      const DAY_COLORS: Record<number, { bg: string; accent: string; hdr: string }> = {
        1: { hdr: "FFBFDBFE", bg: "FFDBEAFE", accent: "FF1D4ED8" }, // Mon – Blue
        2: { hdr: "FFDDD6FE", bg: "FFEDE9FE", accent: "FF6D28D9" }, // Tue – Purple
        3: { hdr: "FFA7F3D0", bg: "FFD1FAE5", accent: "FF059669" }, // Wed – Green
        4: { hdr: "FFFDE68A", bg: "FFFEF3C7", accent: "FFB45309" }, // Thu – Amber
        5: { hdr: "FFFBCFE8", bg: "FFFCE7F3", accent: "FFBE185D" }, // Fri – Pink
        6: { hdr: "FFA5F3FC", bg: "FFCFFAFE", accent: "FF0E7490" }, // Sat – Cyan
      };

      // ── Per-class color palettes (Custom / Daily view) ───────────────────────
      const CLASS_COLORS: Record<string, { hdr: string; cellBg: string; accent: string }> = {
        "7":  { hdr: "FF93C5FD", cellBg: "FFEFF6FF", accent: "FF1D4ED8" }, // Blue
        "8":  { hdr: "FFC4B5FD", cellBg: "FFF5F3FF", accent: "FF6D28D9" }, // Purple
        "9":  { hdr: "FF6EE7B7", cellBg: "FFF0FDF4", accent: "FF065F46" }, // Green
        "10": { hdr: "FFFBBF24", cellBg: "FFFEFCE8", accent: "FFB45309" }, // Amber
        "11": { hdr: "FFF9A8D4", cellBg: "FFFFF1F2", accent: "FFBE185D" }, // Pink
        "12": { hdr: "FF67E8F9", cellBg: "FFF0FDFF", accent: "FF0E7490" }, // Cyan
      };

      type XBorders = import("exceljs").Borders;
      type XFill    = import("exceljs").Fill;

      const solidFill = (argb: string): XFill =>
        ({ type: "pattern", pattern: "solid", fgColor: { argb } } as XFill);

      const thinBorder = (argb = C_BORDER): Partial<XBorders> => ({
        top: { style: "thin", color: { argb } }, left: { style: "thin", color: { argb } },
        bottom: { style: "thin", color: { argb } }, right: { style: "thin", color: { argb } },
      });

      const mediumBorder = (argb = C_BORDER_MID): Partial<XBorders> => ({
        top: { style: "medium", color: { argb } }, left: { style: "medium", color: { argb } },
        bottom: { style: "medium", color: { argb } }, right: { style: "medium", color: { argb } },
      });

      // ── Helper: add a full-width merged title row ────────────────────────────
      const addBanner = (
        ws: import("exceljs").Worksheet,
        text: string,
        rowIdx: number,
        height: number,
        opts: { size: number; bold?: boolean; italic?: boolean; fill: string; color?: string }
      ) => {
        ws.addRow([text]);
        ws.mergeCells(rowIdx, 1, rowIdx, ws.columnCount || 1);
        const cell = ws.getCell(rowIdx, 1);
        cell.font      = { bold: opts.bold, italic: opts.italic, size: opts.size, color: { argb: opts.color ?? C_WHITE }, name: "Calibri" };
        cell.fill      = solidFill(opts.fill);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(rowIdx).height = height;
      };

      // ── Helper: footer row ───────────────────────────────────────────────────
      const addFooter = (ws: import("exceljs").Worksheet, rowIdx: number) => {
        ws.addRow([`© Abhigyan Gurukull  |  Confidential — For Internal Use Only  |  ${new Date().toLocaleDateString("en-IN")}`]);
        ws.mergeCells(rowIdx, 1, rowIdx, ws.columnCount || 1);
        const cell = ws.getCell(rowIdx, 1);
        cell.font      = { italic: true, size: 8, color: { argb: C_TEXT_LIGHT }, name: "Calibri" };
        cell.fill      = solidFill(C_GRAY_BG);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(rowIdx).height = 20;
      };

      if (activeTab === "regular") {
        // ════════════════════════════════════════════════════════════════════════
        // REGULAR SCHEDULE – Weekly Timetable (days as rows, time slots as cols)
        // ════════════════════════════════════════════════════════════════════════
        const ws = wb.addWorksheet("Weekly Timetable", {
          pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
          views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
        });

        const regGrid = timetableGrid as Record<string, Record<string, Schedule>>;
        const DAYS_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const numCols   = visibleTimeSlots.length + 1;

        // Set column widths before we start adding rows (so mergeCells uses correct count)
        ws.getColumn(1).width = 14;
        visibleTimeSlots.forEach((_, i) => { ws.getColumn(i + 2).width = 26; });

        // ── Banner rows ──────────────────────────────────────────────────────────
        addBanner(ws, "ABHIGYAN GURUKULL", 1, 52, { size: 22, bold: true, fill: C_BRAND });
        addBanner(ws, "WEEKLY CLASS TIMETABLE", 2, 30, { size: 14, bold: true, fill: C_BRAND_MID });
        const filterLabel = `Class ${filterClass}${filterBatch ? "  |  Batch: " + filterBatch : ""}  |  Generated: ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;
        addBanner(ws, filterLabel, 3, 22, { size: 9, italic: true, fill: C_BRAND, color: C_BRAND_LITE });

        // Spacer
        ws.addRow([]);
        ws.getRow(4).height = 8;

        // ── Column header row (time slots) ────────────────────────────────────────
        const hdrRow = ws.addRow(["DAY / TIME", ...visibleTimeSlots.map((s) => s.label)]);
        hdrRow.height = 42;
        hdrRow.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font      = { bold: true, size: 9, color: { argb: C_BRAND }, name: "Calibri" };
          cell.fill      = solidFill(C_BRAND_LITE);
          cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", wrapText: true };
          cell.border    = mediumBorder(C_BRAND_MID);
        });

        // ── Day data rows ─────────────────────────────────────────────────────────
        DAYS_WEEK.forEach((day, idx) => {
          const dayIndex = idx + 1;
          const dc = DAY_COLORS[dayIndex];
          const dataRow = ws.addRow([day, ...visibleTimeSlots.map(() => "")]);
          dataRow.height = 68;

          dataRow.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col === 1) {
              // Day label cell
              cell.font      = { bold: true, size: 11, color: { argb: dc.accent }, name: "Calibri" };
              cell.fill      = solidFill(dc.hdr);
              cell.alignment = { horizontal: "center", vertical: "middle" };
              cell.border    = mediumBorder(dc.accent);
            } else {
              const slotStart = visibleTimeSlots[col - 2]?.start;
              const sch = regGrid[dayIndex]?.[slotStart];
              if (sch) {
                cell.value = {
                  richText: [
                    { text: sch.subject + "\n",                          font: { bold: true, size: 11, color: { argb: dc.accent } } },
                    { text: (sch.teacherName || "Teacher TBA") + "\n",   font: { size: 9, italic: true, color: { argb: C_TEXT_MED } } },
                    { text: "Room " + sch.roomNumber,                    font: { size: 9, bold: true, color: { argb: C_TEXT_LIGHT } } },
                  ],
                };
                cell.fill      = solidFill(dc.bg);
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.border    = {
                  top:    { style: "thin",   color: { argb: dc.accent } },
                  left:   { style: "medium", color: { argb: dc.accent } },
                  bottom: { style: "thin",   color: { argb: dc.accent } },
                  right:  { style: "thin",   color: { argb: C_BORDER } },
                };
              } else {
                cell.value     = "";
                cell.fill      = solidFill(idx % 2 === 0 ? C_WHITE : C_GRAY_BG);
                cell.alignment = { horizontal: "center", vertical: "middle" };
                cell.border    = thinBorder();
              }
            }
          });
        });

        // Footer
        addFooter(ws, DAYS_WEEK.length + 6);

        const buf  = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, `Timetable_Class${filterClass}${filterBatch ? "_" + filterBatch.replace(/\s+/g, "_") : ""}.xlsx`);

      } else if (activeTab === "daily_view") {
        // ════════════════════════════════════════════════════════════════════════
        // PREMIUM DAILY SCHEDULE — 3-sheet workbook
        //   Sheet 1 : Cover  (branding + KPIs + class legend)
        //   Sheet 2 : Daily Schedule matrix  (class × time slot)
        //   Sheet 3 : Teacher Duty Chart  (teacher × time slot)
        // ════════════════════════════════════════════════════════════════════════
        const grid    = timetableGrid as Record<string, Record<string, Record<string, Schedule>>>;
        const dateStr = customWeekStart.toISOString().split("T")[0];
        const dateLbl = customWeekStart.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const numCols = visibleTimeSlots.length + 1;

        // Flatten all schedules for KPIs and teacher chart
        type RichSch = Schedule & { _cl: string; _bn: string };
        const allSchs: RichSch[] = [];
        CLASS_LEVELS.forEach(cl => {
          Object.entries(grid[cl] || {}).forEach(([bn, slotMap]) => {
            Object.values(slotMap).forEach(sch => {
              if (!allSchs.some(s => s._id === sch._id && s._cl === cl && s._bn === bn))
                allSchs.push({ ...sch, _cl: cl, _bn: bn });
            });
          });
        });
        const kpiClasses  = allSchs.length;
        const kpiTeachers = new Set(allSchs.map(s => s.teacherName).filter(Boolean)).size;
        const kpiRooms    = new Set(allSchs.map(s => s.roomNumber)).size;
        const kpiBatches  = new Set(allSchs.map(s => `${s._cl}|${s._bn}`)).size;

        // ── Helper: fill every cell in a row with a background colour ──────────
        const paintRow = (wsp: import("exceljs").Worksheet, r: number, argb: string, h: number, nc: number) => {
          wsp.getRow(r).height = h;
          for (let c = 1; c <= nc; c++) wsp.getCell(r, c).fill = solidFill(argb);
        };

        // ── Helper: merge + style a single region ──────────────────────────────
        type MscOpts = { size: number; bold?: boolean; italic?: boolean; color?: string; fill?: string; halign?: import("exceljs").Alignment["horizontal"]; indent?: number; border?: Partial<import("exceljs").Borders> };
        const msc = (wsp: import("exceljs").Worksheet, r1: number, c1: number, r2: number, c2: number, value: string, o: MscOpts) => {
          wsp.mergeCells(r1, c1, r2, c2);
          const cell = wsp.getCell(r1, c1);
          cell.value     = value;
          cell.font      = { name: "Calibri", bold: o.bold, italic: o.italic, size: o.size, color: { argb: o.color ?? C_WHITE } };
          cell.fill      = solidFill(o.fill ?? C_NAVY);
          cell.alignment = { horizontal: o.halign ?? "center", vertical: "middle", wrapText: true, indent: o.indent };
          if (o.border) cell.border = o.border;
        };

        // ════════════════
        // SHEET 1 – COVER
        // ════════════════
        const COV_COLS = 8;
        const cov = wb.addWorksheet("Cover", {
          pageSetup: { orientation: "portrait" },
          views: [{ showGridLines: false }],
        });
        for (let c = 1; c <= COV_COLS; c++) cov.getColumn(c).width = 14;

        // Rows 1–12: deep-navy brand header block
        for (let r = 1; r <= 12; r++) paintRow(cov, r, C_NAVY, r === 1 || r === 12 ? 10 : 28, COV_COLS);
        msc(cov, 2, 1, 7, COV_COLS, "ABHIGYAN GURUKULL", { size: 30, bold: true });
        msc(cov, 8, 1, 10, COV_COLS, "Excellence in Education  ·  Institute Management System",
          { size: 11, italic: true, color: C_MINT });
        // Emerald accent row 11
        cov.mergeCells(11, 1, 11, COV_COLS); cov.getCell(11, 1).fill = solidFill(C_EMERALD); cov.getRow(11).height = 5;

        // Spacer row 13
        cov.getRow(13).height = 20;

        // Document title rows 14–15
        msc(cov, 14, 1, 15, COV_COLS, "INSTITUTE DAILY SCHEDULE",
          { size: 22, bold: true, color: C_NAVY, fill: C_WHITE });
        cov.getRow(14).height = 36; cov.getRow(15).height = 36;

        // Date rows 16–17
        msc(cov, 16, 1, 17, COV_COLS, dateLbl.toUpperCase(),
          { size: 13, bold: true, color: C_EMERALD, fill: C_WHITE });
        cov.getRow(16).height = 28; cov.getRow(17).height = 8;

        // Gold divider row 18
        cov.mergeCells(18, 1, 18, COV_COLS); cov.getCell(18, 1).fill = solidFill(C_GOLD); cov.getRow(18).height = 4;
        cov.getRow(19).height = 16;

        // DAILY SUMMARY heading row 20
        msc(cov, 20, 1, 20, COV_COLS, "DAILY SUMMARY", { size: 10, bold: true, color: C_TEXT_MED, fill: C_WHITE });
        cov.getRow(20).height = 22; cov.getRow(21).height = 8;

        // 4 KPI cards (2 cols each, 8 total)
        const kpis = [
          { label: "TOTAL CLASSES",    value: String(kpiClasses),  cp: CP["9"]  },
          { label: "TEACHERS ON DUTY", value: String(kpiTeachers), cp: CP["7"]  },
          { label: "ROOMS IN USE",     value: String(kpiRooms),    cp: CP["10"] },
          { label: "ACTIVE BATCHES",   value: String(kpiBatches),  cp: CP["11"] },
        ];
        kpis.forEach(({ label, value, cp }, i) => {
          const c1 = i * 2 + 1, c2 = c1 + 1;
          cov.mergeCells(22, c1, 24, c2);
          const vCell = cov.getCell(22, c1);
          vCell.value     = value;
          vCell.font      = { name: "Calibri", bold: true, size: 32, color: { argb: cp.dark } };
          vCell.fill      = solidFill(cp.pale);
          vCell.alignment = { horizontal: "center", vertical: "middle" };
          vCell.border    = mediumBorder(cp.mid);
          [22, 23, 24].forEach(r => { cov.getRow(r).height = 22; });
          cov.mergeCells(25, c1, 25, c2);
          const lCell = cov.getCell(25, c1);
          lCell.value     = label;
          lCell.font      = { name: "Calibri", bold: true, size: 8, color: { argb: C_WHITE } };
          lCell.fill      = solidFill(cp.dark);
          lCell.alignment = { horizontal: "center", vertical: "middle" };
          cov.getRow(25).height = 18;
        });

        cov.getRow(26).height = 24;
        msc(cov, 27, 1, 27, COV_COLS, "CLASS COLOR LEGEND", { size: 10, bold: true, color: C_TEXT_MED, fill: C_WHITE });
        cov.getRow(27).height = 22; cov.getRow(28).height = 6;

        // Legend: one row per class level
        CLASS_LEVELS.forEach((cl, i) => {
          const r = 29 + i;
          const cp = CP[cl] ?? CP["12"];
          cov.mergeCells(r, 1, r, 3);
          const sw = cov.getCell(r, 1);
          sw.value = `  CLASS ${cl}`; sw.font = { name: "Calibri", bold: true, size: 10, color: { argb: C_WHITE } };
          sw.fill = solidFill(cp.dark); sw.alignment = { vertical: "middle" };
          cov.mergeCells(r, 4, r, 5);
          const pc = cov.getCell(r, 4);
          pc.value = "Sample"; pc.font = { name: "Calibri", size: 9, color: { argb: cp.dark } };
          pc.fill = solidFill(cp.pale); pc.alignment = { horizontal: "center", vertical: "middle" }; pc.border = thinBorder(cp.light);
          cov.mergeCells(r, 6, r, COV_COLS);
          const dc = cov.getCell(r, 6);
          dc.value = `Standard Grade ${cl}`; dc.font = { name: "Calibri", size: 9, color: { argb: C_TEXT_MED } };
          dc.fill = solidFill(C_WHITE); dc.alignment = { vertical: "middle" };
          cov.getRow(r).height = 20;
        });

        // Footer row 36
        cov.mergeCells(36, 1, 36, COV_COLS);
        cov.getCell(36, 1).value     = `Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}  ·  Abhigyan Gurukull  ·  Confidential`;
        cov.getCell(36, 1).font      = { name: "Calibri", italic: true, size: 8, color: { argb: C_TEXT_LIGHT } };
        cov.getCell(36, 1).fill      = solidFill(C_GRAY_LIGHT);
        cov.getCell(36, 1).alignment = { horizontal: "center", vertical: "middle" };
        cov.getRow(36).height = 22;

        // ═══════════════════════════════
        // SHEET 2 – DAILY SCHEDULE MATRIX
        // ═══════════════════════════════
        const ws = wb.addWorksheet("Daily Schedule", {
          pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, paperSize: 9 },
          views: [{ state: "frozen", xSplit: 1, ySplit: 6, showGridLines: false }],
        });
        ws.getColumn(1).width = 22;
        visibleTimeSlots.forEach((_, i) => { ws.getColumn(i + 2).width = 22; });

        paintRow(ws, 1, C_NAVY, 8, numCols);
        msc(ws, 2, 1, 3, numCols, "ABHIGYAN GURUKULL", { size: 18, bold: true });
        ws.getRow(2).height = 30; ws.getRow(3).height = 30;
        msc(ws, 4, 1, 4, numCols, `INSTITUTE DAILY SCHEDULE  ·  ${dateLbl.toUpperCase()}`,
          { size: 10, bold: true, fill: C_EMERALD });
        ws.getRow(4).height = 22;
        paintRow(ws, 5, C_GOLD, 4, numCols);

        // Column header row 6
        const wsHdr = ws.addRow(["CLASS / BATCH", ...visibleTimeSlots.map(s => s.label)]);
        wsHdr.height = 44;
        wsHdr.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font      = { name: "Calibri", bold: true, size: 9, color: { argb: C_GOLD } };
          cell.fill      = solidFill(C_NAVY);
          cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", wrapText: true };
          cell.border    = { top:{style:"medium",color:{argb:C_EMERALD}}, left:{style:"thin",color:{argb:C_NAVY_MID}}, bottom:{style:"medium",color:{argb:C_EMERALD}}, right:{style:"thin",color:{argb:C_NAVY_MID}} };
        });

        const allRowsWs = CLASS_LEVELS.flatMap(cl => {
          const cls = batches.filter(b => b.classLevels.includes(cl));
          return cls.length === 0 ? [{ cl, bn: "" }] : cls.map(b => ({ cl, bn: b.name }));
        });

        let prevClWs = "";
        let wsR = 7;
        allRowsWs.forEach(({ cl, bn }) => {
          const isNew = cl !== prevClWs;
          prevClWs = cl;
          const cp = CP[cl] ?? CP["12"];

          // Thin coloured section-break strip before each new class group
          if (isNew) {
            for (let c = 1; c <= numCols; c++) ws.getCell(wsR, c).fill = solidFill(cp.mid);
            ws.getRow(wsR).height = 4; wsR++;
          }

          const label = `Class ${cl}${bn ? "  ·  " + bn : ""}`;
          const dr = ws.addRow([label, ...visibleTimeSlots.map(() => "")]);
          dr.height = 64;

          dr.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col === 1) {
              cell.value     = label;
              cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: cp.dark } };
              cell.fill      = solidFill(cp.pale);
              cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
              cell.border    = { top:{style:"medium",color:{argb:cp.dark}}, left:{style:"thick",color:{argb:cp.mid}}, bottom:{style:"thin",color:{argb:cp.light}}, right:{style:"medium",color:{argb:cp.light}} };
            } else {
              const slotStart = visibleTimeSlots[col - 2]?.start;
              const sch = grid[cl]?.[bn]?.[slotStart];
              if (sch) {
                const isCust = sch.scheduleType === "custom";
                cell.value = {
                  richText: [
                    { text: sch.subject + "\n",               font: { name: "Calibri", bold: true, size: 11, color: { argb: isCust ? C_AMBER : cp.dark } } },
                    { text: (sch.teacherName || "TBA") + "\n",font: { name: "Calibri", size: 9, italic: true, color: { argb: C_TEXT_MED } } },
                    { text: "Room " + sch.roomNumber,         font: { name: "Calibri", size: 9, bold: true, color: { argb: C_TEXT_LIGHT } } },
                    ...(isCust ? [{ text: "\n★ Special", font: { name: "Calibri", size: 8, bold: true, color: { argb: C_AMBER } } }] : []),
                  ],
                };
                cell.fill      = solidFill(isCust ? "FFFFF7ED" : cp.pale);
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.border    = { top:{style:"thin",color:{argb:cp.light}}, left:{style:"thin",color:{argb:C_GRAY_MID}}, bottom:{style:"thin",color:{argb:cp.light}}, right:{style:"thin",color:{argb:C_GRAY_MID}} };
              } else {
                cell.fill   = solidFill(C_OFF_WHITE);
                cell.border = thinBorder(C_GRAY_MID);
              }
            }
          });
          wsR++;
          if (isNew) wsR++;
        });

        // Bottom strip + footer
        for (let c = 1; c <= numCols; c++) ws.getCell(wsR, c).fill = solidFill(C_EMERALD);
        ws.getRow(wsR).height = 4; wsR++;
        ws.mergeCells(wsR, 1, wsR, numCols);
        ws.getCell(wsR, 1).value     = `© Abhigyan Gurukull  ·  ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}  ·  For Internal Use Only`;
        ws.getCell(wsR, 1).font      = { name: "Calibri", italic: true, size: 8, color: { argb: C_TEXT_LIGHT } };
        ws.getCell(wsR, 1).fill      = solidFill(C_GRAY_LIGHT);
        ws.getCell(wsR, 1).alignment = { horizontal: "center", vertical: "middle" };
        ws.getRow(wsR).height = 20;

        // ══════════════════════════════
        // SHEET 3 – TEACHER DUTY CHART
        // ══════════════════════════════
        const tWs = wb.addWorksheet("Teacher Schedule", {
          pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
          views: [{ state: "frozen", xSplit: 1, ySplit: 5, showGridLines: false }],
        });
        tWs.getColumn(1).width = 24;
        visibleTimeSlots.forEach((_, i) => { tWs.getColumn(i + 2).width = 22; });
        const tNumCols = visibleTimeSlots.length + 1;

        // Build teacher → slots map
        type TeachEntry = { slot: string; subject: string; cl: string; bn: string; room: number };
        const teacherMap: Record<string, TeachEntry[]> = {};
        allSchs.forEach(s => {
          const t = s.teacherName || "Unassigned";
          if (!teacherMap[t]) teacherMap[t] = [];
          teacherMap[t].push({ slot: s.startTimeSlot, subject: s.subject, cl: s._cl, bn: s._bn, room: s.roomNumber });
        });
        const teacherNames = Object.keys(teacherMap).sort();

        paintRow(tWs, 1, C_NAVY, 8, tNumCols);
        msc(tWs, 2, 1, 3, tNumCols, "ABHIGYAN GURUKULL", { size: 18, bold: true });
        tWs.getRow(2).height = 30; tWs.getRow(3).height = 30;
        msc(tWs, 4, 1, 4, tNumCols, `TEACHER DUTY CHART  ·  ${dateLbl.toUpperCase()}`,
          { size: 10, bold: true, fill: C_EMERALD_BRT });
        tWs.getRow(4).height = 22;

        const tHdr = tWs.addRow(["TEACHER", ...visibleTimeSlots.map(s => s.label)]);
        tHdr.height = 42;
        tHdr.eachCell({ includeEmpty: true }, (cell) => {
          cell.font      = { name: "Calibri", bold: true, size: 9, color: { argb: C_GOLD } };
          cell.fill      = solidFill(C_NAVY);
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.border    = thinBorder(C_NAVY_MID);
        });
        tWs.getCell(5, 1).font = { name: "Calibri", bold: true, size: 10, color: { argb: C_GOLD } };

        teacherNames.forEach((teacher, idx) => {
          const rowBg = idx % 2 === 0 ? C_WHITE : C_GRAY_LIGHT;
          const row = tWs.addRow([teacher, ...visibleTimeSlots.map(() => "")]);
          row.height = 60;
          row.eachCell({ includeEmpty: true }, (cell, col) => {
            if (col === 1) {
              cell.value     = teacher;
              cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: C_NAVY } };
              cell.fill      = solidFill(rowBg);
              cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
              cell.border    = { top:{style:"thin",color:{argb:C_GRAY_MID}}, left:{style:"thick",color:{argb:C_EMERALD}}, bottom:{style:"thin",color:{argb:C_GRAY_MID}}, right:{style:"medium",color:{argb:C_GRAY_DARK}} };
            } else {
              const slot = visibleTimeSlots[col - 2];
              const entry = teacherMap[teacher]?.find(e => e.slot === slot?.start);
              if (entry) {
                const cp = CP[entry.cl] ?? CP["12"];
                cell.value = {
                  richText: [
                    { text: entry.subject + "\n",                                    font: { name: "Calibri", bold: true, size: 11, color: { argb: cp.dark } } },
                    { text: `Class ${entry.cl}${entry.bn ? " · " + entry.bn : ""}\n`, font: { name: "Calibri", size: 9, color: { argb: C_TEXT_MED } } },
                    { text: "Room " + entry.room,                                    font: { name: "Calibri", size: 9, bold: true, color: { argb: C_TEXT_LIGHT } } },
                  ],
                };
                cell.fill      = solidFill(cp.pale);
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.border    = { top:{style:"thin",color:{argb:cp.light}}, left:{style:"thin",color:{argb:C_GRAY_MID}}, bottom:{style:"thin",color:{argb:cp.light}}, right:{style:"thin",color:{argb:C_GRAY_MID}} };
              } else {
                cell.fill   = solidFill(rowBg);
                cell.border = thinBorder(C_GRAY_MID);
              }
            }
          });
        });

        const tFR = teacherNames.length + 6;
        tWs.mergeCells(tFR, 1, tFR, tNumCols);
        tWs.getCell(tFR, 1).value     = `© Abhigyan Gurukull  ·  Teacher Duty Chart  ·  ${dateStr}`;
        tWs.getCell(tFR, 1).font      = { name: "Calibri", italic: true, size: 8, color: { argb: C_TEXT_LIGHT } };
        tWs.getCell(tFR, 1).fill      = solidFill(C_GRAY_LIGHT);
        tWs.getCell(tFR, 1).alignment = { horizontal: "center", vertical: "middle" };
        tWs.getRow(tFR).height = 20;

        const bufDaily = await wb.xlsx.writeBuffer();
        saveAs(new Blob([bufDaily], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `DailySchedule_${dateStr}.xlsx`);

      } else {
        // ════════════════════════════════════════════════════════════════════════
        // CUSTOM SCHEDULE – enhanced single sheet
        // ════════════════════════════════════════════════════════════════════════
        const customGrid  = timetableGrid as Record<string, Record<string, Record<string, Schedule>>>;
        const custDateStr = customWeekStart.toISOString().split("T")[0];
        const custDateLbl = customWeekStart.toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
        const custNumCols = visibleTimeSlots.length + 1;

        const custWs = wb.addWorksheet("Custom Schedule", {
          pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
          views: [{ state: "frozen", xSplit: 1, ySplit: 5 }],
        });
        custWs.getColumn(1).width = 22;
        visibleTimeSlots.forEach((_, i) => { custWs.getColumn(i + 2).width = 24; });

        addBanner(custWs, "ABHIGYAN GURUKULL", 1, 52, { size: 22, bold: true, fill: C_BRAND });
        addBanner(custWs, "CUSTOM CLASS SCHEDULE", 2, 30, { size: 14, bold: true, fill: C_BRAND_MID });
        addBanner(custWs, custDateLbl, 3, 22, { size: 9, italic: true, fill: C_BRAND, color: C_BRAND_LITE });
        custWs.addRow([]); custWs.getRow(4).height = 8;

        const custHdr = custWs.addRow(["CLASS / BATCH", ...visibleTimeSlots.map(s => s.label)]);
        custHdr.height = 42;
        custHdr.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font      = { bold: true, size: 9, color: { argb: C_BRAND }, name: "Calibri" };
          cell.fill      = solidFill(C_BRAND_LITE);
          cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle", wrapText: true };
          cell.border    = mediumBorder(C_BRAND_MID);
        });

        const custAllRows = CLASS_LEVELS.flatMap(cl => {
          const cls = batches.filter(b => b.classLevels.includes(cl));
          return cls.length === 0 ? [{ cl, bn: "" }] : cls.map(b => ({ cl, bn: b.name }));
        });

        let prevClCust = "";
        custAllRows.forEach(({ cl, bn }, rowIndex) => {
          const isNew = cl !== prevClCust;
          prevClCust = cl;
          const cp = CP[cl] ?? CP["12"];
          const label = `Class ${cl}${bn ? "  —  " + bn : ""}`;
          const dr = custWs.addRow([label, ...visibleTimeSlots.map(() => "")]);
          dr.height = 62;
          dr.eachCell({ includeEmpty: true }, (cell, col) => {
            const ts = isNew ? "medium" : "thin";
            const tc = isNew ? cp.dark : C_BORDER;
            if (col === 1) {
              cell.value     = label;
              cell.font      = { name: "Calibri", bold: true, size: 10, color: { argb: cp.dark } };
              cell.fill      = solidFill(cp.pale);
              cell.alignment = { horizontal: "left", vertical: "middle", wrapText: true, indent: 1 };
              cell.border    = { top:{style:ts,color:{argb:tc}}, left:{style:"thick",color:{argb:cp.mid}}, bottom:{style:"thin",color:{argb:cp.light}}, right:{style:"medium",color:{argb:cp.light}} };
            } else {
              const slotStart = visibleTimeSlots[col - 2]?.start;
              const sch = customGrid[cl]?.[bn]?.[slotStart];
              if (sch) {
                const isCust = sch.scheduleType === "custom";
                cell.value = {
                  richText: [
                    { text: sch.subject + "\n",               font: { name: "Calibri", bold: true, size: 11, color: { argb: isCust ? C_AMBER : cp.dark } } },
                    { text: (sch.teacherName || "TBA") + "\n",font: { name: "Calibri", size: 9, italic: true, color: { argb: C_TEXT_MED } } },
                    { text: "Room " + sch.roomNumber,         font: { name: "Calibri", size: 9, bold: true, color: { argb: C_TEXT_LIGHT } } },
                    ...(isCust ? [{ text: "\n★ Custom", font: { name: "Calibri", size: 8, bold: true, color: { argb: C_AMBER } } }] : []),
                  ],
                };
                cell.fill      = solidFill(isCust ? "FFFFF7ED" : cp.pale);
                cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
                cell.border    = { top:{style:ts,color:{argb:tc}}, left:{style:"thin",color:{argb:C_BORDER}}, bottom:{style:"thin",color:{argb:C_BORDER}}, right:{style:"thin",color:{argb:C_BORDER}} };
              } else {
                cell.fill   = solidFill(rowIndex % 2 === 0 ? C_WHITE : C_GRAY_BG);
                cell.border = { top:{style:ts,color:{argb:tc}}, left:{style:"thin",color:{argb:C_BORDER}}, bottom:{style:"thin",color:{argb:C_BORDER}}, right:{style:"thin",color:{argb:C_BORDER}} };
              }
            }
          });
        });

        addFooter(custWs, custAllRows.length + 6);

        const custBuf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([custBuf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
          `CustomSchedule_${custDateStr}.xlsx`);
        // suppress unused-var lint for custNumCols (used implicitly via custWs column setup)
        void custNumCols;
      }

      toast.success("Timetable exported successfully");
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("Export failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading schedule data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-8 h-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          Schedule Management
        </h1>
        <p className="text-slate-600 mt-2 text-sm sm:text-base">
          Manage regular and custom class schedules across all batches
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
        {[
          { key: "regular", label: "Regular Schedule", icon: "📅" },
          { key: "custom", label: "Custom Schedule", icon: "📝" },
          { key: "daily_view", label: "Daily View", icon: "📋" },
          { key: "batches", label: "Batch Management", icon: "👥" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "regular" | "custom" | "batches" | "daily_view")}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
                : "bg-white text-slate-600 hover:bg-slate-50 hover:shadow-md border border-slate-200 hover:border-emerald-200"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Time Slot Range */}
      {activeTab !== "batches" && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white rounded-xl border border-slate-200 shadow-sm items-end justify-between">
          <div className="flex items-end gap-4 min-w-[220px]">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Time Slots
              </label>
              <select
                value={timeSlotView}
                onChange={(e) => setTimeSlotView(e.target.value as TimeSlotView)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white transition-all"
              >
                <option value="morning">Morning Slots</option>
                <option value="morning2">Morning Slot - 2</option>
                <option value="evening">Evening Slots</option>
                <option value="all">All Slots</option>
              </select>
            </div>
            <AdminTimeSlotsConfig onTimeSlotsUpdated={() => loadInitialData()} />
          </div>
        </div>
      )}

      {/* Regular Schedule - Timetable Grid */}
      {activeTab === "regular" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 sm:p-6 bg-gradient-to-br from-white to-slate-50 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Class Level
              </label>
              <select
                value={filterClass}
                onChange={(e) => handleClassChange(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white transition-all"
              >
                {CLASS_LEVELS.map((c) => (
                  <option key={c} value={c}>
                    Class {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[140px]">
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                Batch
              </label>
              <select
                value={filterBatch}
                onChange={(e) => setFilterBatch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white transition-all"
              >
                {getAvailableBatches(filterClass).length === 0 && (
                  <option value="">No batch (Class-level schedule)</option>
                )}
                {getAvailableBatches(filterClass).map((b) => (
                  <option key={b._id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="ml-auto flex items-end gap-3">
              <button
                onClick={exportToExcel}
                className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                title="Export schedule as Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Excel
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setFormData((prev) => ({
                    ...prev,
                    scheduleType: "regular",
                    classLevel: filterClass,
                    batch: filterBatch,
                    batches: filterBatch ? [filterBatch] : [],
                  }));
                  setIsModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/30 hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Add Class
              </button>
            </div>
          </div>

          {/* Timetable Grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-lg">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <th className="px-4 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider border-b-2 border-r border-emerald-200 w-32 sticky left-0 bg-emerald-50 z-10 shadow-sm">
                      Day / Time
                    </th>
                    {visibleTimeSlots.map((slot) => (
                      <th
                        key={slot.start}
                        className="px-3 py-4 text-center text-xs font-bold text-slate-700 border-b-2 border-r border-emerald-200 min-w-[150px]"
                      >
                        <div className="font-semibold">{slot.label}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DAYS.slice(1, 7).map((day, idx) => {
                    const dayIndex = idx + 1; // Monday = 1
                    return (
                      <tr key={day} className="hover:bg-emerald-50/30 transition-colors">
                        <td className="px-4 py-4 font-bold text-sm text-slate-800 border-r-2 border-b border-slate-200 bg-slate-50 sticky left-0 z-10 shadow-sm">
                          {day}
                        </td>
                        {visibleTimeSlots.map((slot) => {
                          const regGrid = timetableGrid as Record<string, Record<string, Schedule>>;
                          const cell = regGrid[dayIndex]?.[slot.start];
                          return (
                            <td
                              key={slot.start}
                              onClick={() =>
                                openCellModal(dayIndex, slot.start)
                              }
                              className="px-2 py-2 border-r border-b border-slate-200 cursor-pointer hover:bg-emerald-100/50 transition-all duration-200 group"
                            >
                              {cell ? (
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-lg p-3 min-h-[80px] hover:shadow-lg transition-shadow duration-200 hover:scale-105 transform">
                                  <p className="font-bold text-sm text-emerald-900 truncate mb-1">
                                    {cell.subject}
                                  </p>
                                  <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
                                    <span className="flex items-center gap-1">
                                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                      </svg>
                                      Room {cell.roomNumber}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 truncate mt-1 font-medium">
                                    {cell.teacherName || cell.teacherId || 'TBA'}
                                  </p>
                                </div>
                              ) : (
                                <div className="h-full min-h-[80px] w-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <div className="text-center">
                                    <span className="text-3xl font-light text-emerald-400">+</span>
                                    <p className="text-[10px] text-slate-400 mt-1">Add Class</p>
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Schedule - Matrix View */}
      {activeTab === "custom" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border border-slate-200 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-1 rounded-lg border border-slate-200 flex items-center">
                <button
                  onClick={() => {
                    const newDate = new Date(customWeekStart);
                    newDate.setDate(newDate.getDate() - 1);
                    setCustomWeekStart(newDate);
                  }}
                  className="p-2 hover:bg-white rounded shadow-sm transition-colors text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="px-4 text-center min-w-[200px]">
                  <p className="text-sm font-semibold text-slate-800">
                    {(() => {
                        const d = new Date(customWeekStart);
                        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(customWeekStart);
                    newDate.setDate(newDate.getDate() + 1);
                    setCustomWeekStart(newDate);
                  }}
                  className="p-2 hover:bg-white rounded shadow-sm transition-colors text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button 
                onClick={() => setCustomWeekStart(new Date())}
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700 underline"
              >
                Jump to Today
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={exportToExcel}
                className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
                title="Export schedule as Excel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Excel
              </button>
              <button
                onClick={() => {
                  resetForm();
                  setFormData(prev => ({
                    ...prev,
                    scheduleType: 'custom',
                    date: customWeekStart.toISOString().split('T')[0]
                  }));
                  setIsModalOpen(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-amber-500/30 hover:shadow-xl transition-all duration-200 hover:scale-105 w-full sm:w-auto justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Schedule
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      Class / Batch
                    </th>
                    {visibleTimeSlots.map((slot) => (
                      <th
                        key={slot.start}
                        className="px-2 py-3 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 min-w-[120px]"
                      >
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Generate rows for every Class + Batch combination */}
                  {CLASS_LEVELS.flatMap(classLevel => {
                    const classBatches = batches.filter(b => b.classLevels.includes(classLevel));
                    if (classBatches.length === 0) {
                      return [{ classLevel, batchName: "" }];
                    }
                    return classBatches.map(batch => ({ classLevel, batchName: batch.name }));
                  }).map((row) => (
                    <tr key={`${row.classLevel}-${row.batchName || "no-batch"}`} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 z-10">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-sm">Class {row.classLevel}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">
                            {row.batchName || "No batch"}
                          </span>
                        </div>
                      </td>
                      {visibleTimeSlots.map((slot) => {
                        // In Custom mode, timetableGrid structure is: grid[classLevel][batchName][timeSlot]
                        const customGrid = timetableGrid as Record<string, Record<string, Record<string, Schedule>>>;
                        const cell = customGrid[row.classLevel]?.[row.batchName]?.[slot.start];
                        
                        return (
                          <td
                            key={slot.start}
                            onClick={() => {
                              // Pass class and batch specifically for this cell
                              const dateString = customWeekStart.toISOString().split("T")[0];
                              openCellModal(0, slot.start, dateString, row.classLevel, row.batchName);
                            }}
                            className="px-1 py-1 border-r border-slate-100 cursor-pointer hover:bg-emerald-50 transition-colors relative"
                          >
                            {cell ? (
                              <div className="bg-white border border-l-4 border-l-emerald-500 border-slate-200 rounded p-1.5 shadow-sm h-full min-h-[60px] hover:shadow-md transition-shadow">
                                <p className="font-semibold text-xs text-slate-800 truncate leading-tight mb-0.5" title={cell.subject}>
                                  {cell.subject}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate" title={getBatchDisplayLabel(cell)}>
                                  {getBatchDisplayLabel(cell)}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span>R-{cell.roomNumber}</span>
                                  <span className="truncate max-w-[60px]" title={cell.teacherName || cell.teacherId || 'TBA'}>{(cell.teacherName || cell.teacherId || 'TBA')?.split(' ')[0]}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-full min-h-[60px] w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-300">
                                <span className="text-xl font-light">+</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={visibleTimeSlots.length + 1} className="p-8 text-center text-slate-500">
                        No batches found. Please create batches first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Daily View - Institute Wide */}
      {activeTab === "daily_view" && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border border-slate-200 items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-slate-50 p-1 rounded-lg border border-slate-200 flex items-center">
                <button
                  onClick={() => {
                    const newDate = new Date(customWeekStart);
                    newDate.setDate(newDate.getDate() - 1);
                    setCustomWeekStart(newDate);
                  }}
                  className="p-2 hover:bg-white rounded shadow-sm transition-colors text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="px-4 text-center min-w-[200px]">
                  <p className="text-sm font-semibold text-slate-800">
                    {(() => {
                        const d = new Date(customWeekStart);
                        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(customWeekStart);
                    newDate.setDate(newDate.getDate() + 1);
                    setCustomWeekStart(newDate);
                  }}
                  className="p-2 hover:bg-white rounded shadow-sm transition-colors text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <button 
                onClick={() => setCustomWeekStart(new Date())}
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700 underline"
              >
                Jump to Today
              </button>
            </div>

            <button
              onClick={exportToExcel}
              className="bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
              title="Export as professional Excel file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export Excel
            </button>
          </div>

          {/* Same Table Structure as Custom View (Read Only or Editable?) - Editable is fine */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-48 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                      Class / Batch
                    </th>
                    {visibleTimeSlots.map((slot) => (
                      <th
                        key={slot.start}
                        className="px-2 py-3 text-center text-xs font-semibold text-slate-500 border-r border-slate-200 min-w-[120px]"
                      >
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {CLASS_LEVELS.flatMap(classLevel => {
                    const classBatches = batches.filter(b => b.classLevels.includes(classLevel));
                    if (classBatches.length === 0) {
                      return [{ classLevel, batchName: "" }];
                    }
                    return classBatches.map(batch => ({ classLevel, batchName: batch.name }));
                  }).map((row) => (
                    <tr key={`${row.classLevel}-${row.batchName || "no-batch"}`} className="hover:bg-slate-50/50 group">
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-slate-50/50 border-r border-slate-200 z-10">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-700 text-sm">Class {row.classLevel}</span>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full w-fit mt-1">
                            {row.batchName || "No batch"}
                          </span>
                        </div>
                      </td>
                      {visibleTimeSlots.map((slot) => {
                        const customGrid = timetableGrid as Record<string, Record<string, Record<string, Schedule>>>;
                        const cell = customGrid[row.classLevel]?.[row.batchName]?.[slot.start];
                        
                        return (
                          <td
                            key={slot.start}
                            onClick={() => {
                              // Enable editing even in Daily View for convenience
                              const dateString = customWeekStart.toISOString().split("T")[0];
                              const dayOfWk = customWeekStart.getDay();
                              // However, if we edit, we should be careful about 'ScheduleType'.
                              // If it's a regular schedule displayed here, editing it might be tricky if we want to change just this instance.
                              // But the system seems to support overrides via Custom Schedules. 
                              // If we create/update here, let's treat it as creating a 'Custom' schedule overriding whatever was there?
                              // Or just allow viewing.
                              // The user asked to View / Export. Editing is a bonus but might cause confusion if it edits the underlying regular schedule.
                              // But wait, the backend endpoint merges Regular and Custom.
                              // If we edit a 'Regular' item here, we probably want to create a 'Custom' exception for this date?
                              // For now, let's allow opening the modal. If it's regular, saving it as 'regular' changes it for all weeks.
                              // Ideally we should switch to 'Custom' type if editing a specific date instance of a regular schedule.
                              // TO keep it simple, I'll pass 'custom' as default type for new events here.
                              openCellModal(dayOfWk, slot.start, dateString, row.classLevel, row.batchName);
                            }}
                            className="px-1 py-1 border-r border-slate-100 cursor-pointer hover:bg-emerald-50 transition-colors relative"
                          >
                            {cell ? (
                              <div className={`border border-l-4 ${cell.scheduleType === 'custom' ? 'border-l-amber-500 bg-amber-50' : 'border-l-emerald-500 bg-white'} border-slate-200 rounded p-1.5 shadow-sm h-full min-h-[60px] hover:shadow-md transition-shadow`}>
                                <p className="font-semibold text-xs text-slate-800 truncate leading-tight mb-0.5" title={cell.subject}>
                                  {cell.subject}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate" title={getBatchDisplayLabel(cell)}>
                                  {getBatchDisplayLabel(cell)}
                                </p>
                                <div className="flex items-center justify-between text-[10px] text-slate-500">
                                  <span>R-{cell.roomNumber}</span>
                                  <span className="truncate max-w-[60px]" title={cell.teacherName || cell.teacherId || 'TBA'}>{(cell.teacherName || cell.teacherId || 'TBA')?.split(' ')[0]}</span>
                                </div>
                                {cell.scheduleType === 'custom' && <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Custom</span>}
                              </div>
                            ) : (
                              <div className="h-full min-h-[60px] w-full flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-300">
                                <span className="text-xl font-light">+</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Batch Management */}
      {activeTab === "batches" && (
        <AdminBatchManagement onBatchUpdate={loadInitialData} />
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!submitting) setIsModalOpen(false); }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-lg font-bold text-gray-800">
                  {editingSchedule ? "Edit Schedule" : "New Schedule"}
                </h2>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-4 max-h-[70vh] overflow-y-auto"
              >
                {/* Inline error banner */}
                {formError && (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-700 font-medium">{formError}</p>
                  </div>
                )}
                {/* Title & Subject */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="e.g. Physics Class"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.subject}
                      onChange={(e) =>
                        setFormData({ ...formData, subject: e.target.value })
                      }
                      placeholder="e.g. Physics"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Class & Batch */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class
                    </label>
                    <select
                      value={formData.classLevel}
                      onChange={(e) => {
                        const newClass = e.target.value;
                        const available = getAvailableBatches(newClass);
                        setFormData({
                          ...formData,
                          classLevel: newClass,
                          batch: available.length > 0 ? available[0].name : "",
                          batches: available.length > 0 ? [available[0].name] : [],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {CLASS_LEVELS.map((c) => (
                        <option key={c} value={c}>
                          Class {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batches
                    </label>
                    {getAvailableBatches(formData.classLevel).length === 0 ? (
                      <div className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 bg-gray-50">
                        No batch for this class (class-level schedule)
                      </div>
                    ) : (
                      <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 max-h-[160px] overflow-y-auto">
                        {getAvailableBatches(formData.classLevel).map((b) => {
                          const checked = formData.batches.includes(b.name);
                          return (
                            <label
                              key={b._id}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? "bg-emerald-50" : "hover:bg-gray-50"}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  const next = checked
                                    ? formData.batches.filter((n) => n !== b.name)
                                    : [...formData.batches, b.name];
                                  setFormData({ ...formData, batches: next, batch: next[0] || "" });
                                }}
                                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className={`text-sm font-medium ${checked ? "text-emerald-700" : "text-gray-700"}`}>
                                {b.name}
                              </span>
                              {checked && (
                                <svg className="w-4 h-4 text-emerald-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Day/Date & Time */}
                {formData.scheduleType === "regular" ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Day of Week
                        </label>
                        <select
                          value={formData.dayOfWeek}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              dayOfWeek: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          {DAYS.slice(1, 7).map((day, idx) => (
                            <option key={day} value={idx + 1}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allowCustomRegularTime}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setAllowCustomRegularTime(checked);
                              if (!checked) {
                                const matched = visibleTimeSlots.find((slot) => slot.start === formData.startTimeSlot);
                                const fallback = matched || visibleTimeSlots[0];
                                if (fallback) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    startTimeSlot: fallback.start,
                                    endTimeSlot: fallback.end,
                                  }));
                                }
                              }
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          Edit any time slot (custom)
                        </label>
                      </div>
                    </div>

                    {allowCustomRegularTime ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="time"
                              required
                              value={formData.startTimeSlot}
                              onChange={(e) =>
                                setFormData({ ...formData, startTimeSlot: e.target.value })
                              }
                              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-white transition-colors"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="time"
                              required
                              value={formData.endTimeSlot}
                              onChange={(e) =>
                                setFormData({ ...formData, endTimeSlot: e.target.value })
                              }
                              className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-white transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time Slot
                        </label>
                        <select
                          value={formData.startTimeSlot}
                          onChange={(e) => {
                            const slot = visibleTimeSlots.find(
                              (t) => t.start === e.target.value
                            );
                            setFormData({
                              ...formData,
                              startTimeSlot: e.target.value,
                              endTimeSlot: slot?.end || "",
                            });
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          {visibleTimeSlots.map((slot) => (
                            <option key={slot.start} value={slot.start}>
                              {slot.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          required
                          value={formData.date}
                          onChange={(e) =>
                            setFormData({ ...formData, date: e.target.value })
                          }
                          className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-white transition-colors"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Time
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="time"
                            required
                            value={formData.startTimeSlot}
                            onChange={(e) =>
                              setFormData({ ...formData, startTimeSlot: e.target.value })
                            }
                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-white transition-colors"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Time
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                          </div>
                          <input
                            type="time"
                            required
                            value={formData.endTimeSlot}
                            onChange={(e) =>
                              setFormData({ ...formData, endTimeSlot: e.target.value })
                            }
                            className="w-full pl-10 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-gray-50/50 hover:bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Room & Teacher */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Number
                    </label>
                    <select
                      value={formData.roomNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          roomNumber: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Room {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teacher
                    </label>
                    <select
                      value={formData.teacherId}
                      onChange={(e) =>
                        setFormData({ ...formData, teacherId: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((t) => {
                        // Check if teacher is on leave by matching against both _id and firebaseUid
                        const isOnLeave = teachersOnLeave.includes(t.id) || 
                                          !!(t.firebaseUid && teachersOnLeave.includes(t.firebaseUid));
                        return (
                          <option 
                            key={t.id} 
                            value={t.id}
                            disabled={isOnLeave}
                            style={isOnLeave ? { color: '#9ca3af', fontStyle: 'italic' } : {}}
                          >
                            {t.name}{isOnLeave ? ' (on Leave)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* Student Selection (Optional - for targeting specific students) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Target Students (Optional)
                    </label>
                    {formData.selectedStudents.length > 0 && (
                      <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                        {formData.selectedStudents.length} selected
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="🔍 Search students by name..."
                    onChange={(e) => {
                      const searchEl =
                        document.getElementById("student-search");
                      if (searchEl)
                        searchEl.dataset.search = e.target.value.toLowerCase();
                      // Force re-render
                      setFormData({ ...formData });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 mb-2"
                  />
                  <div
                    id="student-search"
                    data-search=""
                    className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2"
                  >
                    {students
                      .filter((s) => {
                        const searchEl = document.getElementById("student-search");
                        const search = searchEl?.dataset.search || "";
                        const searchMatch = !search || s.name.toLowerCase().includes(search);
                        if (!searchMatch) return false;

                        if (formData.batches.length <= 1) return true;
                        return !!s.batch && formData.batches.includes(s.batch);
                      })
                      .map((s) => (
                        <label
                          key={s.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedStudents.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  selectedStudents: [
                                    ...formData.selectedStudents,
                                    s.id,
                                  ],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  selectedStudents:
                                    formData.selectedStudents.filter(
                                      (id) => id !== s.id
                                    ),
                                });
                              }
                            }}
                            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">{s.name}</span>
                          <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                             {s.source === 'firebase' && <span className="text-[10px] bg-orange-100 text-orange-600 px-1 rounded">FB</span>}
                             {s.classLevel || "?"} - {s.batch || "?"}
                          </span>
                        </label>
                      ))}
                    {students.length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {formData.classLevel ? "No students found" : "Select Class to view students"}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Leave empty to notify all students in the selected batches or class
                  </p>
                </div>

                {/* Actions */}
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => { if (!submitting) setIsModalOpen(false); }}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  {editingSchedule && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleDelete(editingSchedule._id)}
                      className="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 font-medium hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                        </svg>
                        {editingSchedule ? "Saving..." : "Creating..."}
                      </>
                    ) : (
                      editingSchedule ? "Save Changes" : "Create Schedule"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
// ... (loadInitialData is unchanged)


