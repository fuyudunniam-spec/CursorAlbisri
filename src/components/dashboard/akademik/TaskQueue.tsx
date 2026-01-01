import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface TaskItem {
  id: string;
  type: 'agenda_no_pertemuan' | 'pertemuan_no_presensi' | 'nilai_not_published' | 'nilai_locked_not_published';
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  actionLabel: string;
  actionPath: string;
  priority?: 'high' | 'medium' | 'low';
  disabled?: boolean;
  disabledReason?: string;
}

interface TaskQueueProps {
  tasks: TaskItem[];
  loading?: boolean;
  maxItems?: number;
}

export const TaskQueue: React.FC<TaskQueueProps> = ({
  tasks,
  loading = false,
  maxItems = 20,
}) => {
  const navigate = useNavigate();
  const displayedTasks = tasks.slice(0, maxItems);

  const getTaskIcon = (type: TaskItem['type']) => {
    switch (type) {
      case 'agenda_no_pertemuan':
        return Calendar;
      case 'pertemuan_no_presensi':
        return AlertCircle;
      case 'nilai_not_published':
        return FileText;
      case 'nilai_locked_not_published':
        return FileText;
      default:
        return AlertCircle;
    }
  };

  const getTaskBadgeVariant = (priority?: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Perlu Tindakan</CardTitle>
          <CardDescription className="text-xs">Daftar tugas yang memerlukan perhatian</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span className="text-sm">Memuat...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Perlu Tindakan</CardTitle>
        <CardDescription className="text-xs">
          {tasks.length > 0
            ? `${tasks.length} tugas memerlukan perhatian`
            : 'Tidak ada tugas yang perlu ditindaklanjuti'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {displayedTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Tidak ada tugas yang perlu ditindaklanjuti</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedTasks.map((task) => {
              const Icon = getTaskIcon(task.type);
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        {task.subtitle && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {task.subtitle}
                          </p>
                        )}
                      </div>
                      {task.priority && (
                        <Badge variant={getTaskBadgeVariant(task.priority)} className="text-xs flex-shrink-0">
                          {task.priority === 'high' ? 'Tinggi' : task.priority === 'medium' ? 'Sedang' : 'Rendah'}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(task.actionPath)}
                        disabled={task.disabled}
                        className="h-7 text-xs"
                      >
                        {task.actionLabel}
                      </Button>
                      {task.disabled && task.disabledReason && (
                        <p className="text-xs text-amber-600 mt-1">{task.disabledReason}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {tasks.length > maxItems && (
              <div className="text-center pt-2">
                <p className="text-xs text-gray-500">
                  dan {tasks.length - maxItems} tugas lainnya...
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

