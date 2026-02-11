/**
 * DiagnosticsPath
 * Renders a file path footer that's only visible when diagnostic mode is enabled.
 * Controlled by body.show-diagnostics class (toggled via DiagnosticsPanel).
 *
 * @diagnostics src/shared/components/DiagnosticsPath.tsx
 *
 * Usage:
 *   <DiagnosticsPath path="src/features/admin/components/sections/ScheduleManager/index.tsx" />
 */
import React from "react";

interface DiagnosticsPathProps {
  path: string;
}

export const DiagnosticsPath: React.FC<DiagnosticsPathProps> = ({ path }) => (
  <div className="diagnostics-path">📁 {path}</div>
);
