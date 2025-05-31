import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, Users, Download, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { CalendarGrid } from '@/components/calendar-grid';
import { TrainingModal } from '@/components/training-modal';
import { LeaderDateModal } from '@/components/leader-date-modal';
import { generateCalendarDays, getTrainingTypeLabel } from '@/lib/utils';
import type { TrainingSession } from '@shared/schema';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { toast } = useToast();

  const { data: trainingSessions, isLoading } = useQuery({
    queryKey: ['/api/training-sessions/month', currentDate.getFullYear(), currentDate.getMonth() + 1],
    queryFn: async () => {
      const response = await fetch(`/api/training-sessions/month/${currentDate.getFullYear()}/${currentDate.getMonth() + 1}`);
      if (!response.ok) {
        throw new Error('Failed to fetch training sessions');
      }
      return response.json() as Promise<TrainingSession[]>;
    },
  });

  useEffect(() => {
    const handleDeleteTraining = (event: CustomEvent) => {
      toast({
        title: "削除完了",
        description: "トレーニングセッションを削除しました",
      });
    };

    window.addEventListener('trainingDeleted', handleDeleteTraining as EventListener);
    
    return () => {
      window.removeEventListener('trainingDeleted', handleDeleteTraining as EventListener);
    };
  }, [toast]);

  const handleDateClick = (dateString: string) => {
    setSelectedDate(dateString);
    setIsModalOpen(true);
  };

  const handleLeaderSet = (dateString: string) => {
    setSelectedDate(dateString);
    setIsLeaderModalOpen(true);
  };

  const handleNewTraining = () => {
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleExportImage = async () => {
    try {
      console.log('カスタム画像エクスポート開始...');
      
      const calendarDays = generateCalendarDays(currentDate);
      const monthName = format(currentDate, 'yyyy年MM月');
      
      console.log('キャンバス作成中...');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('キャンバスコンテキストの取得に失敗しました');
      }

      canvas.width = 1200;
      canvas.height = 800;

      // 背景色を設定
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // フォント設定
      ctx.font = '16px Arial, sans-serif';
      ctx.textAlign = 'center';

      // タイトルを描画
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 24px Arial, sans-serif';
      ctx.fillText(monthName, canvas.width / 2, 40);

      // 曜日ヘッダーを描画
      const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const cellWidth = canvas.width / 7;
      const cellHeight = 100;
      const startY = 80;

      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#64748B';
      
      dayNames.forEach((day, index) => {
        const x = index * cellWidth + cellWidth / 2;
        ctx.fillText(day, x, startY);
      });

      // カレンダーの日付とセッションを描画
      ctx.font = '12px Arial, sans-serif';
      
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          const dayIndex = week * 7 + day;
          if (dayIndex >= calendarDays.length) break;

          const calendarDay = calendarDays[dayIndex];
          const x = day * cellWidth;
          const y = startY + 20 + week * cellHeight;

          // セルの境界線を描画
          ctx.strokeStyle = '#E2E8F0';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, cellWidth, cellHeight);

          // 日付を描画
          ctx.fillStyle = calendarDay.isCurrentMonth ? '#1E293B' : '#94A3B8';
          ctx.font = 'bold 14px Arial, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(format(calendarDay.date, 'd'), x + 8, y + 20);

          // その日のセッションを取得
          const sessions = trainingSessions?.filter(session => session.date === calendarDay.dateString) || [];
          
          // セッションを描画（最大3つまで）
          sessions.slice(0, 3).forEach((session, sessionIndex) => {
            const sessionY = y + 40 + sessionIndex * 20;
            const displayText = session.title || (session.type ? getTrainingTypeLabel(session.type) : '');
            
            // セッションの背景色を設定
            let bgColor = '#6B7280';
            if (session.type) {
              switch (session.type) {
                case 'endurance': bgColor = '#3B82F6'; break;
                case 'speed': bgColor = '#EF4444'; break;
                case 'technique': bgColor = '#10B981'; break;
                case 'recovery': bgColor = '#8B5CF6'; break;
                default: bgColor = '#6B7280';
              }
            }

            // セッションボックスを描画
            ctx.fillStyle = bgColor;
            ctx.fillRect(x + 4, sessionY - 12, cellWidth - 8, 16);

            // セッションテキストを描画
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(displayText, x + 6, sessionY - 2);
          });

          // セッション数が3つを超える場合の表示
          if (sessions.length > 3) {
            ctx.fillStyle = '#64748B';
            ctx.font = '10px Arial, sans-serif';
            ctx.fillText(`+${sessions.length - 3} 他`, x + 6, y + cellHeight - 8);
          }
        }
      }

      // 画像をダウンロード
      console.log('画像ダウンロード処理開始...');
      const dataURL = canvas.toDataURL('image/png', 1.0);
      
      // Blobに変換してダウンロード
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const url = URL.createObjectURL(blob);
      
      // ダウンロードリンクを作成
      const link = document.createElement('a');
      link.href = url;
      link.download = `swimming-calendar-${format(currentDate, 'yyyy-MM')}.png`;
      
      // ユーザーアクションとしてクリックを実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // リソースを解放
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "画像保存完了",
        description: "カレンダー画像を保存しました",
        duration: 3000,
      });
    } catch (error) {
      console.error('画像生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      toast({
        title: "エラー",
        description: `画像の保存に失敗しました: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-ocean-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-ocean-100">
        <div className="px-3 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center space-x-2">
              <Waves className="text-ocean-500 h-6 w-6 sm:h-7 sm:w-7" />
              <h1 className="text-lg sm:text-xl font-bold text-ocean-900">SwimTracker</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/leaders">
                <Button 
                  variant="outline"
                  size="sm"
                  className="border-ocean-300 text-ocean-700 hover:bg-ocean-50 p-2"
                >
                  <Users className="h-4 w-4" />
                </Button>
              </Link>
              <Button 
                onClick={handleExportImage}
                variant="outline"
                size="sm"
                className="border-ocean-300 text-ocean-700 hover:bg-ocean-50 p-2"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                onClick={handleNewTraining}
                variant="default"
                size="sm"
                className="bg-ocean-500 hover:bg-ocean-600"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">追加</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Calendar Navigation */}
      <div className="bg-white border-b border-ocean-100 sticky top-14 sm:top-16 z-10">
        <div className="px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-ocean-50 text-ocean-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            
            <h2 className="text-xl sm:text-2xl font-bold text-ocean-900">
              {format(currentDate, 'yyyy年MM月')}
            </h2>
            
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 rounded-lg hover:bg-ocean-50 text-ocean-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-3 sm:p-4">
        <CalendarGrid 
          currentDate={currentDate}
          trainingSessions={trainingSessions || []}
          onDateClick={handleDateClick}
          onLeaderSet={handleLeaderSet}
          isLoading={isLoading}
        />
      </div>

      {/* Training Modal */}
      <TrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />

      {/* Leader Date Modal */}
      <LeaderDateModal
        isOpen={isLeaderModalOpen}
        onClose={() => setIsLeaderModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}