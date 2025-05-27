import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getTrainingTypeColor(type: string): string {
  switch (type) {
    case 'aerobic':
      return 'bg-ocean-500';
    case 'sprint':
      return 'bg-pool-500';
    case 'technique':
      return 'bg-swimmer';
    case 'strength':
      return 'bg-energy';
    default:
      return 'bg-gray-500';
  }
}

export function getTrainingTypeLabel(type: string): string {
  switch (type) {
    case 'aerobic':
      return '有酸素';
    case 'sprint':
      return 'スプリント';
    case 'technique':
      return '技術練習';
    case 'strength':
      return '筋力トレーニング';
    default:
      return type;
  }
}

export function getIntensityLabel(intensity: string): string {
  switch (intensity) {
    case 'easy':
      return 'Easy';
    case 'moderate':
      return 'Moderate';
    case 'hard':
      return 'Hard';
    case 'race_pace':
      return 'Race Pace';
    default:
      return intensity;
  }
}

export function getStrokeLabel(stroke: string): string {
  switch (stroke) {
    case 'freestyle':
      return '自由形';
    case 'backstroke':
      return '背泳ぎ';
    case 'breaststroke':
      return '平泳ぎ';
    case 'butterfly':
      return 'バタフライ';
    default:
      return stroke;
  }
}

export function generateCalendarDays(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  // Get the first day of the week (Sunday)
  const startDay = new Date(start);
  startDay.setDate(start.getDate() - start.getDay());
  
  // Get the last day of the week (Saturday)
  const endDay = new Date(end);
  endDay.setDate(end.getDate() + (6 - end.getDay()));
  
  const days = eachDayOfInterval({ start: startDay, end: endDay });
  
  return days.map(day => ({
    date: day,
    isCurrentMonth: isSameMonth(day, date),
    isToday: isToday(day),
    dateString: format(day, 'yyyy-MM-dd')
  }));
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  return `${hours}:${minutes}`;
}

export function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}km`;
  }
  return `${distance}m`;
}
