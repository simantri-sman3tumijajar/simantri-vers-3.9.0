import React, { useState } from 'react';
import { Award, FileText, LayoutGrid, Sparkles, Copy, Check, Download, Send, X, Shield, Medal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import jsPDF from 'jspdf';

interface OlimpiadeAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToAnnouncement?: (title: string, content: string) => void;
  initialMenu?: 'Piagam' | 'Pengumuman Juara' | 'Struktur Menu';
  initialJenisKompetisi?: 'Seleksi OSN' | 'Olimpiade Internal Sekolah';
  initialNamaAcara?: string;
}

export const OlimpiadeAssistantModal: React.FC<OlimpiadeAssistantModalProps> = ({
  isOpen,
  onClose,
  onApplyToAnnouncement,
  initialMenu = 'Pengumuman Juara',
  initialJenisKompetisi = 'Seleksi OSN',
  initialNamaAcara = 'Dalam Rangka Seleksi OSN-K 2026 SMAN 3 Tumijajar',
}) => {
  const { state, showToast } = useApp();

  const [jenisKompetisi, setJenisKompetisi] = useState<'Seleksi OSN' | 'Olimpiade Internal Sekolah'>(initialJenisKompetisi);
  const [namaAcara, setNamaAcara] = useState<string>(initialNamaAcara);
  const [menuDipilih, setMenuDipilih] = useState<'Piagam' | 'Pengumuman Juara' | 'Struktur Menu'>(initialMenu);

  // Sync state when props change
  React.useEffect(() => {
    if (isOpen) {
      if (initialMenu) setMenuDipilih(initialMenu);
      if (initialJenisKompetisi) setJenisKompetisi(initialJenisKompetisi);
      if (initialNamaAcara) setNamaAcara(initialNamaAcara);
    }
  }, [isOpen, initialMenu, initialJenisKompetisi, initialNamaAcara]);

  // Winner Data
  const [juara1, setJuara1] = useState({ nama: 'Ahmad Fauzi', kelas: 'XI FIPA 1' });
  const [juara2, setJuara2] = useState({ nama: 'Siti Rahmawati', kelas: 'X E1' });
  const [juara3, setJuara3] = useState({ nama: 'Budi Santoso', kelas: 'XI FIPA 2' });
  const [juaraHarapan1, setJuaraHarapan1] = useState({ nama: 'Dewi Lestari', kelas: 'XII IPA 1' });

  const [generatedResult, setGeneratedResult] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const schoolName = state.schoolInfo?.namaSekolah || 'SMAN 3 TUMIJAJAR';
  const kepsekName = state.schoolInfo?.kepalaSekolah || 'M. APRIOL, S.Pd., M.Pd.';
  const kepsekNip = state.schoolInfo?.nipKepalaSekolah || '19750412 200003 1 002';

  const handleGenerate = async () => {
    setIsGenerating(true);
    setCopied(false);

    try {
      // Call Gemini API if available, or generate precise markdown structured text based on prompt specification
      const promptText = `
# ROLE AND OBJECTIVE
Anda adalah seorang AI Administration & Communications Specialist yang bertugas menyusun dokumen, pengumuman formal, teks piagam penghargaan, dan menu navigasi untuk kegiatan Olimpiade Sains Nasional (OSN) tingkat Sekolah, Kabupaten, maupun kompetisi internal yang diselenggarakan oleh sekolah.

# INPUT VARIABLES
- Jenis Kompetisi: ${jenisKompetisi}
- Nama Acara (Dalam Rangka): ${namaAcara}
- Menu yang Dipilih: ${menuDipilih}
- Penyelenggara: ${schoolName}
- Kepala Sekolah: ${kepsekName} (NIP: ${kepsekNip})
- Data Juara:
  * Juara 1: ${juara1.nama || '[Nama]'} - ${juara1.kelas || '[Kelas]'}
  * Juara 2: ${juara2.nama || '[Nama]'} - ${juara2.kelas || '[Kelas]'}
  * Juara 3: ${juara3.nama || '[Nama]'} - ${juara3.kelas || '[Kelas]'}
  * Juara Harapan 1: ${juaraHarapan1.nama || '[Nama]'} - ${juaraHarapan1.kelas || '[Kelas]'}
      `;

      const res = await fetch('/api/gemini/parse-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: promptText,
          examType: 'Olimpiade',
          targetQuestionCount: 1,
        }),
      });

      const json = await res.json();
      if (json.success && json.result?.generatedText) {
        setGeneratedResult(json.result.generatedText);
      } else {
        // Fallback precise structured template engine matching prompt requirements exactly
        let result = '';

        if (menuDipilih === 'Piagam') {
          result = `================================================================================
                           PIAGAM PENGHARGAAN RESMI
                           ${schoolName.toUpperCase()}
================================================================================
Nomor Surat: 421.3 / [Nomor Surat] / SMAN3-TUM / 2026

Pemerintah Provinsi Lampung
Dinas Pendidikan dan Kebudayaan
${schoolName}

DIBERIKAN KEPADA:
Nama           : ${juara1.nama || '[Nama Peserta]'}
Kelas / Asal   : ${juara1.kelas || '[Kelas / Instansi]'}

ATAS PRESTASI SEBAGAI:
JUARA 1 (PERTAMA)

DALAM RANGKA:
${namaAcara} (${jenisKompetisi})

Semoga prestasi yang diraih dapat menjadi pemicu semangat untuk terus mengukir karya dan mengharumkan nama sekolah di jenjang yang lebih tinggi.

Tumijajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

Mengetahui,
Kepala ${schoolName}



${kepsekName}
NIP. ${kepsekNip}
================================================================================`;
        } else if (menuDipilih === 'Pengumuman Juara') {
          result = `# PENGUMUMAN RESMI HASIL ${jenisKompetisi.toUpperCase()}
## ${namaAcara.toUpperCase()}

*Assalamu’alaikum Warahmatullahi Wabarakatuh,*  
*Salam Sejahtera Bagi Kita Semua,*

Puji dan syukur marilah kita panjatkan ke hadirat Allah SWT, Tuhan Yang Maha Esa. Berdasarkan hasil penilaian dan rapat pleno tim juri/panitia penyelenggara ${jenisKompetisi} di **${schoolName}**, dengan ini kami umumkan daftar peserta terbaik yang berhasil meraih kejuaraan:

### DAFTAR PEMENANG & PERAIH JUARA:

| Tingkat / Gelar | Nama Siswa / Peserta | Kelas / Rombel |
| :--- | :--- | :--- |
| **Juara 1** | **${juara1.nama || '[Nama Juara 1]'}** | ${juara1.kelas || '[Kelas]'} |
| **Juara 2** | **${juara2.nama || '[Nama Juara 2]'}** | ${juara2.kelas || '[Kelas]'} |
| **Juara 3** | **${juara3.nama || '[Nama Juara 3]'}** | ${juara3.kelas || '[Kelas]'} |
| **Juara Harapan 1** | **${juaraHarapan1.nama || '[Nama Juara Harapan 1]'}** | ${juaraHarapan1.kelas || '[Kelas]'} |

### CATATAN & APRESIASI PANITIA:
1. Selamat kepada para pemenang atas kerja keras dan capaian luar biasa yang telah diraih.
2. Kepada seluruh peserta yang belum mendapatkan juara, kami menyampaikan apresiasi setinggi-tingginya atas partisipasi aktif dan semangat juangnya.
3. Penyerahan piagam penghargaan dan piala trophy akan dilaksanakan pada apel bendera resmi sekolah.

*Wassalamu’alaikum Warahmatullahi Wabarakatuh.*

Tumijajar, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}  
**Panitia Penyelenggara ${jenisKompetisi}**  
**${schoolName}**`;
        } else {
          result = `# PEMETAAN STRUKTUR MENU & ALUR ADMINISTRATIF OLIMPIADE
## KATEGORI: ${jenisKompetisi.toUpperCase()} - ${namaAcara.toUpperCase()}

Berikut adalah standar operasional prosedur (SOP) dan pemetaan menu navigasi administratif untuk pengelolaan Seleksi OSN / Olimpiade Sekolah:

### 1. MENU PENDAFTARAN & MASTER DATA PESERTA
- [x] **Registrasi Peserta Online**: Pendataan NISN, Nama Lengkap, dan Rombel Kelas.
- [x] **Verifikasi Syarat Administrative**: Cek kelengkapan nilai rapor dan rekomendasi guru pembimbing.
- [x] **Pengelompokan Bidang Studi OSN**:
  - Matematika, Fisika, Kimia, Biologi
  - Informatika / Komputer, Astronomi, Ekonomi, Kebumian, Geografi.

### 2. MENU BANK SOAL & SIMULASI CBT OLIMPIADE
- [x] **Unggah Bank Soal High Order Thinking Skills (HOTS)**
- [x] **Pengaturan Kunci Jawaban & Bobot Nilai**
- [x] **Sistem Timer Countdown & Token Akses Harian**
- [x] **Live Real-Time Monitoring Presentia & Kecurangan**

### 3. MENU ANALISIS REKAPITULASI & PENILAIAN MASAL
- [x] **Pemeriksaan Otomatis Skor Real-time**
- [x] **Analisis Daya Beda & Tingkat Kesukaran Butir Soal**
- [x] **Pemeringkatan Otomatis Ranking Top 1, 2, 3, & Harapan 1**

### 4. MENU PENERBITAN SERTIFIKAT & PENGUMUMAN DOKUMEN
- [x] **Generator Piagam Penghargaan Digital (Nomor Otomatis & QR Code)**
- [x] **Penerbitan Surat Edaran Pengumuman Resmi Pemenang**
- [x] **Arsip Digital & Portofolio Prestasi Siswa**`;
        }

        setGeneratedResult(result);
      }
    } catch (err) {
      console.error(err);
      showToast('Generasi AI', 'Menggunakan sistem penyusunan dokumen presisi internal.', 'info');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResult);
    setCopied(true);
    showToast('Teks Disalin', 'Teks dokumen olimpiade berhasil disalin ke clipboard.', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!generatedResult) return;
    const title = `${menuDipilih}: ${namaAcara}`;
    if (onApplyToAnnouncement) {
      onApplyToAnnouncement(title, generatedResult);
      showToast('Diterapkan ke Pengumuman', 'Draft teks olimpiade berhasil dimasukkan ke form pengumuman.', 'success');
      onClose();
    }
  };

  const handleExportPDF = () => {
    if (!generatedResult) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFont('arial', 'bold');
    doc.setFontSize(14);
    doc.text('DOKUMEN ADMINISTRASI OLIMPIADE SEKOALH', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('arial', 'normal');

    const lines = doc.splitTextToSize(generatedResult, 170);
    let y = 30;
    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 20, y);
      y += 6;
    });

    doc.save(`Dokumen_Olimpiade_${menuDipilih.replace(/\s+/g, '_')}.pdf`);
    showToast('PDF Berhasil Diunduh', 'Dokumen berformat A4 dengan font Arial presisi telah diunduh.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-indigo-600 to-indigo-800 p-5 sm:p-6 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
              <Medal className="w-6 h-6 text-amber-300 animate-bounce" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">AI Specialist Olimpiade & OSN</h2>
              <p className="text-xs text-amber-100 font-medium">
                Penyusun Piagam Penghargaan, Pengumuman Resmi Juara & Struktur Menu Olimpiade
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 flex-1 min-h-0 overflow-y-auto overscroll-contain text-slate-800">
          {/* Controls Form */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kompetisi</label>
              <select
                value={jenisKompetisi}
                onChange={(e) => setJenisKompetisi(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Seleksi OSN">Seleksi OSN (Olimpiade Sains Nasional)</option>
                <option value="Olimpiade Internal Sekolah">Olimpiade Internal Sekolah</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Acara / Rangkaian</label>
              <input
                type="text"
                value={namaAcara}
                onChange={(e) => setNamaAcara(e.target.value)}
                placeholder="Contoh: Dalam Rangka Seleksi OSN-K 2026"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Menu Tindakan</label>
              <select
                value={menuDipilih}
                onChange={(e) => setMenuDipilih(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Piagam">1. Penerbitan Piagam Penghargaan</option>
                <option value="Pengumuman Juara">2. Pengumuman Juara (1, 2, 3 & Harapan 1)</option>
                <option value="Struktur Menu">3. Penyusunan Struktur Menu Olimpiade</option>
              </select>
            </div>
          </div>

          {/* Winner Data Form if Menu is Piagam or Pengumuman Juara */}
          {menuDipilih !== 'Struktur Menu' && (
            <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-700" />
                <span className="text-xs font-extrabold text-amber-900 uppercase">Input Data Pemenang Juara:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Juara 1</label>
                  <input
                    type="text"
                    value={juara1.nama}
                    onChange={(e) => setJuara1({ ...juara1, nama: e.target.value })}
                    placeholder="Nama Siswa"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold mb-1"
                  />
                  <input
                    type="text"
                    value={juara1.kelas}
                    onChange={(e) => setJuara1({ ...juara1, kelas: e.target.value })}
                    placeholder="Kelas/Asal"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Juara 2</label>
                  <input
                    type="text"
                    value={juara2.nama}
                    onChange={(e) => setJuara2({ ...juara2, nama: e.target.value })}
                    placeholder="Nama Siswa"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold mb-1"
                  />
                  <input
                    type="text"
                    value={juara2.kelas}
                    onChange={(e) => setJuara2({ ...juara2, kelas: e.target.value })}
                    placeholder="Kelas/Asal"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Juara 3</label>
                  <input
                    type="text"
                    value={juara3.nama}
                    onChange={(e) => setJuara3({ ...juara3, nama: e.target.value })}
                    placeholder="Nama Siswa"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold mb-1"
                  />
                  <input
                    type="text"
                    value={juara3.kelas}
                    onChange={(e) => setJuara3({ ...juara3, kelas: e.target.value })}
                    placeholder="Kelas/Asal"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Juara Harapan 1</label>
                  <input
                    type="text"
                    value={juaraHarapan1.nama}
                    onChange={(e) => setJuaraHarapan1({ ...juaraHarapan1, nama: e.target.value })}
                    placeholder="Nama Siswa"
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold mb-1"
                  />
                  <input
                    type="text"
                    value={juaraHarapan1.kelas}
                    onChange={(e) => setJuaraHarapan1({ ...juaraHarapan1, kelas: e.target.value })}
                    placeholder="Kelas/Asal"
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Format EYD V Bahasa Indonesia Baku, Siap Digunakan Langsung.
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
              <span>{isGenerating ? 'Generasi Teks...' : 'Generasi Dokumen AI'}</span>
            </button>
          </div>

          {/* Result Output Preview */}
          {generatedResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Pratinjau Hasil Dokumen Resmi Olimpiade:
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cetak PDF A4</span>
                  </button>

                  {onApplyToAnnouncement && (
                    <button
                      type="button"
                      onClick={handleApply}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbit ke Pengumuman</span>
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={generatedResult}
                onChange={(e) => setGeneratedResult(e.target.value)}
                rows={12}
                className="w-full p-4 bg-slate-900 text-slate-100 font-mono text-xs rounded-2xl border border-slate-800 focus:ring-2 focus:ring-amber-400 focus:outline-hidden leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-500 font-medium text-[11px]">
            AI Specialist Olimpiade &amp; Seleksi OSN SMAN 3 Tumijajar
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer transition-colors text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
