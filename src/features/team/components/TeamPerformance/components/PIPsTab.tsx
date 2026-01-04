import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { 
  ClipboardCheck, 
  Plus,
  Calendar,
  Target,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  FileText,
} from "lucide-react";
import type { PerformanceImprovementPlan, PIPGoal, PIPMilestone } from "@/features/team/types";

export const PIPsTab: React.FC = () => {
  const { 
    teamPerformance,
    updatePIP,
  } = usePerformanceStore();

  const [selectedPIP, setSelectedPIP] = useState<{
    memberId: string;
    pip: PerformanceImprovementPlan;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const performanceArray = Array.from(teamPerformance.values());

  // Get members with active PIPs
  const membersWithPIPs = performanceArray.filter(p => p.active_pip);

  // Calculate days remaining/elapsed
  const getDaysInfo = (pip: PerformanceImprovementPlan) => {
    const start = new Date(pip.start_date);
    const end = new Date(pip.end_date);
    const now = new Date();
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysElapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const percentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
    
    return { totalDays, daysElapsed, daysRemaining, percentage };
  };

  // Calculate goal progress
  const getGoalProgress = (goal: PIPGoal) => {
    if (goal.is_met) return 100;
    if (goal.target_value && goal.current_value !== undefined) {
      return Math.min(100, (goal.current_value / goal.target_value) * 100);
    }
    return 0;
  };

  // Handle milestone toggle
  const handleMilestoneToggle = async (milestoneId: string) => {
    if (!selectedPIP) return;
    setIsUpdating(true);
    try {
      const updatedMilestones = selectedPIP.pip.milestones.map(m => 
        m.id === milestoneId 
          ? { ...m, completed: !m.completed, completed_at: !m.completed ? new Date().toISOString() : undefined }
          : m
      );
      await updatePIP(selectedPIP.pip.id, { milestones: updatedMilestones });
      setSelectedPIP({
        ...selectedPIP,
        pip: { ...selectedPIP.pip, milestones: updatedMilestones },
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle goal toggle
  const handleGoalToggle = async (goalId: string) => {
    if (!selectedPIP) return;
    setIsUpdating(true);
    try {
      const updatedGoals = selectedPIP.pip.goals.map(g => 
        g.id === goalId ? { ...g, is_met: !g.is_met } : g
      );
      await updatePIP(selectedPIP.pip.id, { goals: updatedGoals });
      setSelectedPIP({
        ...selectedPIP,
        pip: { ...selectedPIP.pip, goals: updatedGoals },
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if milestone is overdue
  const isOverdue = (milestone: PIPMilestone) => {
    return !milestone.completed && new Date(milestone.due_date) < new Date();
  };

  // Check if milestone is due today
  const isDueToday = (milestone: PIPMilestone) => {
    const today = new Date().toDateString();
    return !milestone.completed && new Date(milestone.due_date).toDateString() === today;
  };

  return (
    <div className="space-y-6">
      {/* Active PIPs */}
      {membersWithPIPs.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">
            Active Performance Improvement Plans
          </h3>
          
          {membersWithPIPs.map((member) => {
            const pip = member.active_pip!;
            const daysInfo = getDaysInfo(pip);
            const goalsCompleted = pip.goals.filter(g => g.is_met).length;
            const milestonesCompleted = pip.milestones.filter(m => m.completed).length;
            
            return (
              <div
                key={member.team_member_id}
                className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {member.team_member.first_name?.[0]}{member.team_member.last_name?.[0]}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {member.team_member.first_name} {member.team_member.last_name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                          ACTIVE
                        </span>
                        <span>Started {formatDate(pip.start_date)}</span>
                        <span>•</span>
                        <span>Review {formatDate(pip.end_date)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => setSelectedPIP({ memberId: member.team_member_id, pip })}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Day {daysInfo.daysElapsed} of {daysInfo.totalDays}</span>
                    <span>{daysInfo.daysRemaining} days remaining</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        daysInfo.percentage > 75 ? 'bg-rose-500' :
                        daysInfo.percentage > 50 ? 'bg-amber-500' : 'bg-purple-500'
                      }`}
                      style={{ width: `${daysInfo.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-500">Goals</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {goalsCompleted} / {pip.goals.length}
                    </div>
                  </div>
                  <div className="p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-500">Milestones</span>
                    </div>
                    <div className="text-lg font-semibold text-white">
                      {milestonesCompleted} / {pip.milestones.length}
                    </div>
                  </div>
                </div>

                {/* Upcoming/Overdue Milestones Preview */}
                {pip.milestones.filter(m => !m.completed).slice(0, 2).map((milestone) => (
                  <div 
                    key={milestone.id}
                    className={`mt-3 p-2 rounded-lg text-xs flex items-center gap-2 ${
                      isOverdue(milestone) 
                        ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                        : isDueToday(milestone)
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          : 'bg-gray-800/50 text-gray-400'
                    }`}
                  >
                    {isOverdue(milestone) ? (
                      <AlertTriangle className="w-3 h-3" />
                    ) : isDueToday(milestone) ? (
                      <Clock className="w-3 h-3" />
                    ) : (
                      <Calendar className="w-3 h-3" />
                    )}
                    <span className="font-medium">{formatDate(milestone.due_date)}</span>
                    <span>—</span>
                    <span className="truncate">{milestone.description}</span>
                    {isOverdue(milestone) && <span className="ml-auto font-medium">OVERDUE</span>}
                    {isDueToday(milestone) && <span className="ml-auto font-medium">DUE TODAY</span>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/30">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
            <ClipboardCheck className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Active PIPs</h3>
          <p className="text-gray-400 text-sm mb-4">
            Performance Improvement Plans are created when team members reach Stage 3+ coaching.
          </p>
          <button className="btn-ghost text-sm" disabled>
            <Plus className="w-4 h-4 mr-2" />
            Create PIP
          </button>
        </div>
      )}

      {/* PIP Detail Modal */}
      {selectedPIP && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2b] rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const member = teamPerformance.get(selectedPIP.memberId);
              const pip = selectedPIP.pip;
              const daysInfo = getDaysInfo(pip);
              
              return (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {member?.team_member.first_name?.[0]}{member?.team_member.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="text-lg font-medium text-white">
                          {member?.team_member.first_name} {member?.team_member.last_name}
                        </div>
                        <div className="text-sm text-purple-400">Performance Improvement Plan</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedPIP(null)} 
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-6">
                    {/* Timeline */}
                    <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700/30">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">
                          Started {formatDate(pip.start_date)}
                        </span>
                        <span className={`font-medium ${
                          daysInfo.daysRemaining <= 7 ? 'text-rose-400' : 'text-gray-300'
                        }`}>
                          {daysInfo.daysRemaining} days remaining
                        </span>
                        <span className="text-gray-400">
                          Review {formatDate(pip.end_date)}
                        </span>
                      </div>
                      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            daysInfo.percentage > 75 ? 'bg-rose-500' :
                            daysInfo.percentage > 50 ? 'bg-amber-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${daysInfo.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Goals */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Target className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-medium text-white">Goals</h4>
                      </div>
                      <div className="space-y-2">
                        {pip.goals.map((goal) => (
                          <div 
                            key={goal.id}
                            className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                onClick={() => handleGoalToggle(goal.id)}
                                disabled={isUpdating}
                                className="flex items-center gap-3 text-left"
                              >
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                  goal.is_met
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-gray-600'
                                }`}>
                                  {goal.is_met && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-sm ${goal.is_met ? 'text-gray-400 line-through' : 'text-white'}`}>
                                  {goal.description}
                                </span>
                              </button>
                              {goal.target_value && (
                                <span className="text-xs text-gray-500">
                                  {goal.current_value || 0} / {goal.target_value}
                                </span>
                              )}
                            </div>
                            {goal.target_value && !goal.is_met && (
                              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500 transition-all"
                                  style={{ width: `${getGoalProgress(goal)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Milestones */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-medium text-white">Milestones</h4>
                      </div>
                      <div className="space-y-2">
                        {pip.milestones.map((milestone) => (
                          <button
                            key={milestone.id}
                            onClick={() => handleMilestoneToggle(milestone.id)}
                            disabled={isUpdating}
                            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                              milestone.completed
                                ? 'bg-green-500/10 border-green-500/30'
                                : isOverdue(milestone)
                                  ? 'bg-rose-500/10 border-rose-500/30'
                                  : isDueToday(milestone)
                                    ? 'bg-amber-500/10 border-amber-500/30'
                                    : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                milestone.completed
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-600'
                              }`}>
                                {milestone.completed && <CheckCircle className="w-3 h-3 text-white" />}
                              </div>
                              <div className="text-left">
                                <div className={`text-sm ${milestone.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                                  {milestone.description}
                                </div>
                                {milestone.notes && (
                                  <div className="text-xs text-gray-500">{milestone.notes}</div>
                                )}
                              </div>
                            </div>
                            <div className={`text-xs font-medium ${
                              milestone.completed ? 'text-green-400' :
                              isOverdue(milestone) ? 'text-rose-400' :
                              isDueToday(milestone) ? 'text-amber-400' : 'text-gray-500'
                            }`}>
                              {milestone.completed 
                                ? `✓ ${formatDate(milestone.completed_at!)}`
                                : isOverdue(milestone)
                                  ? `OVERDUE ${formatDate(milestone.due_date)}`
                                  : isDueToday(milestone)
                                    ? 'DUE TODAY'
                                    : formatDate(milestone.due_date)
                              }
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    {pip.notes && (
                      <div className="p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                        <div className="text-xs text-gray-500 mb-1">Notes</div>
                        <div className="text-sm text-gray-300">{pip.notes}</div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between gap-2 p-4 border-t border-gray-700">
                    <button className="btn-ghost">
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Progress Report
                    </button>
                    <button className="btn-ghost">
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Check-in
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PIPsTab;
