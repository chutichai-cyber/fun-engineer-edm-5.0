'use client';
import { useEffect, useCallback } from 'react';

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
const PDF_EXTS = ['pdf'];

function getExt(filename = '') {
  return filename.split('.').pop().toLowerCase();
}

function getFileType(filename) {
  const ext = getExt(filename);
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (PDF_EXTS.includes(ext)) return 'pdf';
  return 'other';
}

export default function FilePreviewModal({ file, onClose }) {
  // file = { url, name, size }

  const handleKeyDown = useCallback(
    (e) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (!file) return null;

  const type = getFileType(file.name);
  const sizeText = file.size
    ? file.size >= 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${(file.size / 1024).toFixed(0)} KB`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-lg">{type === 'image' ? '🖼️' : type === 'pdf' ? '📄' : '📎'}</span>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate max-w-xs sm:max-w-md">{file.name}</p>
            {sizeText && <p className="text-gray-400 text-xs">{sizeText}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <a
            href={file.url}
            download={file.name}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            ดาวน์โหลด
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors text-lg leading-none"
            aria-label="ปิด"
          >
            ×
          </button>
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {type === 'image' && (
          <img
            src={file.url}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
            draggable={false}
          />
        )}

        {type === 'pdf' && (
          <iframe
            src={`${file.url}#toolbar=1&navpanes=0`}
            title={file.name}
            className="w-full h-full rounded-lg shadow-2xl bg-white"
            style={{ minHeight: '70vh' }}
          />
        )}

        {type === 'other' && (
          <div className="text-center">
            <div className="text-6xl mb-4">📎</div>
            <p className="text-white text-base font-medium mb-1">{file.name}</p>
            {sizeText && <p className="text-gray-400 text-sm mb-5">{sizeText}</p>}
            <p className="text-gray-400 text-sm mb-5">ไฟล์ประเภทนี้ไม่สามารถแสดง preview ได้</p>
            <a
              href={file.url}
              download={file.name}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              ดาวน์โหลดไฟล์
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
