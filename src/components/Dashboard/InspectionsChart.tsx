import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../contexts/ThemeContext';

interface InspectionsChartProps {
  data: Array<{
    month: string;
    entry: number;
    exit: number;
  }>;
}

const InspectionsChart: React.FC<InspectionsChartProps> = ({ data }) => {
  const { theme } = useTheme();

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow',
      },
    },
    legend: {
      data: ['Entrada', 'Saída'],
      textStyle: {
        color: theme === 'dark' ? '#ccc' : '#333',
      },
      bottom: 10,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        data: data.map(item => item.month),
        axisTick: {
          alignWithLabel: true,
        },
        axisLabel: {
          color: theme === 'dark' ? '#A0AEC0' : '#4A5568',
        },
      },
    ],
    yAxis: [
      {
        type: 'value',
        axisLabel: {
          color: theme === 'dark' ? '#A0AEC0' : '#4A5568',
        },
        splitLine: {
          lineStyle: {
            color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
    ],
    series: [
      {
        name: 'Entrada',
        type: 'bar',
        barWidth: '30%',
        data: data.map(item => item.entry),
        itemStyle: {
          color: '#3b82f6', // blue-500
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: 'Saída',
        type: 'bar',
        barWidth: '30%',
        data: data.map(item => item.exit),
        itemStyle: {
          color: '#10b981', // green-500
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
    dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
    ],
  };

  return <ReactECharts option={option} style={{ height: '400px', width: '100%' }} theme={theme === 'dark' ? 'dark' : undefined} />;
};

export default InspectionsChart;
