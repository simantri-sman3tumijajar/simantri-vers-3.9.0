import { ClassItem, Student } from "../types";
import masterDb from "./permanentMasterDatabase.json";

export const DEFAULT_CLASSES: ClassItem[] = (masterDb.classes || []) as ClassItem[];

export const DEFAULT_STUDENTS: Student[] = (masterDb.students || []) as Student[];

export const DEFAULT_STUDENTS_X1: Student[] = (DEFAULT_STUDENTS.filter(s => s.kelas === "X.1")) as Student[];

export const DEFAULT_STUDENTS_X2: Student[] = (DEFAULT_STUDENTS.filter(s => s.kelas === "X.2")) as Student[];
