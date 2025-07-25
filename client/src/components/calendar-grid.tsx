import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { generateCalendarDays, getTrainingTypeColor, getTrainingTypeLabel } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { UserCheck, Plus, ZoomIn, ZoomOut } from "lucide-react";
import type { TrainingSession, Swimmer } from "@shared/schema";

interface CalendarGridProps {
  currentDate: Date;
  trainingSessions: TrainingSession[];
  onDateClick: (dateString: string) => void;
  onLeaderSet?: (dateString: string) => void;
  onMonthChange?: (direction: 'prev' | 'next') => void;
  isLoading: boolean;
}

export function CalendarGrid({ 
  currentDate, 
  trainingSessions, 
  onDateClick, 
  onLeaderSet,
  onMonthChange,
  isLoading 
}: CalendarGridProps) {
  const [longPressTimeout, setLongPressTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [swipeStartX, setSwipeStartX] = useState(0);
  const [swipeStartY, setSwipeStartY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const calendarDays = generateCalendarDays(currentDate);

  // Zoom levels: 0.3 (30%), 0.5, 0.6, 0.8, 1 (default), 1.2, 1.5
  const zoomLevels = [0.3, 0.5, 0.6, 0.8, 1, 1.2, 1.5];
  
  const zoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex < zoomLevels.length - 1) {
      setZoomLevel(zoomLevels[currentIndex + 1]);
    }
  };
  
  const zoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoomLevel);
    if (currentIndex > 0) {
      setZoomLevel(zoomLevels[currentIndex - 1]);
    }
  };

  const getSessionsForDate = (dateString: string) => {
    return trainingSessions.filter(session => session.date === dateString);
  };

  const handleTouchStart = (dateString: string, event: React.TouchEvent) => {
    setIsLongPress(false);
    setHasMoved(false);
    const touch = event.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    
    const timeout = setTimeout(() => {
      if (!hasMoved) {
        setIsLongPress(true);
        // バイブレーション（対応デバイスのみ）
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        if (onLeaderSet) {
          onLeaderSet(dateString);
        }
      }
    }, 500); // 500ms長押しでリーダー設定モーダル表示
    setLongPressTimeout(timeout);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!hasMoved) {
      const touch = event.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      
      // 10px以上動いたらスクロールと判定
      if (deltaX > 10 || deltaY > 10) {
        setHasMoved(true);
        if (longPressTimeout) {
          clearTimeout(longPressTimeout);
          setLongPressTimeout(null);
        }
      }
    }
  };

  const handleTouchEnd = (dateString: string, event?: React.TouchEvent) => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      setLongPressTimeout(null);
    }
    
    // 長押しでなく、かつ移動していなければ通常のクリック処理
    if (!isLongPress && !hasMoved) {
      // タッチイベントの場合はclickイベントを防ぐ
      if (event) {
        event.preventDefault();
      }
      onDateClick(dateString);
    }
    setIsLongPress(false);
    setHasMoved(false);
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

  // Container-level swipe handlers for month navigation
  const handleContainerTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    setSwipeStartX(touch.clientX);
    setSwipeStartY(touch.clientY);
    setIsScrolling(false);
  };

  const handleContainerTouchMove = (event: React.TouchEvent) => {
    if (!swipeStartX || !swipeStartY) return;
    
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - swipeStartX);
    const deltaY = Math.abs(touch.clientY - swipeStartY);
    
    // If vertical movement is greater than horizontal, it's likely a scroll
    if (deltaY > deltaX && deltaY > 30) {
      setIsScrolling(true);
    }
  };

  const handleContainerTouchEnd = (event: React.TouchEvent) => {
    if (!swipeStartX || !swipeStartY || isScrolling) {
      setSwipeStartX(0);
      setSwipeStartY(0);
      setIsScrolling(false);
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - swipeStartX;
    const deltaY = Math.abs(touch.clientY - swipeStartY);
    
    // Only trigger month change if horizontal swipe is significant and vertical movement is minimal
    if (Math.abs(deltaX) > 50 && deltaY < 100 && onMonthChange) {
      if (deltaX > 0) {
        onMonthChange('prev'); // Swipe right = previous month
      } else {
        onMonthChange('next'); // Swipe left = next month
      }
    }

    setSwipeStartX(0);
    setSwipeStartY(0);
    setIsScrolling(false);
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
    <div className="w-full">
      {/* Zoom Controls */}
      <div className="flex justify-center items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={zoomOut}
          disabled={zoomLevel <= zoomLevels[0]}
          className="flex items-center gap-1"
        >
          <ZoomOut className="h-4 w-4" />
          縮小
        </Button>
        <span className="text-sm text-gray-600 min-w-[60px] text-center">
          {Math.round(zoomLevel * 100)}%
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={zoomIn}
          disabled={zoomLevel >= zoomLevels[zoomLevels.length - 1]}
          className="flex items-center gap-1"
        >
          <ZoomIn className="h-4 w-4" />
          拡大
        </Button>
      </div>
      
      <div 
        className="w-full overflow-auto"
        onTouchStart={handleContainerTouchStart}
        onTouchMove={handleContainerTouchMove}
        onTouchEnd={handleContainerTouchEnd}
      >
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          <Card className="bg-white rounded-xl shadow-sm border border-ocean-100 overflow-hidden min-w-[700px]">
            {/* Calendar Header */}
            <div className="grid grid-cols-7 bg-ocean-50 border-b border-ocean-100">
              {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
                <div key={day} className={`text-center font-semibold text-ocean-700 min-w-[100px] ${
                  zoomLevel <= 0.8 ? 'p-2 text-xs' : 'p-4 text-sm'
                }`}>
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
                    onTouchStart={(e) => handleTouchStart(day.dateString, e)}
                    onTouchMove={handleTouchMove}
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
                      relative h-20 lg:h-28 p-1 border-r border-b border-ocean-100 cursor-pointer transition-colors min-w-[100px]
                      ${!day.isCurrentMonth ? 'bg-gray-50' : 'hover:bg-ocean-50'}
                      ${day.isToday ? 'bg-pool-50 border-l-2 sm:border-l-4 border-l-pool-500' : ''}
                      select-none
                    `}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      day.isToday 
                        ? 'text-pool-600 font-bold' 
                        : day.isCurrentMonth 
                          ? 'text-ocean-900' 
                          : 'text-gray-400'
                    }`}>
                      <div className="flex items-start justify-between">
                        <span className={`${zoomLevel <= 0.8 ? 'text-xs' : 'text-sm'}`}>
                          {format(day.date, 'd')}
                        </span>
                        <div className="absolute top-1 right-1">
                          <LeaderName date={day.dateString} zoomLevel={zoomLevel} />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1 w-full">
                      {sessions.slice(0, 3).map((session) => {
                        // titleまたはtypeどちらかを表示
                        const displayText = session.title || getTrainingTypeLabel(session.type || '');
                        const hasContent = displayText && displayText.trim() !== '';
                        
                        // 大会の場合は複数行表示（※練習は無しが含まれる場合）
                        const isTournament = session.title?.includes('※練習は無し') || false;
                        const tournamentLines = isTournament && session.title ? session.title.split('\n') : [];
                        
                        // titleがある場合は無色、typeのみの場合は色付き、空白も無色
                        const isCustomTitle = session.title && session.title.trim() !== '';
                        const isEmpty = !hasContent;
                        const colorClass = (isCustomTitle || isEmpty) ? 'bg-transparent text-black' : 
                                         (session.type ? getTrainingTypeColor(session.type) + ' text-white' : 'bg-gray-500 text-white');
                        
                        return (
                          <div
                            key={session.id}
                            className={`${colorClass} rounded relative w-full ${isTournament ? 'flex items-start h-[40px] pt-1' : 'flex items-center h-[20px]'} cursor-pointer`}
                            title={displayText} // ツールチップで全文表示
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              window.dispatchEvent(new CustomEvent('showDeleteDialog', { detail: session }));
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                            }}
                            onTouchEnd={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              window.dispatchEvent(new CustomEvent('showDeleteDialog', { detail: session }));
                            }}
                          >
                            {isTournament ? (
                              <div className="flex-1 px-2 py-1 text-xs font-medium export-full-text">
                                {tournamentLines.map((line, index) => (
                                  <div key={index} className="leading-tight">
                                    {line}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div 
                                className="flex-1 px-2 py-1 text-xs font-medium export-full-text overflow-hidden whitespace-nowrap leading-none"
                                style={{
                                  textOverflow: 'ellipsis'
                                }}
                                data-full-text={displayText}
                              >
                                {displayText || '\u00A0'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {sessions.length > 3 && (
                        <div className="text-xs text-ocean-600 px-2">
                          +{sessions.length - 3} 他
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// リーダー名表示コンポーネント（APIからリーダー情報を取得）
function LeaderName({ date, zoomLevel }: { date: string; zoomLevel: number }) {
  const [leader, setLeader] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();
  
  // 月曜日(1)と金曜日(5)のみ表示
  if (dayOfWeek !== 1 && dayOfWeek !== 5) {
    return null;
  }

  useEffect(() => {
    setIsLoading(true);
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
        } else {
          setLeader(null);
        }
      })
      .catch(err => {
        console.error('リーダー情報取得エラー:', err);
        setLeader(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [date]);

  if (isLoading) {
    return null;
  }

  if (!leader) {
    return null;
  }

  // ズームレベルに応じてスタイルを調整
  const getSizeClasses = () => {
    if (zoomLevel <= 0.6) {
      return "text-xs px-1 py-0.5"; // 最小サイズ
    } else if (zoomLevel <= 0.8) {
      return "text-xs px-1 py-0.5"; // 小サイズ
    } else {
      return "text-xs px-1"; // 通常サイズ
    }
  };

  return (
    <span className={`text-pool-600 font-medium bg-pool-100 rounded whitespace-nowrap ${getSizeClasses()}`}>
      {leader}
    </span>
  );
}
