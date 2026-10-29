import React from 'react';
import { VerificationData } from '../utils/authenticProofHelper';
import { ShieldCheck, X, CheckCircle2, Lock, Sparkles, Building2, UserCheck, School } from 'lucide-react';
import { motion } from 'motion/react';

interface DigitalVerificationModalProps {
  data: VerificationData;
  onClose: () => void;
}

export const DigitalVerificationModal: React.FC<DigitalVerificationModalProps> = ({ data, onClose }) => {
  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-300 max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-900 my-auto"
      >
        {/* Header Bar */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base flex items-center gap-2">
                <span>PORTAL VERIFIKASI DIGITAL</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                SiMantri SMAN 3 Tumijajar
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-6 text-slate-900 text-xs sm:text-sm flex-1 min-h-0 overscroll-contain">
          {/* Header Branding */}
          <div className="text-center border-b-2 border-slate-900 pb-4">
            <h2 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide">
              DATA VERIFIKASI DIGITAL SIMANTRI
            </h2>
            <h3 className="text-sm sm:text-base font-extrabold text-indigo-900 uppercase mt-1">
              SMA NEGERI 3 TUMIJAJAR
            </h3>
            <p className="text-xs text-slate-600 font-semibold mt-0.5">
              Kabupaten Tulang Bawang Barat, Provinsi Lampung
            </p>
          </div>

          {/* Table: Parameter Sistem & Keterangan Validasi */}
          <div className="border-2 border-slate-900 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-extrabold uppercase text-[11px] sm:text-xs border-b-2 border-slate-900">
                  <th className="p-3 border-r-2 border-slate-900 w-2/5">Parameter Sistem</th>
                  <th className="p-3">Keterangan Validasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium text-xs sm:text-sm">
                <tr>
                  <td className="p-3 font-bold text-slate-800 border-r-2 border-slate-900 bg-slate-50">
                    Status Dokumen
                  </td>
                  <td className="p-3 font-black text-emerald-700 bg-emerald-50/80 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{data.status || 'SAH / VALID (Terverifikasi oleh Sistem SiMantri)'}</span>
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-800 border-r-2 border-slate-900 bg-slate-50">
                    ID Verifikasi
                  </td>
                  <td className="p-3 font-mono font-bold text-indigo-950 bg-white">
                    {data.authCode}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-800 border-r-2 border-slate-900 bg-slate-50">
                    Waktu Validasi
                  </td>
                  <td className="p-3 font-mono text-slate-900 bg-white">
                    {data.waktu}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-slate-800 border-r-2 border-slate-900 bg-slate-50">
                    Metode Penilaian
                  </td>
                  <td className="p-3 text-slate-900 font-semibold bg-white">
                    {data.metode}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* I. PROFIL SISWA & IDENTITAS */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
            <h4 className="font-black text-indigo-950 uppercase text-xs sm:text-sm flex items-center gap-2 border-b border-indigo-200 pb-1.5">
              <UserCheck className="w-4 h-4 text-indigo-700" />
              <span>I. PROFIL SISWA & IDENTITAS</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-medium">
              <div>
                • <strong className="text-slate-900">Nama Lengkap:</strong>{' '}
                <span className="font-bold text-indigo-950 uppercase">{data.studentName}</span>
              </div>
              <div>
                • <strong className="text-slate-900">NISN / NIS:</strong>{' '}
                <span className="font-mono font-bold text-slate-900">{data.studentNisn}</span>
              </div>
              <div>
                • <strong className="text-slate-900">Kelas / Jurusan:</strong>{' '}
                <span className="font-bold text-slate-900">{data.studentClass}</span>
              </div>
              <div>
                • <strong className="text-slate-900">Tahun Ajaran:</strong>{' '}
                <span className="font-bold text-slate-900">{data.tahunAjaran}</span>
              </div>
            </div>
          </div>

          {/* II. RINGKASAN HASIL PENILAIAN AI */}
          <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
            <h4 className="font-black text-amber-950 uppercase text-xs sm:text-sm flex items-center gap-2 border-b border-amber-200 pb-1.5">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>II. RINGKASAN HASIL PENILAIAN AI</span>
            </h4>
            <div className="space-y-1.5 text-slate-800 font-medium">
              <div>
                • <strong className="text-slate-900">Mata Pelajaran / Modul:</strong>{' '}
                <span className="font-bold text-slate-900">{data.mataPelajaran}</span>
              </div>
              <div>
                • <strong className="text-slate-900">Skor AI (Artificial Intelligence):</strong>{' '}
                <span className="px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-black text-sm">
                  {data.skor}
                </span>
              </div>
              <div>
                • <strong className="text-slate-900">Catatan Analisis AI:</strong>{' '}
                <p className="mt-1 p-2.5 bg-white rounded-xl border border-amber-200 text-slate-700 leading-relaxed italic">
                  "{data.catatanAi}"
                </p>
              </div>
            </div>
          </div>

          {/* III. VALIDASI GURU & OTENTIKASI */}
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200 space-y-2">
            <h4 className="font-black text-emerald-950 uppercase text-xs sm:text-sm flex items-center gap-2 border-b border-emerald-200 pb-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>III. VALIDASI GURU & OTENTIKASI</span>
            </h4>
            <div className="space-y-1.5 text-slate-800 font-medium">
              <div>
                • <strong className="text-slate-900">Guru Pengampu:</strong>{' '}
                <span className="font-bold text-slate-900">
                  {data.guruName} (NIP. {data.guruNip})
                </span>
              </div>
              <div>
                • <strong className="text-slate-900">Status Review Guru:</strong>{' '}
                <span className="font-black text-emerald-700">
                  {data.statusGuru || 'Disetujui (Approved)'}
                </span>
              </div>
              <div>
                • <strong className="text-slate-900">Catatan Guru:</strong>{' '}
                <p className="mt-1 p-2.5 bg-white rounded-xl border border-emerald-200 text-slate-700 leading-relaxed italic">
                  "{data.catatanGuru}"
                </p>
              </div>
            </div>
          </div>

          {/* Catatan Keamanan */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white text-xs leading-relaxed space-y-1.5 border border-slate-700 shadow-md">
            <p className="font-extrabold text-amber-300 flex items-center gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Catatan Keamanan:</span>
            </p>
            <p className="text-slate-200 text-justify font-normal leading-normal">
              Hasil pemindaian ini merupakan data real-time yang ditarik langsung dari pangkalan data SiMantri SMAN 3 Tumijajar. Jika informasi yang muncul di layar browser setelah scan tidak cocok dengan nama atau angka pada dokumen fisik, maka dokumen fisik tersebut dinyatakan tidak valid atau mengalami manipulasi.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-mono font-bold text-slate-600">
            ID: {data.authCode}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            Tutup Portal Verifikasi
          </button>
        </div>
      </motion.div>
    </div>
  );
};
