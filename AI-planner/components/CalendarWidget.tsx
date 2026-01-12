import React, { useState } from 'react';
import { Task } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarWidgetProps {
  tasks: Task[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string | null;
}

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ tasks, onDateSelect, selectedDate }) => {
  const [viewOffset, setViewOffset] = useState(0);
  const currentDate = new Date();
  
  // Show 3 months based on current offset
  const monthsToShow = [0, 1, 2].map(offset => offset + viewOffset);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  
  // Adjust so 0 = Monday, 6 = Sunday
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; 
  };

  const getMonthData = (offset: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      name: d.toLocaleString('sv-SE', { month: 'long' }),
    };
  };

  const hasTaskOnDate = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.some(t => t.deadline && t.deadline.startsWith(dateStr) && !t.isCompleted);
  };

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date();
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  };

  const handlePrev = () => setViewOffset(prev => prev - 1);
  const handleNext = () => setViewOffset(prev => prev + 1);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2 px-1">
          <button 
            onClick={handlePrev} 
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
              <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 font-medium">Bläddra</span>
          <button 
            onClick={handleNext}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
          >
              <ChevronRight className="w-4 h-4" />
          </button>
      </div>

      <div className="space-y-6">
        {monthsToShow.map((offset) => {
            const { year, month, name } = getMonthData(offset);
            const daysInMonth = getDaysInMonth(year, month);
            const firstDay = getFirstDayOfMonth(year, month);
            const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
            const empties = Array.from({ length: firstDay }, (_, i) => i);

            return (
            <div key={`${year}-${month}`} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-slate-300 capitalize mb-3 flex justify-between items-center">
                {name} <span className="text-slate-600 text-xs">{year}</span>
                </h3>
                
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                {['M', 'T', 'O', 'T', 'F', 'L', 'S'].map((d, i) => (
                    <div key={i} className={`font-bold ${i >= 5 ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>
                ))}
                </div>

                <div className="grid grid-cols-7 gap-1 text-center">
                {empties.map(i => (
                    <div key={`empty-${i}`} className="h-8"></div>
                ))}
                {days.map(day => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const hasTask = hasTaskOnDate(year, month, day);
                    const today = isToday(year, month, day);
                    const dateObj = new Date(year, month, day);
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday=0, Saturday=6
                    const isSelected = selectedDate === dateStr;

                    return (
                    <div 
                        key={day}
                        onClick={() => onDateSelect && onDateSelect(dateStr)}
                        className={`
                        h-8 flex flex-col items-center justify-center rounded-md text-xs relative cursor-pointer transition-all border
                        ${isSelected ? 'bg-primary/20 border-white ring-1 ring-white' : 'border-transparent'}
                        ${today && !isSelected
                            ? 'bg-primary text-white font-bold' 
                            : ''}
                        ${!today && !isSelected
                            ? isWeekend 
                                ? 'text-red-400 hover:bg-slate-800' 
                                : 'text-slate-400 hover:bg-slate-800'
                            : ''}
                        `}
                    >
                        {day}
                        {hasTask && !today && !isSelected && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-red-400"></div>
                        )}
                        {hasTask && (today || isSelected) && (
                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-white"></div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
            );
        })}
      </div>
    </div>
  );
};

export default CalendarWidget;