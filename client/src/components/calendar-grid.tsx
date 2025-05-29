import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { generateCalendarDays, getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, Plus } from "lucide-react";
import type { TrainingSession, Swimmer } from "@shared/schema";

interface CalendarGridProps {
  currentDate: Date;
  trainingSessions: TrainingSession[];
  onDateClick: (dateString: string) => void;
  onLeaderSet?: (dateString: string) => void;
  isLoading: boolean;
}

export function CalendarGrid({ 
  currentDate, 
  trainingSessions, 
  onDateClick, 
  onLeaderSet,
  isLoading 
}: CalendarGridProps) {
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const calendarDays = generateCalendarDays(currentDate);

  const getSessionsForDate = (dateString: string) => {
    return trainingSessions.filter(session => session.date === dateString);
  };

  const handleTouchStart = (dateString: string) => {
    setIsLongPress(false);
    const timeout = setTimeout(() => {
      setIsLongPress(true);
      // バイブレーション（対応デバイスのみ）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      if (onLeaderSet) {
        onLeaderSet(dateString);
      }
    }, 500); // 500ms長押しでリーダー設定モーダル表示
    setLongPressTimeout(timeout);
  };

  const handleTouchEnd = (dateString: string) => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    
    // 長押しでなければ通常のクリック処理
    if (!isLongPress) {
      onDateClick(dateString);
    }
    setIsLongPress(false);
  };

  const handleTouchCancel = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    setIsLongPress(false);
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
              onTouchStart={() => handleTouchStart(day.dateString)}
              onTouchEnd={() => handleTouchEnd(day.dateString)}
              onTouchCancel={handleTouchCancel}
              onClick={() => onDateClick(day.dateString)}
              onContextMenu={(e) => {
                e.preventDefault();
                if (onLeaderSet) {
                  onLeaderSet(day.dateString);
                }
              }}
              className={`
                relative h-20 sm:h-24 lg:h-32 p-1 sm:p-2 border-r border-b border-ocean-100 cursor-pointer transition-colors
                ${!day.isCurrentMonth ? 'bg-gray-50' : 'hover:bg-ocean-50'}
                ${day.isToday ? 'bg-pool-50 border-l-2 sm:border-l-4 border-l-pool-500' : ''}
                select-none
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
                  <div className="flex items-center gap-1">
                    <LeaderName date={day.dateString} />
                    {onLeaderSet && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 w-5 p-0 text-ocean-600 hover:text-ocean-800 hover:bg-ocean-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLeaderSet(day.dateString);
                        }}
                        title="リーダー設定"
                      >
                        <UserCheck className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
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

  // order順にソートしてから計算
  const sortedLeaders = [...leaders].sort((a, b) => a.order - b.order);
  
  // 基準日（2025年5月26日の月曜日）からの計算
  const baseDate = new Date('2025-05-26');
  const daysDiff = Math.floor((targetDate.getTime() - baseDate.getTime()) / (24 * 60 * 60 * 1000));
  
  // 月曜日と金曜日のカウントを別々に計算
  let displayCount = 0;
  
  // 基準日から対象日までの月曜日と金曜日の回数を数える
  for (let i = 0; i <= daysDiff; i++) {
    const checkDate = new Date(baseDate);
    checkDate.setDate(checkDate.getDate() + i);
    const checkDay = checkDate.getDay();
    
    if (checkDay === 1 || checkDay === 5) { // 月曜日または金曜日
      if (i === daysDiff && checkDay === dayOfWeek) {
        break; // 対象日に到達
      }
      if (i < daysDiff) {
        displayCount++;
      }
    }
  }
  
  const leaderIndex = displayCount % sortedLeaders.length;
  
  const currentLeader = sortedLeaders[leaderIndex];

  if (!currentLeader) {
    return null;
  }

  return (
    <span className="text-xs text-pool-600 font-medium bg-pool-100 px-1 rounded">
      {currentLeader.name}
    </span>
  );
}
