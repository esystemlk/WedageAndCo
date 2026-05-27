import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day';

export interface DayAttendance {
  date: string;
  records: Record<string, AttendanceStatus>; // staffId → status
  updatedAt: Timestamp;
  updatedBy: string;
}

/** Fetch attendance records for a specific date */
export const getAttendanceForDate = async (
  date: string
): Promise<Record<string, AttendanceStatus>> => {
  try {
    const snapshot = await getDoc(doc(db, 'attendance', date));
    if (snapshot.exists()) {
      return (snapshot.data() as DayAttendance).records || {};
    }
    return {};
  } catch (err) {
    console.error('Error fetching attendance:', err);
    return {};
  }
};

/** Save (upsert) attendance records for a date */
export const saveAttendanceForDate = async (
  date: string,
  records: Record<string, AttendanceStatus>,
  updatedBy: string
): Promise<void> => {
  await setDoc(doc(db, 'attendance', date), {
    date,
    records,
    updatedAt: Timestamp.now(),
    updatedBy,
  } satisfies DayAttendance);
};
