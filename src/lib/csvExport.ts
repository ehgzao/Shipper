// CSV Export Utility

export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle different value types
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        if (typeof value === 'string') {
          // Escape quotes and wrap in quotes if contains comma or newline
          const escaped = value.replace(/"/g, '""');
          return value.includes(',') || value.includes('\n') || value.includes('"') 
            ? `"${escaped}"` 
            : escaped;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Format audit logs for export
export const formatAuditLogsForExport = (logs: Array<{
  id: string;
  user_id: string;
  email: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}>) => {
  return logs.map(log => ({
    id: log.id,
    user_id: log.user_id,
    email: log.email || 'Unknown',
    action: log.action,
    details: JSON.stringify(log.details),
    created_at: log.created_at
  }));
};

// Format login attempts for export
export const formatLoginAttemptsForExport = (logins: Array<{
  email: string;
  success: boolean;
  ip_address: string | null;
  created_at: string;
}>) => {
  return logins.map(login => ({
    email: login.email,
    status: login.success ? 'Success' : 'Failed',
    ip_address: login.ip_address || 'N/A',
    created_at: login.created_at
  }));
};

// Format locked accounts for export
export const formatLockedAccountsForExport = (accounts: Array<{
  email: string;
  locked_until: string;
  failed_attempts: number;
  created_at: string;
}>) => {
  return accounts.map(account => ({
    email: account.email,
    failed_attempts: account.failed_attempts,
    locked_until: account.locked_until,
    created_at: account.created_at
  }));
};

// Generate security report
export const generateSecurityReport = (stats: {
  failed_logins_today: number;
  successful_logins_today: number;
  locked_accounts: number;
  active_sessions: number;
  locked_account_details: Array<{
    email: string;
    locked_until: string;
    failed_attempts: number;
    created_at: string;
  }> | null;
  recent_logins: Array<{
    email: string;
    success: boolean;
    ip_address: string | null;
    created_at: string;
  }> | null;
}) => {
  const report = [
    { metric: 'Report Generated', value: new Date().toISOString() },
    { metric: 'Successful Logins Today', value: String(stats.successful_logins_today) },
    { metric: 'Failed Logins Today', value: String(stats.failed_logins_today) },
    { metric: 'Currently Locked Accounts', value: String(stats.locked_accounts) },
    { metric: 'Active Sessions (24h)', value: String(stats.active_sessions) },
    { metric: '', value: '' },
    { metric: '--- Locked Accounts ---', value: '' },
  ];

  if (stats.locked_account_details && stats.locked_account_details.length > 0) {
    stats.locked_account_details.forEach(account => {
      report.push({
        metric: account.email,
        value: `${account.failed_attempts} attempts, locked until ${account.locked_until}`
      });
    });
  } else {
    report.push({ metric: 'No locked accounts', value: '' });
  }

  report.push({ metric: '', value: '' });
  report.push({ metric: '--- Recent Failed Logins ---', value: '' });

  const failedLogins = stats.recent_logins?.filter(l => !l.success) || [];
  if (failedLogins.length > 0) {
    failedLogins.forEach(login => {
      report.push({
        metric: login.email,
        value: `IP: ${login.ip_address || 'N/A'}, Time: ${login.created_at}`
      });
    });
  } else {
    report.push({ metric: 'No recent failed logins', value: '' });
  }

  return report;
};
