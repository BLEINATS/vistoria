export const getConditionStyle = (condition: string): string => {
  switch (condition) {
    case 'new':
    case 'excellent':
      return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
    case 'good':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
    case 'worn':
    case 'fair':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
    case 'damaged':
    case 'poor':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
    case 'not_found':
      return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 font-bold';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
  }
};

export const getSeverityStyle = (severity: string): string => {
    switch (severity) {
        case 'low': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300';
        case 'medium': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300';
        case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
        case 'critical': return 'bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200';
        default: return 'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-slate-200';
    }
};
