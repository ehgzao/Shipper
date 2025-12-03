import { AlertTriangle, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays } from "date-fns";

interface TargetCompany {
  id: string;
  company_name: string;
  careers_url: string | null;
  last_checked_at: string | null;
}

interface TargetCompanyNotificationProps {
  companies: TargetCompany[];
  verificationDays: number;
  onCheckCareers: (companyId: string, careersUrl: string) => void;
  onDismiss: () => void;
}

export const TargetCompanyNotification = ({
  companies,
  verificationDays,
  onCheckCareers,
  onDismiss,
}: TargetCompanyNotificationProps) => {
  const now = new Date();
  
  const uncheckedCompanies = companies.filter((company) => {
    if (!company.careers_url) return false;
    if (!company.last_checked_at) return true;
    
    const lastChecked = new Date(company.last_checked_at);
    const daysSinceCheck = differenceInDays(now, lastChecked);
    return daysSinceCheck >= verificationDays;
  });

  if (uncheckedCompanies.length === 0) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h3 className="font-medium text-sm text-amber-800 dark:text-amber-200">
            {uncheckedCompanies.length} companies not checked in {verificationDays}+ days
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2 max-h-[150px] overflow-y-auto">
        {uncheckedCompanies.slice(0, 5).map((company) => {
          const daysSince = company.last_checked_at
            ? differenceInDays(now, new Date(company.last_checked_at))
            : null;

          return (
            <div
              key={company.id}
              className="flex items-center justify-between bg-background/60 rounded-lg p-2 px-3"
            >
              <div className="flex-1 min-w-0">
                <span className="font-medium text-sm truncate block">
                  {company.company_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {daysSince !== null ? `${daysSince} days ago` : "Never checked"}
                </span>
              </div>
              {company.careers_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => onCheckCareers(company.id, company.careers_url!)}
                >
                  <ExternalLink className="h-3 w-3" />
                  Check
                </Button>
              )}
            </div>
          );
        })}
        {uncheckedCompanies.length > 5 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 text-center py-1">
            And {uncheckedCompanies.length - 5} more...
          </p>
        )}
      </div>
    </div>
  );
};
