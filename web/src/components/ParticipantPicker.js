'use client';
import { useState, useRef, useEffect } from 'react';
import { getFullName } from '@/lib/auth';

export default function ParticipantPicker({ members = [], selected = [], onChange, disabled = false }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedSet = new Set(selected);
  const selectedMembers = members.filter((m) => selectedSet.has(m.id));
  const available = members.filter((m) => !selectedSet.has(m.id));

  const filtered = search.trim()
    ? available.filter((m) => {
        const q = search.toLowerCase();
        return (
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q) ||
          (m.nickname || '').toLowerCase().includes(q) ||
          (m.team || '').toLowerCase().includes(q) ||
          m.username.toLowerCase().includes(q)
        );
      })
    : available;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function add(id) {
    onChange([...selected, id]);
    setSearch('');
    inputRef.current?.focus();
  }

  function remove(id) {
    onChange(selected.filter((x) => x !== id));
  }

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 min-h-9">
        {selectedMembers.length === 0 ? (
          <span className="text-gray-400 text-sm self-center">ยังไม่ได้เลือกผู้เข้าร่วม</span>
        ) : (
          selectedMembers.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
            >
              <span className="w-5 h-5 rounded-full bg-blue-300 text-blue-900 flex items-center justify-center text-[10px] font-bold shrink-0">
                {(m.nickname || m.first_name).slice(0, 2)}
              </span>
              <span>{m.nickname || m.first_name}</span>
              <span className="text-blue-500 hidden sm:inline truncate max-w-[80px]">
                {m.first_name} {m.last_name}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="w-4 h-4 rounded-full bg-blue-200 hover:bg-red-200 hover:text-red-600 flex items-center justify-center text-blue-600 transition-colors ml-0.5"
                  aria-label={`ลบ ${getFullName(m)}`}
                >
                  ×
                </button>
              )}
            </span>
          ))
        )}
      </div>

      {/* Search input + dropdown */}
      {!disabled && (
        <div ref={containerRef} className="relative">
          <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="ค้นหาชื่อ, ชื่อเล่น, ทีม, username..."
              className="flex-1 outline-none text-sm bg-transparent"
            />
            {search && (
              <button type="button" onClick={() => { setSearch(''); inputRef.current?.focus(); }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            )}
          </div>

          {open && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="px-4 py-4 text-sm text-gray-400 text-center">
                  {search ? 'ไม่พบสมาชิก' : 'สมาชิกทั้งหมดถูกเพิ่มแล้ว'}
                </p>
              ) : (
                <>
                  <p className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                    พบ {filtered.length} คน — คลิกเพื่อเพิ่ม
                  </p>
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => add(m.id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 text-left border-b border-gray-50 last:border-0 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold shrink-0">
                        {(m.nickname || m.first_name).slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {getFullName(m)}
                          {m.nickname && (
                            <span className="text-gray-400 ml-1.5 font-normal">({m.nickname})</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{m.team || '-'} · {m.username}</p>
                      </div>
                      <span className="text-xs text-blue-600 font-medium shrink-0">+ เพิ่ม</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">{selectedMembers.length} คนที่เลือก จาก {members.length} คนทั้งหมด</p>
    </div>
  );
}
