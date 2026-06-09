import React from "react";
import { GraduationCap, ShieldCheck } from "lucide-react";

interface StudentBadgeProps {
  isVerified: boolean;
  universityShortName?: string;
  onVerifyClick?: () => void;
}

/**
 * Premium verification indicator that displays academic credential validation
 */
export const StudentBadge: React.FC<StudentBadgeProps> = ({
  isVerified,
  universityShortName,
  onVerifyClick
}) => {
  if (isVerified) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
        <GraduationCap className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>Sinh viên {universityShortName || "Đã xác thực"}</span>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100 animate-pulse stroke-[2]" />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-[11px] text-stone-500 italic">Chưa xác thực SV</span>
      <button
        id="btn-verify-student-badge"
        onClick={onVerifyClick}
        type="button"
        className="cursor-pointer px-2.5 py-0.5 text-[11px] bg-amber-500 hover:bg-amber-600 font-bold text-white rounded-full transition duration-150 flex items-center gap-1 shadow-xs hover:shadow-sm"
      >
        <span>Xác thực ngay</span>
        <GraduationCap className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

export default StudentBadge;
