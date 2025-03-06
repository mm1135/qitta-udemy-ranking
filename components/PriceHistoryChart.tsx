'use client';

import { useEffect, useRef } from 'react';
import { Chart, registerables, ChartType } from 'chart.js';
import { PriceHistory } from '@/types';

Chart.register(...registerables);

interface PriceHistoryChartProps {
  priceHistory: PriceHistory[];
}

export default function PriceHistoryChart({ priceHistory }: PriceHistoryChartProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (chartRef.current && priceHistory.length > 0) {
      // 既存のチャートがあれば破棄
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // データを日付順に並べ替え
      const sortedData = [...priceHistory].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // チャートデータの準備
      const labels = sortedData.map(item => 
        new Date(item.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      );
      const prices = sortedData.map(item => item.price);

      // チャート作成
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        chartInstance.current = new Chart(ctx, {
          type: 'line' as ChartType,
          data: {
            labels,
            datasets: [{
              label: '価格 (円)',
              data: prices,
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function(context: any) {
                    return `¥${context.parsed.y.toLocaleString()}`;
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                ticks: {
                  callback: function(value: any) {
                    return '¥' + value.toLocaleString();
                  }
                }
              }
            }
          }
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [priceHistory]);

  return (
    <div className="w-full h-full">
      <canvas ref={chartRef} />
    </div>
  );
} 