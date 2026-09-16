export function getUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('authUser');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  localStorage.setItem('authUser', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('authUser');
}

export function isAdmin(user) {
  return user && ['superadmin', 'admin'].includes(user.role);
}

export function isSuperAdmin(user) {
  return user && user.role === 'superadmin';
}

export function isLeader(user) {
  return user && ['superadmin', 'admin', 'leader'].includes(user.role);
}

export function getRoleLabel(role) {
  const labels = {
    superadmin: 'ผู้ดูแลระบบ',
    admin: 'แอดมิน',
    leader: 'หัวหน้าโครงการ',
    user: 'ผู้ใช้งาน',
  };
  return labels[role] || role;
}

export function getPrefixLabel(prefix) {
  return prefix || '';
}

export function getFullName(member) {
  if (!member) return '-';
  return `${member.prefix || ''}${member.first_name} ${member.last_name}`;
}
