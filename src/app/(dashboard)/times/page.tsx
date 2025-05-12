'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { format, addMonths, setDate } from 'date-fns';

interface CountdownItem {
  id: string;
  title: string;
  createdAt: Date;
  targetDate: Date;
  emoji: string;
  type?: 'salary' | 'normal';
}

export default function TimesPage() {
  const startDate = new Date('2025-05-12');

  // Hàm tính ngày lương tiếp theo (ngày 5 tháng sau)
  const calculateNextSalaryDate = (fromDate: Date) => {
    const nextMonth = addMonths(fromDate, 1);  // Tháng tiếp theo
    return setDate(nextMonth, 5);  // Set ngày 5
  };

  const [countdowns] = useState<CountdownItem[]>([
    {
      id: '1',
      title: 'Luong',
      createdAt: startDate,
      targetDate: calculateNextSalaryDate(startDate),
      emoji: '💰',
      type: 'salary'
    },
    {
      id: '2',
      title: 'Mua xe',
      createdAt: startDate,
      targetDate: new Date('2025-09-05'),
      emoji: '🚗',
    },
    {
      id: '3',
      title: 'Mua nhà',
      createdAt: startDate,
      targetDate: new Date('2030-05-15'),
      emoji: '📊',
    },
  ]);

  const [timeLeft, setTimeLeft] = useState<Record<string, { 
    remainingDays: number;
    totalPeriodDays: number;
    progress: number;
  }>>({});

  const getColorByRemainingDays = (remainingDays: number) => {
    // Nếu còn dưới 30 ngày (1 tháng) -> đỏ
    if (remainingDays <= 30) {
      return {
        card: 'bg-red-100 border-red-500',
        text: 'text-red-700',
        progress: 'bg-red-600'
      };
    }
    // Nếu còn dưới 90 ngày (3 tháng) -> cam
    if (remainingDays <= 90) {
      return {
        card: 'bg-orange-100 border-orange-500',
        text: 'text-orange-700',
        progress: 'bg-orange-600'
      };
    }
    // Còn lại -> xanh
    return {
      card: 'bg-green-100 border-green-500',
      text: 'text-green-700',
      progress: 'bg-green-600'
    };
  };

  useEffect(() => {
    const calculateTimeLeft = () => {
      const newTimeLeft: Record<string, any> = {};
      const now = new Date();
      
      countdowns.forEach((countdown) => {
        let targetDate = countdown.targetDate;

        // Nếu là item lương, tự động tính lại target date
        if (countdown.type === 'salary') {
          // Nếu đã qua ngày 5 tháng này, target sẽ là ngày 5 tháng sau
          // Nếu chưa tới ngày 5, target sẽ là ngày 5 tháng này
          const today = new Date();
          const thisMonth5th = setDate(today, 5);
          
          if (today > thisMonth5th) {
            targetDate = calculateNextSalaryDate(today);
          } else {
            targetDate = thisMonth5th;
          }
        }

        const targetTime = targetDate.getTime();
        const difference = targetTime - now.getTime();
        const remainingDays = Math.ceil(difference / (1000 * 60 * 60 * 24));
        
        if (difference > 0) {
          const totalDays = Math.ceil((targetTime - now.getTime()) / (1000 * 60 * 60 * 24));
          const progress = remainingDays / totalDays;

          newTimeLeft[countdown.id] = {
            remainingDays,
            totalPeriodDays: totalDays,
            progress
          };
        }
      });

      setTimeLeft(newTimeLeft);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [countdowns]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Time Until</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {countdowns.map((countdown) => {
          const timeInfo = timeLeft[countdown.id];
          const colors = timeInfo ? getColorByRemainingDays(timeInfo.remainingDays) : {
            card: 'bg-gray-100 border-gray-500',
            text: 'text-gray-700',
            progress: 'bg-gray-600'
          };
          
          return (
            <Card 
              key={countdown.id} 
              className={`border-2 ${colors.card} transition-colors duration-300`}
            >
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <span className="text-xl md:text-2xl">{countdown.emoji}</span>
                  <h2 className="text-lg md:text-xl font-bold">{countdown.title}</h2>
                  {countdown.type === 'salary' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Auto</span>
                  )}
                </div>

                <div className="space-y-3 md:space-y-4">
                  {timeInfo && (
                    <div className={`text-center p-4 md:p-6 rounded-lg ${colors.card} ${colors.text}`}>
                      <div className="text-3xl md:text-4xl font-bold mb-1 md:mb-2">
                        {timeInfo.remainingDays}
                      </div>
                      <div className="text-xs md:text-sm opacity-75">Days Remaining</div>
                      <div className="mt-1 md:mt-2 text-base md:text-lg font-semibold">
                        {Math.floor(timeInfo.remainingDays / 7)} weeks
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm">
                    <div className="text-gray-500">Created:</div>
                    <div>{format(countdown.createdAt, 'MMM dd, yyyy')}</div>
                    
                    <div className="text-gray-500">Target Date:</div>
                    <div>
                      {countdown.type === 'salary' 
                        ? 'Every 5th of month'
                        : format(countdown.targetDate, 'MMM dd, yyyy')
                      }
                    </div>

                    {timeInfo && (
                      <>
                        <div className="text-gray-500">Total Days:</div>
                        <div>{timeInfo.totalPeriodDays} days</div>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
