'use client';

const PROJECT_STATUS = {
  draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700' },
  pending: { label: 'รออนุมัติ', color: 'bg-yellow-100 text-yellow-700' },
  active: { label: 'กำลังดำเนินการ', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'เสร็จสิ้น', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'ปฏิเสธ', color: 'bg-orange-100 text-orange-700' },
};

const EXPENSE_STATUS = {
  pending_review: { label: 'รอตรวจ', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'อนุมัติ', color: 'bg-green-100 text-green-700' },
  closed: { label: 'ปิด', color: 'bg-gray-100 text-gray-700' },
  returned: { label: 'ตีกลับ', color: 'bg-red-100 text-red-700' },
};

const ROLE_STATUS = {
  superadmin: { label: 'ผู้ดูแลระบบ', color: 'bg-purple-100 text-purple-700' },
  admin: { label: 'แอดมิน', color: 'bg-blue-100 text-blue-700' },
  leader: { label: 'หัวหน้าโครงการ', color: 'bg-teal-100 text-teal-700' },
  user: { label: 'ผู้ใช้งาน', color: 'bg-gray-100 text-gray-600' },
};

export function ProjectStatusBadge({ status }) {
  const s = PROJECT_STATUS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}

export function ExpenseStatusBadge({ status, sentToMember }) {
  const s = EXPENSE_STATUS[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
        {s.label}
      </span>
      {(status === 'approved' || status === 'closed') && sentToMember && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          ส่งยอดแล้ว
        </span>
      )}
      {status === 'approved' && !sentToMember && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          ยังไม่ส่งยอด
        </span>
      )}
    </span>
  );
}

export function RoleBadge({ role }) {
  const s = ROLE_STATUS[role] || { label: role, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  );
}
