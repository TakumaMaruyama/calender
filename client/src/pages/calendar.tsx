import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, User, Waves, Filter } from "lucide-react";
import { CalendarGrid } from "@/components/calendar-grid";
import { TrainingSidebar } from "@/components/training-sidebar";
import { TrainingModal } from "@/components/training-modal";
import type { TrainingSession } from "@shared/schema";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const { data: trainingSessions = [], isLoading } = useQuery<TrainingSession[]>({
    queryKey: ['/api/training-sessions/month', year, month],
    queryFn: () => fetch(`/api/training-sessions/month/${year}/${month}`).then(res => res.json()),
  });

  const todayString = format(new Date(), 'yyyy-MM-dd');
  const { data: todaysSessions = [] } = useQuery<TrainingSession[]>({
    queryKey: ['/api/training-sessions/date', todayString],
    queryFn: () => fetch(`/api/training-sessions/date/${todayString}`).then(res => res.json()),
  });

  const { data: monthStats } = useQuery({
    queryKey: ['/api/statistics/month', year, month],
  });

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

  const handleNewTraining = () => {
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-ocean-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-ocean-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Waves className="text-ocean-500 h-7 w-7" />
                <h1 className="text-xl font-bold text-ocean-900">SwimTracker</h1>
              </div>
              <nav className="hidden md:flex space-x-6">
                <a href="#" className="text-ocean-500 font-medium border-b-2 border-ocean-500 pb-1">
                  カレンダー
                </a>
                <a href="#" className="text-ocean-600 hover:text-ocean-500 transition-colors">
                  選手管理
                </a>
                <a href="#" className="text-ocean-600 hover:text-ocean-500 transition-colors">
                  レポート
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleNewTraining}
                className="bg-ocean-500 text-white hover:bg-ocean-600 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">新規トレーニング</span>
              </Button>
              <div className="w-8 h-8 bg-ocean-500 rounded-full flex items-center justify-center">
                <User className="text-white h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Calendar Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-ocean-900">
              {format(currentDate, 'yyyy年M月')}
            </h2>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviousMonth}
                className="p-2 text-ocean-600 hover:text-ocean-500 hover:bg-ocean-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextMonth}
                className="p-2 text-ocean-600 hover:text-ocean-500 hover:bg-ocean-100"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex bg-white rounded-lg border border-ocean-200 overflow-hidden">
              <Button
                variant={viewMode === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'month' 
                    ? 'bg-ocean-500 text-white' 
                    : 'text-ocean-600 hover:bg-ocean-50'
                }`}
              >
                月間
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'week' 
                    ? 'bg-ocean-500 text-white' 
                    : 'text-ocean-600 hover:bg-ocean-50'
                }`}
              >
                週間
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-ocean-600 hover:text-ocean-500 p-2 hover:bg-white"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Calendar Grid */}
          <div className="lg:col-span-3">
            <CalendarGrid
              currentDate={currentDate}
              trainingSessions={trainingSessions}
              onDateClick={handleDateClick}
              isLoading={isLoading}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <TrainingSidebar
              todaysSessions={todaysSessions}
              monthStats={monthStats}
            />
          </div>
        </div>
      </div>

      {/* Training Modal */}
      <TrainingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}
