import React, { useRef, useLayoutEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type BookingsActivityGraphProps = {
  data: Array<{ date: string; count: number }>;
};

export function BookingsActivityGraph({ data }: BookingsActivityGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Minimum width per tick
  const minTickSpacing = 80;
  const requiredWidth = data.length * minTickSpacing;

  useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  if (!data.length) {
    return (
      <div className="bg-gray-100 h-32 rounded flex items-center justify-center text-gray-400">
        No data for selected range
      </div>
    );
  }

  const yAxisWidth = 20;
  const counts = data.map((d) => d.count);
  const min = Math.min(...counts, 0);
  const max = Math.max(...counts, 5);

  // The chart width: either 100% of parent, or enough for all ticks at min spacing
  const chartWidth = requiredWidth < containerWidth ? '100%' : requiredWidth;

  return (
    <div className="flex w-full" ref={containerRef}>
      {/* Sticky Y-Axis */}
      <div
        className="flex-shrink-0 bg-white border-r border-gray-200 z-10 rounded-l h-40"
        style={{ width: yAxisWidth }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ left: 0, right: 0, top: 10, bottom: 0 }}
          >
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={yAxisWidth}
            />
            {/* Dummy area for height alignment */}
            <Area dataKey="count" fillOpacity={0} strokeOpacity={0} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Scrollable Chart */}
      <div className="overflow-x-auto w-full">
        <div style={{ width: chartWidth, height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ left: 36, right: 36, top: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                minTickGap={0}
                interval={0}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  fontSize: 13,
                }}
                labelStyle={{ color: '#6b7280' }}
                cursor={{ fill: '#fbbf2422' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#fbbf24"
                fillOpacity={1}
                fill="url(#colorBookings)"
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
