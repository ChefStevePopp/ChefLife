import React, { useState } from "react";
import { usePerformanceStore } from "@/stores/performanceStore";
import { 
  MessageSquare, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  ChevronRight,
  X,
  Calendar,
  Users,
} from "lucide-react";
import type { CoachingRecord, CoachingStage } from "@/features/team/types";

interface StageConfig {
  stage: CoachingStage;
  label: string;
  threshold: number;
  description: string;
  color: string;
}

export const CoachingTab: React.FC = () => {
  const { 
    teamPerformance, 
    config,
    updateCoachingRecord,
    generateCoachingLetter,
  } = usePerformanceStore();

  const [selectedRecord, setSelectedRecord] = useState<{
    memberId: string;
    record: CoachingRecord;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const performanceArray = Array.from(teamPerformance.values());

  // Stage configurations
  const stageConfigs: StageConfig[] = [
    { stage: 1, label: "Informal", threshold: config.coaching_thresholds.stage1, description: "Private conversation", color: "amber" },
    { stage: 2, label: "Formal", threshold: config.coaching_thresholds.stage2, description: "Documented coaching", color: "orange" },
    { stage: 3, label: "Final Dev", threshold: config.coaching_thresholds.stage3, description: "Final development plan", color: "rose" },
    { stage: 4, label: "Review", threshold: config.coaching_thresholds.stage4, description: "Employment review", color: "red" },
    { stage: 5, label: "Auto Term", threshold: config.coaching_thresholds.stage5, description: "Automatic termination", color: "red" },
  ];

  // Get members at each coaching stage
  const getMembersAtStage = (stage: CoachingStage) => {
    return performanceArray.filter(p => p.coaching_stage === stage);
  };

  // Get color classes
  const getStageColors = (stage: CoachingStage) => {
    switch (stage) {
      case 1: return { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" };
      case 2: return { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400" };
      case 3: return { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-400" };
      case 4: return { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400" };
      case 5: return { bg: "bg-red-600/10", border: "border-red-600/30", text: "text-red-500" };
    }
  };

  // Handle checklist toggle
  const handleChecklistToggle = async (field: keyof CoachingRecord) => {
    if (!selectedRecord) return;
    setIsUpdating(true);
    try {
      await updateCoachingRecord(selectedRecord.record.id, {
        [field]: !selectedRecord.record[field],
      });
      // Update local state
      setSelectedRecord({
        ...selectedRecord,
        record: {
          ...selectedRecord.record,
          [field]: !selectedRecord.record[field],
        },
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle mark complete
  const handleMarkComplete = async () => {
    if (!selectedRecord) return;
    setIsUpdating(true);
    try {
      await updateCoachingRecord(selectedRecord.record.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      setSelectedRecord(null);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle notes update
  const handleNotesUpdate = async (notes: string) => {
    if (!selectedRecord) return;
    await updateCoachingRecord(selectedRecord.record.id, { notes });
  };

  // Check if all checklist items are complete
  const isChecklistComplete = (record: CoachingRecord) => {
    return record.conversation_scheduled && 
           record.barriers_discussed && 
           record.resources_identified && 
           record.strategy_developed;
  };

  return (
    <div className="space-y-6">
      {/* Pipeline View */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Coaching Pipeline
        </h3>
        <div className="grid grid-cols-5 gap-2">
          {stageConfigs.map((stageConfig) => {
            const members = getMembersAtStage(stageConfig.stage);
            const colors = getStageColors(stageConfig.stage);
            
            return (
              <div 
                key={stageConfig.stage}
                className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
              >
                <div className="text-center mb-3">
                  <div className={`text-xs font-medium ${colors.text} uppercase`}>
                    Stage {stageConfig.stage}
                  </div>
                  <div className={`text-sm font-semibold ${colors.text}`}>
                    {stageConfig.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {stageConfig.threshold} pts
                  </div>
                </div>
                
                <div className="space-y-2 min-h-[60px]">
                  {members.map((member) => (
                    <button
                      key={member.team_member_id}
                      onClick={() => {
                        const record = member.coaching_records.find(
                          r => r.stage === stageConfig.stage && r.status !== 'completed'
                        );
                        if (record) {
                          setSelectedRecord({ memberId: member.team_member_id, record });
                        }
                      }}
                      className="w-full p-2 bg-gray-800/50 rounded text-left hover:bg-gray-800/70 transition-colors"
                    >
                      <div className="text-xs font-medium text-white truncate">
                        {member.team_member.first_name} {member.team_member.last_name?.[0]}.
                      </div>
                    </button>
                  ))}
                  {members.length === 0 && (
                    <div className="text-center py-2">
                      <div className="text-xs text-gray-600">—</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Coaching Sessions */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-3">
          Active Coaching Sessions
        </h3>
        
        {performanceArray.filter(p => p.coaching_stage).length > 0 ? (
          <div className="space-y-3">
            {performanceArray
              .filter(p => p.coaching_stage)
              .sort((a, b) => (b.current_points || 0) - (a.current_points || 0))
              .map((member) => {
                const activeRecord = member.coaching_records.find(
                  r => r.stage === member.coaching_stage && r.status !== 'completed'
                );
                const colors = getStageColors(member.coaching_stage!);
                const stageConfig = stageConfigs.find(s => s.stage === member.coaching_stage);
                
                return (
                  <div
                    key={member.team_member_id}
                    className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center justify-between">
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
                          <div className={`text-xs ${colors.text}`}>
                            Stage {member.coaching_stage}: {stageConfig?.label}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{member.current_points}</div>
                          <div className="text-xs text-gray-500">points</div>
                        </div>
                        
                        {activeRecord && (
                          <button
                            onClick={() => setSelectedRecord({ memberId: member.team_member_id, record: activeRecord })}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Progress Indicators */}
                    {activeRecord && (
                      <div className="mt-3 flex items-center gap-4">
                        <div className={`flex items-center gap-1 text-xs ${activeRecord.conversation_scheduled ? 'text-green-400' : 'text-gray-500'}`}>
                          {activeRecord.conversation_scheduled ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Scheduled
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${activeRecord.barriers_discussed ? 'text-green-400' : 'text-gray-500'}`}>
                          {activeRecord.barriers_discussed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Barriers
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${activeRecord.resources_identified ? 'text-green-400' : 'text-gray-500'}`}>
                          {activeRecord.resources_identified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Resources
                        </div>
                        <div className={`flex items-center gap-1 text-xs ${activeRecord.strategy_developed ? 'text-green-400' : 'text-gray-500'}`}>
                          {activeRecord.strategy_developed ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          Strategy
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-800/30 rounded-lg border border-gray-700/30">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Active Coaching</h3>
            <p className="text-gray-400 text-sm">
              All team members are below the coaching threshold. Great job!
            </p>
          </div>
        )}
      </div>

      {/* Coaching Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1f2b] rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {(() => {
              const member = teamPerformance.get(selectedRecord.memberId);
              const colors = getStageColors(selectedRecord.record.stage);
              const stageConfig = stageConfigs.find(s => s.stage === selectedRecord.record.stage);
              
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
                        <div className={`text-sm ${colors.text}`}>
                          Stage {selectedRecord.record.stage}: {stageConfig?.label}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedRecord(null)} 
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Trigger Info */}
                    <div className="p-3 bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Calendar className="w-4 h-4" />
                        Triggered on {new Date(selectedRecord.record.triggered_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        <span className="text-gray-500">•</span>
                        {selectedRecord.record.triggered_points} points
                      </div>
                    </div>

                    {/* Checklist */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-3">Coaching Checklist</h4>
                      <div className="space-y-2">
                        {[
                          { key: 'conversation_scheduled', label: 'Private conversation scheduled' },
                          { key: 'barriers_discussed', label: 'Barriers discussed' },
                          { key: 'resources_identified', label: 'Support resources identified' },
                          { key: 'strategy_developed', label: 'Improvement strategy developed' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            onClick={() => handleChecklistToggle(item.key as keyof CoachingRecord)}
                            disabled={isUpdating}
                            className="w-full flex items-center gap-3 p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selectedRecord.record[item.key as keyof CoachingRecord]
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-600'
                            }`}>
                              {selectedRecord.record[item.key as keyof CoachingRecord] && (
                                <CheckCircle className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="text-sm text-white">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Notes</label>
                      <textarea
                        defaultValue={selectedRecord.record.notes || ''}
                        onBlur={(e) => handleNotesUpdate(e.target.value)}
                        placeholder="Add notes about the coaching session..."
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between gap-2 p-4 border-t border-gray-700">
                    <button
                      onClick={() => generateCoachingLetter(selectedRecord.record.id)}
                      className="btn-ghost"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Letter
                    </button>
                    <button
                      onClick={handleMarkComplete}
                      disabled={!isChecklistComplete(selectedRecord.record) || isUpdating}
                      className="btn-primary"
                    >
                      {isUpdating ? 'Saving...' : 'Mark Coaching Complete'}
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

export default CoachingTab;
