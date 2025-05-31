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
import { generateCalendarDays, getTrainingTypeLabel } from "@/lib/utils";
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
    try {
      console.log('カスタム画像エクスポート開始...');
      
      // カレンダーデータを取得
      console.log('カレンダーデータ取得中...');
      const calendarDays = generateCalendarDays(currentDate);
      console.log('カレンダー日数:', calendarDays.length);
      
      const monthName = format(currentDate, 'yyyy年MM月');
      console.log('月名:', monthName);
      
      // トレーニングセッションのデータチェック
      console.log('トレーニングセッション数:', trainingSessions?.length || 0);
      console.log('最初のセッション:', trainingSessions?.[0]);
      
      // キャンバスを作成
      console.log('キャンバス作成中...');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('キャンバスコンテキストの取得に失敗しました');
      }
      console.log('キャンバス作成完了');

      // キャンバスのサイズを設定（横長にして文字が見やすくする）
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
          const sessions = trainingSessions.filter(session => session.date === calendarDay.dateString);
          
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

            // セッションテキストを描画（文字数制限なしで完全表示）
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Arial, sans-serif';
            ctx.textAlign = 'left';
            
            // テキストがセル幅を超える場合は折り返し
            const maxWidth = cellWidth - 12;
            if (ctx.measureText(displayText).width > maxWidth) {
              const words = displayText.split('');
              let line = '';
              let testLine = '';
              
              for (let n = 0; n < words.length; n++) {
                testLine = line + words[n];
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                  ctx.fillText(line, x + 6, sessionY - 2);
                  line = words[n];
                } else {
                  line = testLine;
                }
              }
              ctx.fillText(line, x + 6, sessionY - 2);
            } else {
              ctx.fillText(displayText, x + 6, sessionY - 2);
            }
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
      
      // DataURLとして画像を取得
      const dataURL = canvas.toDataURL('image/png', 1.0);
      console.log('画像データURL生成中...');
      
      if (!dataURL || dataURL === 'data:,') {
        console.error('データURL生成に失敗しました');
        toast({
          title: "エラー",
          description: "画像データの生成に失敗しました",
          variant: "destructive",
        });
        return;
      }
      
      console.log('データURL生成成功、長さ:', dataURL.length);
      
      // データURLをコピー用の形式に変換
      const imageData = dataURL.split(',')[1]; // data:image/png;base64, を除去
      
      // 画像を新しいウィンドウで表示
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>カレンダー画像 - ${format(currentDate, 'yyyy年MM月')}</title>
              <style>
                body { 
                  margin: 0; 
                  padding: 20px; 
                  font-family: 'Helvetica Neue', Arial, sans-serif; 
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                  min-height: 100vh;
                  display: flex; 
                  flex-direction: column; 
                  align-items: center; 
                  justify-content: center;
                }
                .container {
                  background: white;
                  border-radius: 12px;
                  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                  padding: 30px;
                  max-width: 90%;
                  text-align: center;
                }
                h1 { 
                  color: #333; 
                  margin-bottom: 20px; 
                  font-size: 28px;
                  font-weight: 300;
                }
                .image-container {
                  margin: 20px 0;
                  border-radius: 8px;
                  overflow: hidden;
                  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
                }
                img { 
                  max-width: 100%; 
                  height: auto; 
                  display: block;
                }
                .buttons {
                  display: flex;
                  gap: 15px;
                  justify-content: center;
                  flex-wrap: wrap;
                  margin-top: 25px;
                }
                .btn {
                  padding: 12px 24px;
                  border: none;
                  border-radius: 6px;
                  cursor: pointer;
                  text-decoration: none;
                  display: inline-block;
                  font-size: 14px;
                  font-weight: 500;
                  transition: all 0.2s ease;
                  min-width: 120px;
                }
                .btn-primary {
                  background: #4CAF50;
                  color: white;
                }
                .btn-primary:hover {
                  background: #45a049;
                  transform: translateY(-1px);
                }
                .btn-secondary {
                  background: #2196F3;
                  color: white;
                }
                .btn-secondary:hover {
                  background: #1976D2;
                  transform: translateY(-1px);
                }
                .instructions {
                  margin-top: 20px;
                  color: #666;
                  line-height: 1.6;
                  max-width: 500px;
                  font-size: 14px;
                }
                .copy-section {
                  margin-top: 20px;
                  padding: 15px;
                  background: #f8f9fa;
                  border-radius: 6px;
                  border-left: 4px solid #2196F3;
                }
                .copy-text {
                  font-family: monospace;
                  font-size: 12px;
                  color: #666;
                  margin: 10px 0;
                  word-break: break-all;
                  max-height: 100px;
                  overflow-y: auto;
                  padding: 8px;
                  background: white;
                  border: 1px solid #ddd;
                  border-radius: 4px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🏊‍♀️ スイミングカレンダー</h1>
                <h2>${format(currentDate, 'yyyy年MM月')}</h2>
                
                <div class="image-container">
                  <img src="${dataURL}" alt="カレンダー画像" id="calendarImage" />
                </div>
                
                <div class="buttons">
                  <a href="${dataURL}" download="calendar_${format(currentDate, 'yyyy-MM')}.png" class="btn btn-primary" onclick="handleDownload()">
                    📥 画像をダウンロード
                  </a>
                  <button class="btn btn-secondary" onclick="copyImageData()">
                    📋 画像データをコピー
                  </button>
                </div>
                
                <div class="instructions">
                  <p><strong>保存方法：</strong></p>
                  <p>1. 「画像をダウンロード」ボタンをクリック</p>
                  <p>2. または画像を右クリック → 「名前を付けて画像を保存」</p>
                  <p>3. 「画像データをコピー」でBase64データをコピーして他のアプリで使用</p>
                </div>
                
                <div class="copy-section">
                  <p><strong>画像データ（Base64）:</strong></p>
                  <div class="copy-text" id="imageDataText">${imageData.substring(0, 100)}...</div>
                  <small>クリックして全文をコピー</small>
                </div>
              </div>
              
              <script>
                function handleDownload() {
                  console.log('ダウンロードボタンがクリックされました');
                  // ボタンクリック時に追加の処理があれば記述
                }
                
                function copyImageData() {
                  const fullData = '${imageData}';
                  navigator.clipboard.writeText(fullData).then(function() {
                    alert('画像データをクリップボードにコピーしました！');
                  }).catch(function() {
                    // フォールバック: テキストエリアを使用
                    const textarea = document.createElement('textarea');
                    textarea.value = fullData;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    alert('画像データをクリップボードにコピーしました！');
                  });
                }
                
                // データテキストをクリックした時の処理
                document.getElementById('imageDataText').onclick = function() {
                  copyImageData();
                };
              </script>
            </body>
          </html>
        `);
        newWindow.document.close();
        
        console.log('新しいタブで画像を開きました');
        
        toast({
          title: "成功",
          description: "新しいタブで画像を開きました。ダウンロードボタンまたは右クリックで保存してください。",
          duration: 5000,
        });
      } else {
        // ポップアップがブロックされた場合のシンプルな表示
        console.log('ポップアップがブロックされました。シンプル表示を使用...');
        
        // 直接ダウンロードを試行
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `calendar_${format(currentDate, 'yyyy-MM')}.png`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "ダウンロード開始",
          description: "画像のダウンロードを開始しました。ダウンロードフォルダを確認してください。",
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('画像生成エラー:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      console.error('エラーメッセージ:', errorMessage);
      toast({
        title: "エラー",
        description: `画像の生成に失敗しました: ${errorMessage}`,
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
