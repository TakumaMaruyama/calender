import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { generateCalendarDays, getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { TrainingSession, Swimmer } from "@shared/schema";

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
                h-20 sm:h-24 lg:h-32 p-1 sm:p-2 border-r border-b border-ocean-100 cursor-pointer transition-colors
                ${!day.isCurrentMonth ? 'bg-gray-50' : 'hover:bg-ocean-50'}
                ${day.isToday ? 'bg-pool-50 border-l-2 sm:border-l-4 border-l-pool-500' : ''}
              `}
            >
              <div className={`text-xs sm:text-sm font-medium mb-1 ${
                day.isToday 
                  ? 'text-pool-600 font-bold' 
                  : day.isCurrentMonth 
                    ? 'text-ocean-900' 
                    : 'text-gray-400'
              }`}>
                <div className="flex items-center justify-between">
                  <span>{format(day.date, 'd')}</span>
                  <LeaderName date={day.dateString} />
                </div>
              </div>
              
              <div className="space-y-0.5 sm:space-y-1 w-full">
                {sessions.slice(0, 2).map((session) => {
                  // titleまたはtypeどちらかを表示
                  const displayText = session.title || getTrainingTypeLabel(session.type || '');
                  const colorClass = session.type ? getTrainingTypeColor(session.type) : 'bg-gray-500';
                  
                  return (
                    <div
                      key={session.id}
                      className={`${colorClass} text-white px-1.5 sm:px-2 py-1 rounded cursor-pointer hover:opacity-80 group relative w-full overflow-hidden`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // 削除確認を表示
                        if (window.confirm(`「${displayText}」を削除しますか？`)) {
                          // 削除処理をここに追加
                          window.dispatchEvent(new CustomEvent('deleteTraining', { detail: session.id }));
                        }
                      }}
                      title={displayText} // ツールチップで全文表示
                    >
                      <div 
                        className="pr-5 sm:pr-6 text-xs sm:text-sm whitespace-nowrap overflow-x-auto scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent"
                        style={{
                          scrollbarWidth: 'thin',
                          WebkitOverflowScrolling: 'touch'
                        }}
                      >
                        {displayText}
                      </div>
                      <span className="opacity-70 group-hover:opacity-100 absolute right-1 top-1/2 transform -translate-y-1/2 text-xs font-bold">×</span>
                    </div>
                  );
                })}
                {sessions.length > 2 && (
                  <div className="text-xs text-ocean-600 px-1 sm:px-2">
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

// リーダー名表示コンポーネント（月〜水、金〜日の3日交代、月・金のみ表示）
function LeaderName({ date }: { date: string }) {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 月曜日(1)と金曜日(5)のみ表示
  if (dayOfWeek !== 1 && dayOfWeek !== 5) {
    return null;
  }

  // ローカルストレージからリーダーリストを取得
  const savedLeaders = localStorage.getItem('swimtracker-leaders');
  const leaders = savedLeaders ? JSON.parse(savedLeaders) : [
    { name: "ののか", order: 1 },
    { name: "有理", order: 2 },
    { name: "龍之介", order: 3 },
    { name: "彩音", order: 4 },
    { name: "勘太", order: 5 },
    { name: "悠喜", order: 6 },
    { name: "佳翔", order: 7 },
    { name: "春舞", order: 8 },
    { name: "滉介", order: 9 },
    { name: "元翔", order: 10 },
    { name: "百華", order: 11 },
    { name: "澪心", order: 12 },
    { name: "礼志", order: 13 },
    { name: "桔伊", order: 14 },
    { name: "虹日", order: 15 },
    { name: "弥広", order: 16 }
  ];

  if (leaders.length === 0) {
    return null;
  }

  // 基準日（2025年5月26日の月曜日）からの計算
  const baseDate = new Date('2025-05-26');
  const weekNumber = Math.floor((targetDate.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  
  // 月曜日と金曜日で異なるリーダーを表示（6日間で1人のリーダーが担当）
  let leaderIndex;
  if (dayOfWeek === 1) { // 月曜日
    leaderIndex = Math.floor(weekNumber / 2) % leaders.length;
  } else { // 金曜日
    leaderIndex = (Math.floor(weekNumber / 2) + 1) % leaders.length;
  }
  
  const currentLeader = leaders[leaderIndex];

  if (!currentLeader) {
    return null;
  }

  return (
    <span className="text-xs text-pool-600 font-medium bg-pool-100 px-1 rounded">
      {currentLeader.name}
    </span>
  );
}
