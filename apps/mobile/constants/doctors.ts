/** AI Doctor characters — shared between feed, profile, and chat screens */

export interface DoctorInfo {
  name: string;
  specialty: string;
  emoji: string;
  color: string;
  personality: string;
  motto: string;
}

export const DOCTORS: Record<string, DoctorInfo> = {
  therapist: {
    name: "Dr. Alex",
    specialty: "Терапевт",
    emoji: "🩺",
    color: "#3b82f6",
    personality: "Спокійний, турботливий, дивиться на загальну картину",
    motto: "Здоров'я — це баланс",
  },
  nutritionist: {
    name: "Dr. Maria",
    specialty: "Дієтолог",
    emoji: "🥗",
    color: "#10b981",
    personality: "Ентузіастична, практична, мотивуюча",
    motto: "Їжа — це ліки",
  },
  trainer: {
    name: "Dr. Taras",
    specialty: "Тренер",
    emoji: "🏃",
    color: "#f97316",
    personality: "Енергійний, мотивуючий, дає конкретні виклики",
    motto: "Рух — це життя",
  },
  psychologist: {
    name: "Dr. Sofia",
    specialty: "Психолог",
    emoji: "🧠",
    color: "#8b5cf6",
    personality: "Тепла, емпатична, уважна до деталей",
    motto: "Думки визначають здоров'я",
  },
  pharmacist: {
    name: "Dr. Ivan",
    specialty: "Фармацевт",
    emoji: "💊",
    color: "#e11d48",
    personality: "Точний, надійний, детально-орієнтований",
    motto: "Кожна таблетка вчасно",
  },
  cardiologist: {
    name: "Dr. Oleg",
    specialty: "Кардіолог",
    emoji: "❤️",
    color: "#dc2626",
    personality: "Серйозний але заспокійливий, аналітичний",
    motto: "Серце — це двигун",
  },
  orthopedist: {
    name: "Dr. Lina",
    specialty: "Ортопед",
    emoji: "🦴",
    color: "#d97706",
    personality: "Практична, орієнтована на дію",
    motto: "Рух без болю",
  },
};
