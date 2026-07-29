import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from 'recharts';
import { BarChart as BarChartIcon } from 'lucide-react';

export interface ChartDayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface MonthlyMacroChartProps {
  data: ChartDayData[];
  calorieGoal: number;
}

export const MonthlyMacroChart: React.FC<MonthlyMacroChartProps> = ({ data, calorieGoal }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-neutral-800 border border-neutral-700/80 rounded-2xl p-8 text-center">
        <BarChartIcon className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-neutral-400 font-cairo">لا توجد بيانات تحليلية كافية بعد</h3>
        <p className="text-xs text-neutral-500 mt-1">سجل وجباتك يومياً لمتابعة مخطط السعرات والماكروز الشهرية</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-800 border border-neutral-700/80 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <BarChartIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-cairo">التحليلات والمخطط البياني للماكروز والسعرات</h3>
            <p className="text-xs text-neutral-400">متابعة السعرات والبروتين والكاربوهيدرات والدهون عبر الوقت</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-400"></span>
            <span className="text-neutral-300">السعرات</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400"></span>
            <span className="text-neutral-300">البروتين (ج)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400"></span>
            <span className="text-neutral-300">الكاربوهيدرات (ج)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-400"></span>
            <span className="text-neutral-300">الدهون (ج)</span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorProtein" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#4ade80" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
            <XAxis dataKey="date" stroke="#737373" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
            <YAxis stroke="#737373" tick={{ fill: '#a3a3a3', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#171717',
                borderColor: '#404040',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '12px',
                direction: 'rtl',
              }}
            />
            <Legend />

            <ReferenceLine
              y={calorieGoal}
              label={{ value: 'الهدف اليومي', fill: '#38bdf8', fontSize: 11 }}
              stroke="#38bdf8"
              strokeDasharray="4 4"
            />

            <Area
              type="monotone"
              dataKey="calories"
              name="السعرات"
              stroke="#38bdf8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCalories)"
            />
            <Area
              type="monotone"
              dataKey="protein"
              name="البروتين (جرام)"
              stroke="#4ade80"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorProtein)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
