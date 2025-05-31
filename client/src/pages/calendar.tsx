import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, addMonths, subMonths } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, User, Waves, Filter, Download, Users, UserCheck } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { TrainingSidebar } from "@/components/training-sidebar";
import { TrainingModal } from "@/components/training-modal";
import { LeaderDateModal } from "@/components/leader-date-modal";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import type { TrainingSession } from "@shared/schema";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLeaderModalOpen, setIsLeaderModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { toast } = useToast();
  const calendarRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: trainingSessions = [], isLoading } = useQuery<TrainingSession[]>({
    queryKey: ['/api/training-sessions/month', year, month],
    queryFn: () => fetch(`/api/training-sessions/month/${year}/${month}`).then(res => res.json()),
  });





  // 削除機能
  const deleteMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const response = await apiRequest("DELETE", `/api/training-sessions/${sessionId}`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "成功",
        description: "トレーニングを削除しました",
      });
      // キャッシュを更新
      queryClient.invalidateQueries({ queryKey: ['/api/training-sessions'] });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  // 削除イベントリスナー
  useEffect(() => {
    const handleDeleteTraining = (event: CustomEvent) => {
      deleteMutation.mutate(event.detail);
    };

    window.addEventListener('deleteTraining', handleDeleteTraining as EventListener);
    return () => {
      window.removeEventListener('deleteTraining', handleDeleteTraining as EventListener);
    };
  }, [deleteMutation]);

  const handlePreviousMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

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
    if (!calendarRef.current) return;

    try {
      // 画像保存用に一時的にスタイルを調整
      const calendarElement = calendarRef.current;
      const originalOverflow = calendarElement.style.overflow;
      
      // エクスポート用クラスを追加
      calendarElement.classList.add('calendar-export');
      calendarElement.style.overflow = 'visible';

      const canvas = await html2canvas(calendarElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        width: 800, // 最小幅を確保
        height: calendarElement.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        allowTaint: true,
        foreignObjectRendering: true,
      });

      // スタイルを元に戻す
      calendarElement.classList.remove('calendar-export');
      calendarElement.style.overflow = originalOverflow;

      // 画像をダウンロード
      const link = document.createElement('a');
      link.download = `calendar_${format(currentDate, 'yyyy-MM')}.png`;
      link.href = canvas.toDataURL();
      link.click();

      toast({
        title: "成功",
        description: "カレンダー画像をダウンロードしました",
      });
    } catch (error) {
      console.error('画像生成エラー:', error);
      toast({
        title: "エラー",
        description: "画像の生成に失敗しました",
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
                size="sm"
                className="bg-ocean-500 text-white hover:bg-ocean-600 px-3 py-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">新規</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-3 sm:px-4 py-4">
        {/* Calendar Controls */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl sm:text-2xl font-bold text-ocean-900">
              {format(currentDate, 'yyyy年M月')}
            </h2>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
                className="p-2 text-ocean-600 hover:text-ocean-500 hover:bg-ocean-100"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="p-2 text-ocean-600 hover:text-ocean-500 hover:bg-ocean-100"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Mobile操作ガイド */}
          <div className="text-xs text-ocean-600 bg-ocean-50 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <UserCheck className="h-3 w-3" />
              <span>日付を長押しでリーダー設定</span>
            </div>
          </div>
        </div>

        {/* Calendar Grid - スマホでは1列表示 */}
        <div className="space-y-4">
          <div ref={calendarRef}>
            <CalendarGrid
              currentDate={currentDate}
              trainingSessions={trainingSessions}
              onDateClick={handleDateClick}
              onLeaderSet={handleLeaderSet}
              isLoading={isLoading}
            />
          </div>

          {/* Sidebar - スマホでは下に表示 */}
          <div className="lg:hidden">
            <TrainingSidebar />
          </div>
        </div>
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
