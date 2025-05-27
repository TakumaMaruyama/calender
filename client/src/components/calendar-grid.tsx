import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateCalendarDays, getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/utils";
import type { TrainingSession } from "@shared/schema";

interface CalendarGridProps {
  currentDate: Date;
  trainingSessions: TrainingSession[];
  onDateClick: (dateString: string) => void;
  isLoading: boolean;
}

export function CalendarGrid({ 
  currentDate, 
  trainingSessions, 
  onDateClick, 
  isLoading 
}: CalendarGridProps) {
  const calendarDays = generateCalendarDays(currentDate);

  const getSessionsForDate = (dateString: string) => {
    return trainingSessions.filter(session => session.date === dateString);
  };

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-ocean-100 overflow-hidden">
        <div className="p-6">
          <Skeleton className="h-8 w-32 mb-4" />
          <div className="grid grid-cols-7 gap-4">
            {Array.from({ length: 42 }).map((_, i) => (
              <Skeleton key={i} className="h-24 sm:h-32" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-ocean-100 overflow-hidden">
      {/* Calendar Header */}
      <div className="grid grid-cols-7 bg-ocean-50 border-b border-ocean-100">
        {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
          <div key={day} className="p-4 text-center text-sm font-semibold text-ocean-700">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Body */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day, index) => {
          const sessions = getSessionsForDate(day.dateString);
          
          return (
            <div
              key={index}
              onClick={() => onDateClick(day.dateString)}
              className={`
                h-24 sm:h-32 p-2 border-r border-b border-ocean-100 cursor-pointer transition-colors
                ${!day.isCurrentMonth ? 'bg-gray-50' : 'hover:bg-ocean-50'}
                ${day.isToday ? 'bg-pool-50 border-l-4 border-l-pool-500' : ''}
              `}
            >
              <div className={`text-sm font-medium mb-1 ${
                day.isToday 
                  ? 'text-pool-600 font-bold' 
                  : day.isCurrentMonth 
                    ? 'text-ocean-900' 
                    : 'text-gray-400'
              }`}>
                {format(day.date, 'd')}
              </div>
              
              <div className="space-y-1">
                {sessions.slice(0, 2).map((session) => (
                  <div
                    key={session.id}
                    className={`${getTrainingTypeColor(session.type)} text-white text-xs px-2 py-1 rounded truncate`}
                  >
                    {getTrainingTypeLabel(session.type)}
                  </div>
                ))}
                {sessions.length > 2 && (
                  <div className="text-xs text-ocean-600 px-2">
                    +{sessions.length - 2} 他
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
