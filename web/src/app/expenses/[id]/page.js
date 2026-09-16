'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Layout from '@/components/Layout';
import FilePreviewModal from '@/components/FilePreviewModal';
import { api } from '@/lib/api';
import { getUser, isAdmin, getFullName } from '@/lib/auth';
import { ExpenseStatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';

const fmt = (n) =>
  Number(n || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EMPTY_ITEM = { description: '', amount: '', notes: '', file: null };

export default function ExpenseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showItemForm, setShowItemForm] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM);
  const [saving, setSaving] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [remainderMemberId, setRemainderMemberId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    setUser(getUser());
    loadDoc();
  }, [params.id]);

  async function loadDoc(showSpinner = true) {
    if (showSpinner) setLoading(true);
    try {
      const data = await api.getExpense(params.id);
      setDoc(data);
      setRemainderMemberId(data.remainder_member_id ?? null);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showSpinner) setLoading(false);
    }
  }

  function canManage() {
    if (!user || !doc) return false;
    if (isAdmin(user)) return true;
    if (user.role === 'leader' && doc.lead_id === user.id) return true;
    return false;
  }

  function canEdit() {
    if (!user || !doc) return false;
    if (isAdmin(user)) return doc.status !== 'closed';
    if (user.role === 'leader' && doc.lead_id === user.id) {
      return ['pending_review', 'returned'].includes(doc.status);
    }
    return false;
  }

  async function handleStatusChange(newStatus) {
    const labels = { approved: 'อนุมัติ', returned: 'ตีกลับ', closed: 'ปิด' };
    if (!confirm(`ยืนยันการเปลี่ยนสถานะเป็น "${labels[newStatus] || newStatus}"?`)) return;
    setActionError('');
    setSaving(true);
    try {
      await api.changeExpenseStatus(params.id, newStatus);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!confirm('ยืนยันการส่งยอดให้สมาชิก?')) return;
    setActionError('');
    setSaving(true);
    try {
      await api.sendToMembers(params.id);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen() {
    if (!confirm('ยืนยันการเปิดแก้ไขใหม่? สถานะจะเปลี่ยนเป็น "รอตรวจ" และยอดที่ส่งสมาชิกไปแล้วจะถูกยกเลิก')) return;
    setActionError('');
    setSaving(true);
    try {
      await api.reopenExpense(params.id);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openAddItem() {
    setEditItemId(null);
    setItemForm(EMPTY_ITEM);
    setShowItemForm(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  function openEditItem(item) {
    setEditItemId(item.id);
    setItemForm({
      description: item.description,
      amount: item.amount,
      notes: item.notes || '',
      file: null,
    });
    setShowItemForm(true);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSaveItem(e) {
    e.preventDefault();
    setSaving(true);
    setActionError('');
    try {
      let attachmentMeta = {};
      if (itemForm.file) {
        const { signedUrl, path } = await api.signUpload({
          fileName: itemForm.file.name,
          fileType: itemForm.file.type,
          docId: params.id,
        });
        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: itemForm.file,
          headers: { 'Content-Type': itemForm.file.type },
        });
        if (!uploadRes.ok) throw new Error('อัปโหลดไฟล์ไม่สำเร็จ');
        attachmentMeta = {
          attachment_path: path,
          attachment_name: itemForm.file.name,
          attachment_size: itemForm.file.size,
        };
      }

      const body = {
        description: itemForm.description,
        amount: itemForm.amount,
        notes: itemForm.notes,
        ...attachmentMeta,
      };

      if (editItemId) {
        await api.updateExpenseItem(params.id, editItemId, body);
      } else {
        await api.addExpenseItem(params.id, body);
      }
      setShowItemForm(false);
      setEditItemId(null);
      setItemForm(EMPTY_ITEM);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteItem(itemId) {
    if (!confirm('ยืนยันการลบรายการนี้?')) return;
    setActionError('');
    try {
      await api.deleteExpenseItem(params.id, itemId);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleSetRemainder() {
    setActionError('');
    setSaving(true);
    try {
      await api.setRemainder(params.id, remainderMemberId);
      await loadDoc(false);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const showShares = () => !!doc;

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-400">กำลังโหลด...</div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-500">{error}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link href={`/projects/${doc.project_id}`} className="text-sm text-gray-400 hover:text-gray-600 mb-2 block">
              ← กลับโครงการ
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">เอกสารเบิกจ่าย</h1>
            <p className="text-gray-500 text-sm mt-0.5">{doc.project_name}</p>
            <div className="mt-2">
              <ExpenseStatusBadge status={doc.status} sentToMember={doc.sent_to_member} />
            </div>
          </div>

          {/* Action buttons */}
          {isAdmin(user) && (
            <div className="flex gap-2 flex-wrap justify-end">
              {doc.status === 'pending_review' && (
                <>
                  <button onClick={() => handleStatusChange('approved')} disabled={saving}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                    อนุมัติ
                  </button>
                  <button onClick={() => handleStatusChange('returned')} disabled={saving}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                    ตีกลับ
                  </button>
                </>
              )}
              {doc.status === 'approved' && (
                <>
                  {!doc.sent_to_member && (
                    <button onClick={handleSend} disabled={saving}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                      {saving ? 'กำลังดำเนินการ...' : 'ส่งยอดให้สมาชิก'}
                    </button>
                  )}
                  <button onClick={() => handleStatusChange('closed')} disabled={saving}
                    className="px-3 py-1.5 bg-gray-500 hover:bg-gray-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                    ปิดเอกสาร
                  </button>
                  <button onClick={handleReopen} disabled={saving}
                    className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                    เปิดแก้ไขใหม่
                  </button>
                </>
              )}
              {doc.status === 'closed' && (
                <button onClick={handleReopen} disabled={saving}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium">
                  เปิดแก้ไขใหม่
                </button>
              )}
            </div>
          )}
        </div>

        {actionError && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg">{actionError}</div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">ยอดรวมทั้งหมด</p>
            <p className="text-xl font-bold text-gray-800 mt-1">฿{fmt(doc.total_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">จำนวนผู้เข้าร่วม</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{doc.participants.length} คน</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">ยอดเศษ (document)</p>
            <p className="text-xl font-bold text-orange-500 mt-1">฿{fmt(doc.remainder_amount)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs text-gray-500">รายการทั้งหมด</p>
            <p className="text-xl font-bold text-gray-800 mt-1">{doc.items.length} รายการ</p>
          </div>
        </div>

        {/* Expense Items */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-700">รายการค่าใช้จ่าย</h2>
            {canEdit() && !showItemForm && (
              <button onClick={openAddItem}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg">
                + เพิ่มรายการ
              </button>
            )}
          </div>

          {showItemForm && (
            <form onSubmit={handleSaveItem} className="px-6 py-4 bg-blue-50 border-b border-blue-100">
              <h3 className="text-sm font-semibold text-blue-800 mb-3">
                {editItemId ? 'แก้ไขรายการ' : 'เพิ่มรายการใหม่'}
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">รายการ *</label>
                  <input
                    type="text"
                    value={itemForm.description}
                    onChange={(e) => setItemForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">จำนวนเงิน (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemForm.amount}
                    onChange={(e) => setItemForm((f) => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">หมายเหตุ</label>
                  <input
                    type="text"
                    value={itemForm.notes}
                    onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    ไฟล์แนบ (รูป/เอกสาร, ไม่เกิน {process.env.NEXT_PUBLIC_MAX_MB || 50}MB)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    onChange={(e) => setItemForm((f) => ({ ...f, file: e.target.files[0] || null }))}
                    className="w-full text-sm text-gray-600 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg file:bg-blue-600 file:text-white file:text-xs file:cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowItemForm(false); setEditItemId(null); }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">ยกเลิก</button>
                <button type="submit" disabled={saving}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </form>
          )}

          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-center px-4 py-3 font-medium text-gray-600 w-12">#</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">รายการ</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">จำนวนเงิน</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">ไฟล์แนบ</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">หมายเหตุ</th>
                {canEdit() && <th className="px-4 py-3 w-20"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doc.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center text-gray-500">{item.sequence}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{item.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">฿{fmt(item.amount)}</td>
                  <td className="px-4 py-3">
                    {item.attachment_path ? (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { signedUrl } = await api.signDownload(item.attachment_path);
                            setPreviewFile({ url: signedUrl, name: item.attachment_name || 'ไฟล์แนบ', size: item.attachment_size });
                          } catch (err) {
                            setActionError(err.message);
                          }
                        }}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs truncate max-w-36 group"
                        title={item.attachment_name}
                      >
                        <span className="shrink-0">📎</span>
                        <span className="truncate group-hover:underline">
                          {item.attachment_name || 'ไฟล์แนบ'}
                        </span>
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.notes || '-'}</td>
                  {canEdit() && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditItem(item)}
                          className="text-xs text-blue-600 hover:underline">แก้ไข</button>
                        <button onClick={() => handleDeleteItem(item.id)}
                          className="text-xs text-red-500 hover:underline">ลบ</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {doc.items.length === 0 && (
                <tr>
                  <td colSpan={canEdit() ? 6 : 5} className="px-4 py-8 text-center text-gray-400">
                    ยังไม่มีรายการค่าใช้จ่าย
                  </td>
                </tr>
              )}
            </tbody>
            {doc.items.length > 0 && (
              <tfoot className="border-t-2 border-gray-200">
                <tr className="bg-gray-50">
                  <td colSpan={2} className="px-4 py-3 font-semibold text-gray-700">รวม</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900">฿{fmt(doc.total_amount)}</td>
                  <td colSpan={canEdit() ? 3 : 2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Share calculation */}
        {showShares() && doc.participants.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-700">การแบ่งยอด</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                60% / 40% แบ่งเท่ากันตามจำนวนสมาชิก {doc.participants.length} คน
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 px-6 py-4 bg-gray-50 border-b">
              <div>
                <p className="text-xs text-gray-500">ส่วน 60% ({fmt(Number(doc.total_amount) * 0.6)} บาท)</p>
                <p className="text-sm font-semibold text-blue-600 mt-0.5">
                  ÷ {doc.participants.length} = ฿{doc.shares[0] ? fmt(doc.shares[0].share_60) : '0.00'} / คน
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ส่วน 40% ({fmt(Number(doc.total_amount) * 0.4)} บาท)</p>
                <p className="text-sm font-semibold text-purple-600 mt-0.5">
                  ÷ {doc.participants.length} = ฿{doc.shares[0] ? fmt(doc.shares[0].share_40) : '0.00'} / คน
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">ยอดเศษ (document-level)</p>
                <p className="text-sm font-semibold text-orange-500 mt-0.5">฿{fmt(doc.remainder_amount)}</p>
              </div>
            </div>

            {/* Remainder assignment (admin only, when remainder > 0) */}
            {isAdmin(user) && Number(doc.remainder_amount) !== 0 && doc.status !== 'closed' && (
              <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex flex-wrap items-end gap-4">
                <div>
                  <p className="text-xs font-medium text-orange-700 mb-1">
                    กำหนดผู้รับยอดเศษ (฿{fmt(doc.remainder_amount)})
                  </p>
                  <select
                    value={remainderMemberId ?? ''}
                    onChange={(e) => setRemainderMemberId(e.target.value ? parseInt(e.target.value) : null)}
                    className="px-3 py-1.5 border border-orange-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                  >
                    <option value="">-- ไม่ระบุ --</option>
                    {doc.participants.map((p) => (
                      <option key={p.id} value={p.id}>{getFullName(p)} ({p.nickname})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleSetRemainder}
                  disabled={saving}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            )}

            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">สมาชิก</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">ทีม</th>
                  <th className="text-right px-6 py-3 font-medium text-blue-600">ส่วน 60%</th>
                  <th className="text-right px-6 py-3 font-medium text-purple-600">ส่วน 40%</th>
                  <th className="text-right px-6 py-3 font-medium text-orange-500">ยอดเศษ</th>
                  <th className="text-right px-6 py-3 font-medium text-gray-700">รวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doc.shares.map((s) => {
                  const isMe = user && s.member_id === user.id;
                  const hasRemainder = Number(s.remainder_share) !== 0;
                  return (
                    <tr key={s.member_id} className={isMe ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-3 font-medium">
                        {s.prefix}{s.first_name} {s.last_name}
                        <span className="text-gray-400 ml-1">({s.nickname})</span>
                        {isMe && <span className="ml-2 text-xs text-blue-600 font-semibold">(ฉัน)</span>}
                        {hasRemainder && <span className="ml-2 text-xs text-orange-500 font-semibold">(รับยอดเศษ)</span>}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{s.team}</td>
                      <td className="px-6 py-3 text-right text-blue-600">฿{fmt(s.share_60)}</td>
                      <td className="px-6 py-3 text-right text-purple-600">฿{fmt(s.share_40)}</td>
                      <td className="px-6 py-3 text-right text-orange-500">
                        {hasRemainder ? `฿${fmt(s.remainder_share)}` : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-gray-800">฿{fmt(s.total_share)}</td>
                    </tr>
                  );
                })}
                {doc.shares.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-6 text-center text-gray-400 text-sm">
                      ยังไม่มีข้อมูลการแบ่งยอด
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Participants info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold text-gray-700 mb-3">ผู้เข้าร่วมโครงการ ({doc.participants.length} คน)</h2>
          <div className="flex flex-wrap gap-2">
            {doc.participants.map((p) => (
              <span key={p.id} className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                {getFullName(p)} ({p.nickname})
              </span>
            ))}
            {doc.participants.length === 0 && (
              <p className="text-gray-400 text-sm">ยังไม่มีผู้เข้าร่วม</p>
            )}
          </div>
        </div>
      </div>

      {previewFile && (
        <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />
      )}
    </Layout>
  );
}
