import { useState, useEffect } from "react";
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

  const handleTouchEnd = (dateString: string, event?: React.TouchEvent) => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    
    // 長押しでなければ通常のクリック処理
    if (!isLongPress) {
      // タッチイベントの場合はclickイベントを防ぐ
      if (event) {
        event.preventDefault();
      }
      onDateClick(dateString);
    }
    setIsLongPress(false);
  };

  const handleClick = (dateString: string, event: React.MouseEvent) => {
    // タッチデバイスでない場合のみクリック処理
    if (!('ontouchstart' in window)) {
      onDateClick(dateString);
    }
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
              onTouchEnd={(e) => handleTouchEnd(day.dateString, e)}
              onTouchCancel={handleTouchCancel}
              onClick={(e) => handleClick(day.dateString, e)}
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

// リーダー名表示コンポーネント（APIからリーダー情報を取得）
function LeaderName({ date }: { date: string }) {
  const [leader, setLeader] = useState<string | null>(null);
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 月曜日(1)と金曜日(5)のみ表示
  if (dayOfWeek !== 1 && dayOfWeek !== 5) {
    return null;
  }

  useEffect(() => {
    // APIからその日のリーダー情報を取得
    fetch(`/api/leader/${date}`)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        return null;
      })
      .then(data => {
        if (data && data.name) {
          setLeader(data.name);
        }
      })
      .catch(err => {
        console.error('リーダー情報取得エラー:', err);
      });
  }, [date]);

  if (!leader) {
    return null;
  }

  return (
    <span className="text-xs text-pool-600 font-medium bg-pool-100 px-1 rounded">
      {leader}
    </span>
  );
}
