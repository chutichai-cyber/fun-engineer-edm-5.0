'use client';

// Using TailAdmin's meta color palette for consistent status colors
const PROJECT_STATUS = {
  draft:     { label: 'ร่าง',            cls: 'bg-meta-9 text-body' },
  pending:   { label: 'รออนุมัติ',       cls: 'bg-warning/20 text-warning' },
  active:    { label: 'กำลังดำเนินการ',  cls: 'bg-primary/10 text-primary' },
  completed: { label: 'เสร็จสิ้น',       cls: 'bg-success/10 text-success' },
  cancelled: { label: 'ยกเลิก',          cls: 'bg-danger/10 text-danger' },
  rejected:  { label: 'ปฏิเสธ',          cls: 'bg-meta-1/10 text-meta-1' },
};

const EXPENSE_STATUS = {
  pending_review: { label: 'รอตรวจ',  cls: 'bg-warning/20 text-warning' },
  approved:       { label: 'อนุมัติ',  cls: 'bg-success/10 text-success' },
  closed:         { label: 'ปิด',      cls: 'bg-meta-9 text-body' },
  returned:       { label: 'ตีกลับ',   cls: 'bg-danger/10 text-danger' },
};

const ROLE_STATUS = {
  superadmin: { label: 'ผู้ดูแลระบบ',   cls: 'bg-meta-5/10 text-meta-5' },
  admin:      { label: 'แอดมิน',         cls: 'bg-primary/10 text-primary' },
  leader:     { label: 'หัวหน้าโครงการ', cls: 'bg-meta-3/10 text-meta-3' },
  user:       { label: 'ผู้ใช้งาน',      cls: 'bg-meta-9 text-body' },
};

export function ProjectStatusBadge({ status }) {
  const s = PROJECT_STATUS[status] || { label: status, cls: 'bg-meta-9 text-body' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}

export function ExpenseStatusBadge({ status, sentToMember }) {
  const s = EXPENSE_STATUS[status] || { label: status, cls: 'bg-meta-9 text-body' };
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <span className={`badge ${s.cls}`}>{s.label}</span>
      {(status === 'approved' || status === 'closed') && sentToMember && (
        <span className="badge bg-secondary/20 text-meta-10">ส่งยอดแล้ว</span>
      )}
      {status === 'approved' && !sentToMember && (
        <span className="badge bg-meta-9 text-bodydark">ยังไม่ส่งยอด</span>
      )}
    </span>
  );
}

export function RoleBadge({ role }) {
  const s = ROLE_STATUS[role] || { label: role, cls: 'bg-meta-9 text-body' };
  return <span className={`badge ${s.cls}`}>{s.label}</span>;
}
