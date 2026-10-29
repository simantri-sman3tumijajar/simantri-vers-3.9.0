#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
========================================================================================
Eksport Nilai Raport STS Siswa ke PDF Presisi (Standar Desain Dokumen Resmi)
========================================================================================
Penulis       : Senior Python Developer & Pakar Desain Dokumen
Deskripsi     : Skrip Python berbasis ReportLab untuk mengekspor data Raport Sumatif
                Tengah Semester (STS) ke dalam format PDF berstandar cetak resmi A4 Portrait.
                Mendukung integrasi data dinamis (List of Dict / Pandas DataFrame).
Spesifikasi   :
  - Kertas    : A4 Portrait (210 x 297 mm)
  - Margin    : Atas 2 cm, Bawah 2 cm, Kiri 2.5 cm, Kanan 2 cm
  - Tipografi : Times-Roman / Helvetica (Serif / Sans-serif)
  - Tabel     : 4 Kolom bergaris grid tegas, background header abu-abu muda, text wrapping otomatis
  - Footer    : Blok tanda tangan di sisi kanan dokumen dengan tanggal pengoreksian dinamis
========================================================================================
"""

import os
from datetime import datetime
from typing import List, Dict, Any, Union

# Import pustaka ReportLab
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm, mm, pt
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        Table,
        TableStyle,
        KeepTogether,
    )
except ImportError:
    # Catatan: Install reportlab dengan perintah: pip install reportlab
    pass


def format_tanggal_indonesia(dt_input: Union[str, datetime, None] = None) -> str:
    """
    Mengonversi tanggal pengoreksian menjadi format tanggal baku bahasa Indonesia.
    Contoh: '8 Oktober 2026'
    """
    nama_bulan = [
        "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ]
    
    if dt_input is None:
        dt = datetime.now()
    elif isinstance(dt_input, datetime):
        dt = dt_input
    elif isinstance(dt_input, str):
        # Bersihkan string tanggal jika ada pemisah waktu ISO (contoh '2026-10-08 14:30' atau '2026-10-08')
        clean_str = dt_input.split("T")[0].split(" ")[0]
        try:
            dt = datetime.strptime(clean_str, "%Y-%m-%d")
        except ValueError:
            return dt_input  # Kembalikan string asli jika format bebas
    else:
        dt = datetime.now()

    return f"{dt.day} {nama_bulan[dt.month]} {dt.year}"


def get_kktp_capaian(nilai: int, mapel: str = "") -> str:
    """
    Menghasilkan narasi Capaian Kompetensi resmi sesuai panduan diagram KKTP:
    0 - 60   : "Peserta didik kurang mampu ..........................."
    61 - 70  : "Peserta didik cukup mampu ..........................."
    71 - 80  : "Peserta didik mampu ..........................."
    81 - 100 : "Peserta didik sangat mampu ..........................."
    """
    m_str = f" pada materi {mapel}" if mapel else " materi asesmen"
    skor = max(0, min(100, int(nilai or 0)))
    if skor >= 81:
        return f"Peserta didik sangat mampu menganalisis, mengevaluasi, dan menguasai konsep{m_str} dengan penalaran kritis tinggi serta merekonstruksi pemecahan masalah secara komprehensif."
    elif skor >= 71:
        return f"Peserta didik mampu memahami dan mengaplikasikan konsep{m_str} secara mandiri, tepat, dan berkesadaran sesuai kriteria ketuntasan tujuan pembelajaran."
    elif skor >= 61:
        return f"Peserta didik cukup mampu memahami konsep dasar{m_str}, namun masih memerlukan penguatan terarah dalam menyelesaikan penalaran mendalam dan prosedur pemecahan masalah."
    else:
        return f"Peserta didik kurang mampu memahami konsep dasar{m_str}, memerlukan pendampingan intensif dan program remedial terstruktur guna menumbuhkan daya nalar yang bermakna."


def export_raport_sts_pdf(
    output_filepath: str,
    data_siswa: Union[List[Dict[str, Any]], Any],
    kelas: str = "X.1",
    semester: int = 1,
    tahun_ajaran: str = "2026/2027",
    fase: str = "E",
    mata_pelajaran: str = "Bahasa Indonesia",
    tanggal_pengoreksian: Union[str, datetime, None] = None,
    nama_guru: str = "........................................................",
    nip_guru: str = ""
) -> str:
    """
    Membangun file PDF Raport STS berdasarkan data siswa dan metadata yang diberikan.

    :param output_filepath: Lokasi file PDF hasil ekspor (misal: 'NILAI_RAPORT_STS_X.1.pdf')
    :param data_siswa: List of Dict atau Pandas DataFrame berisi kolom 'nama', 'nilai_akhir', 'capaian_kompetensi'
    :param kelas: Nama rombongan belajar (default: 'X.1')
    :param semester: Nomor semester (1 atau 2)
    :param tahun_ajaran: Tahun ajaran (default: '2026/2027')
    :param fase: Fase kurikulum (default: 'E')
    :param mata_pelajaran: Nama mata pelajaran
    :param tanggal_pengoreksian: Tanggal pelaksanaan koreksi (default: tanggal hari ini)
    :param nama_guru: Nama lengkap guru pengampu beserta gelar
    :param nip_guru: NIP guru (opsional)
    :return: Path file PDF yang berhasil dibuat
    """
    # -------------------------------------------------------------------------
    # 1. KONFIGURASI HALAMAN & MARGIN (Sesuai Spesifikasi: Atas/Bawah/Kanan 2cm, Kiri 2.5cm)
    # -------------------------------------------------------------------------
    MARGIN_TOP = 2.0 * cm
    MARGIN_BOTTOM = 2.0 * cm
    MARGIN_LEFT = 2.5 * cm
    MARGIN_RIGHT = 2.0 * cm

    # Lebar area cetak bersih (Printable Width)
    PAGE_WIDTH, PAGE_HEIGHT = A4
    PRINTABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

    doc = SimpleDocTemplate(
        output_filepath,
        pagesize=A4,
        leftMargin=MARGIN_LEFT,
        rightMargin=MARGIN_RIGHT,
        topMargin=MARGIN_TOP,
        bottomMargin=MARGIN_BOTTOM,
        title=f"NILAI RAPORT STS KELAS {kelas} - {mata_pelajaran}",
        author="Sistem Raport Resmi",
    )

    styles = getSampleStyleSheet()

    # -------------------------------------------------------------------------
    # 2. DEFINISI GAYA TIPOGRAFI (TYPOGRAPHY STYLES)
    # -------------------------------------------------------------------------
    # Menggunakan font Serif standar Times-Roman (atau Helvetica jika disukai)
    FONT_FAMILY = "Times-Roman"
    FONT_BOLD = "Times-Bold"
    FONT_ITALIC = "Times-Italic"

    # Gaya Judul Utama (14pt, Bold, Center, Kapital)
    style_judul = ParagraphStyle(
        name="JudulRaport",
        fontName=FONT_BOLD,
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textTransform="uppercase",
        textColor=colors.black,
    )

    # Gaya Metadata (11pt, Times-Roman)
    style_meta_label = ParagraphStyle(
        name="MetaLabel",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=15,
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    style_meta_value = ParagraphStyle(
        name="MetaValue",
        fontName=FONT_FAMILY,
        fontSize=11,
        leading=15,
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    style_meta_fase = ParagraphStyle(
        name="MetaFase",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=15,
        alignment=TA_RIGHT,
        textColor=colors.black,
    )

    # Gaya Header Tabel (11pt, Bold, Center, Kapital)
    style_th = ParagraphStyle(
        name="TableHeader",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.black,
    )

    # Gaya Data Tabel (10pt, Reguler)
    style_td_center = ParagraphStyle(
        name="TableCellCenter",
        fontName=FONT_FAMILY,
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.black,
    )
    style_td_left = ParagraphStyle(
        name="TableCellLeft",
        fontName=FONT_BOLD,  # Nama siswa dicetak tegas
        fontSize=10,
        leading=13,
        alignment=TA_LEFT,
        textColor=colors.black,
    )
    style_td_ck = ParagraphStyle(
        name="TableCellCK",
        fontName=FONT_FAMILY,
        fontSize=10,
        leading=13.5,
        alignment=TA_JUSTIFY,
        textColor=colors.black,
    )

    # Gaya Tanda Tangan Footer (11pt)
    style_sign_date = ParagraphStyle(
        name="SignDate",
        fontName=FONT_ITALIC,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.black,
    )
    style_sign_role = ParagraphStyle(
        name="SignRole",
        fontName=FONT_FAMILY,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.black,
    )
    style_sign_name = ParagraphStyle(
        name="SignName",
        fontName=FONT_BOLD,
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        textColor=colors.black,
    )
    style_sign_nip = ParagraphStyle(
        name="SignNIP",
        fontName=FONT_FAMILY,
        fontSize=10,
        leading=14,
        alignment=TA_CENTER,
        textColor=colors.black,
    )

    story = []

    # -------------------------------------------------------------------------
    # 3. INFORMASI JUDUL & HEADER DOKUMEN
    # -------------------------------------------------------------------------
    # Judul Utama: NILAI RAPORT STS KELAS X.1 SEMESTER 1 T.A 2026/2027
    teks_judul = f"NILAI RAPORT STS KELAS {kelas} SEMESTER {semester} T.A {tahun_ajaran}"
    story.append(Paragraph(teks_judul, style_judul))

    # Baris Kosong setelah Judul Utama (Padding 15-20pt)
    story.append(Spacer(1, 18 * pt))

    # Baris Metadata: KELAS & FASE (Sejajar Kanan-Kiri), diikuti MAPEL
    # Menggunakan Table transparan borderless agar posisi sejajar presisi
    mapel_display = mata_pelajaran if mata_pelajaran else "........................................"
    metadata_table_data = [
        [
            Paragraph(f"<b>KELAS</b> : {kelas}", style_meta_label),
            Paragraph(f"<b>FASE {fase.upper().replace('FASE ', '')}</b>", style_meta_fase),
        ],
        [
            Paragraph(f"MAPEL : {mapel_display}", style_meta_value),
            Paragraph("", style_meta_value),
        ],
    ]

    metadata_table = Table(
        metadata_table_data,
        colWidths=[PRINTABLE_WIDTH * 0.70, PRINTABLE_WIDTH * 0.30],
        style=[
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 1),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ],
    )
    story.append(metadata_table)

    # Baris Kosong setelah Metadata (Jarak 15pt sebelum tabel dimulai)
    story.append(Spacer(1, 15 * pt))

    # -------------------------------------------------------------------------
    # 4. STRUKTUR & BENTUK TABEL (GRID PRESISI & TEXT WRAPPING)
    # -------------------------------------------------------------------------
    # Lebar kolom proporsional (Total pas dengan PRINTABLE_WIDTH):
    # Kolom 1 (NO): 32 pt (~1.1 cm)
    # Kolom 2 (NAMA): 120 pt (~4.2 cm)
    # Kolom 3 (NILAI AKHIR): 68 pt (~2.4 cm)
    # Kolom 4 (CAPAIAN KOMPETENSI): Sisa lebar (~247.7 pt / ~8.7 cm)
    col_w_no = 32 * pt
    col_w_nama = 120 * pt
    col_w_nilai = 68 * pt
    col_w_ck = PRINTABLE_WIDTH - (col_w_no + col_w_nama + col_w_nilai)

    # Baris Header Tabel (Kapital, Bold, Center, Background Abu-abu muda)
    tabel_data = [
        [
            Paragraph("NO", style_th),
            Paragraph("NAMA", style_th),
            Paragraph("NILAI AKHIR", style_th),
            Paragraph("CAPAIAN KOMPETENSI", style_th),
        ]
    ]

    # Parsing data siswa (Mendukung Dict atau Pandas DataFrame)
    if hasattr(data_siswa, "iterrows"):
        # Pandas DataFrame
        records = data_siswa.to_dict(orient="records")
    elif isinstance(data_siswa, list):
        records = data_siswa
    else:
        records = []

    for idx, row in enumerate(records, start=1):
        nama_str = str(row.get("nama") or row.get("nama_siswa") or f"Siswa {idx}")
        nilai_val = row.get("nilai_akhir") if row.get("nilai_akhir") is not None else row.get("nilai", 0)
        ck_text = str(
            row.get("capaian_kompetensi")
            or row.get("ck")
            or get_kktp_capaian(nilai_val, mata_pelajaran)
        )

        tabel_data.append([
            Paragraph(str(idx), style_td_center),
            Paragraph(nama_str.upper(), style_td_left),
            Paragraph(str(nilai_val), style_td_center),
            Paragraph(ck_text, style_td_ck),
        ])

    # Warna Abu-abu muda untuk Header Tabel (Light Grey: #E5E7EB)
    warna_header_grey = colors.HexColor("#E5E7EB")

    tabel_style = TableStyle([
        # Background Header
        ("BACKGROUND", (0, 0), (-1, 0), warna_header_grey),
        # Penataan Vertikal & Padding Sel
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4.5 * pt),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4.5 * pt),
        ("LEFTPADDING", (0, 0), (-1, -1), 5.0 * pt),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5.0 * pt),
        # Garis Tabel (Borders): Garis hitam tipis yang tegas (Solid thin line: 0.5pt)
        ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.black),
    ])

    nilai_table = Table(
        tabel_data,
        colWidths=[col_w_no, col_w_nama, col_w_nilai, col_w_ck],
        style=tabel_style,
        repeatRows=1,  # Mengulang header jika tabel berlanjut ke halaman berikutnya
    )
    story.append(nilai_table)

    # -------------------------------------------------------------------------
    # 5. PENATAAN TANDA TANGAN (FOOTER DOKUMEN: RIGHT-ALIGN)
    # -------------------------------------------------------------------------
    # Baris kosong jeda space 30-40pt setelah tabel
    story.append(Spacer(1, 35 * pt))

    # Tanggal Pengoreksian Dinamis
    tanggal_formatted = format_tanggal_indonesia(tanggal_pengoreksian)

    # Blok Tanda Tangan diletakkan di sisi kanan dengan lebar 200pt
    SIGN_BLOCK_WIDTH = 200 * pt
    SPACE_LEFT_WIDTH = PRINTABLE_WIDTH - SIGN_BLOCK_WIDTH

    ttd_elements = [
        Paragraph(f"Tumijajar, {tanggal_formatted}", style_sign_date),
        Spacer(1, 3 * pt),
        Paragraph("Guru Mapel", style_sign_role),
        Spacer(1, 55 * pt),  # Jarak kosong 50-60pt untuk tanda tangan basah fisik
        Paragraph(f"<u>{nama_guru}</u>" if nama_guru else "........................................................", style_sign_name),
    ]

    if nip_guru:
        ttd_elements.append(Spacer(1, 2 * pt))
        ttd_elements.append(Paragraph(f"NIP. {nip_guru}", style_sign_nip))

    # Susun ke dalam tabel 2 kolom agar posisinya otomatis rata kanan (Right-align)
    footer_table_data = [
        [
            Paragraph("", style_td_left),  # Kolom kiri kosong sebagai pendorong
            ttd_elements,                  # Kolom kanan memuat blok tanda tangan
        ]
    ]

    footer_table = Table(
        footer_table_data,
        colWidths=[SPACE_LEFT_WIDTH, SIGN_BLOCK_WIDTH],
        style=[
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ],
    )

    # Pastikan blok tanda tangan tidak terpotong antar halaman
    story.append(KeepTogether(footer_table))

    # -------------------------------------------------------------------------
    # 6. GENERASI DOKUMEN PDF
    # -------------------------------------------------------------------------
    doc.build(story)
    return output_filepath


# =============================================================================
# CONTOH PENGGUNAAN & UJI JALAN (STANDALONE DEMO EXECUTION)
# =============================================================================
if __name__ == "__main__":
    print("===================================================================")
    print("  SIMULASI EKSPOR RAPORT STS SISWA KE PDF DENGAN REPORTLAB")
    print("===================================================================")

    # 1. Sampel Data Siswa Dinamis (Menampilkan 4 Rentang KKTP Resmi sesuai Panduan)
    sampel_siswa = [
        {
            "nama": "ADITYA PRATAMA",
            "nilai_akhir": 92,
            "capaian_kompetensi": "Peserta didik sangat mampu menganalisis ide pokok, struktur teks argumentasi, serta mampu merefleksikan gagasan kritis secara komprehensif.",
        },
        {
            "nama": "AISYAH NUR AZIZAH",
            "nilai_akhir": 78,
            "capaian_kompetensi": "Peserta didik mampu memahami dan mengaplikasikan kaidah kebahasaan teks eksposisi secara mandiri dan tepat.",
        },
        {
            "nama": "BAGAS PRASETYO",
            "nilai_akhir": 66,
            "capaian_kompetensi": "Peserta didik cukup mampu mengidentifikasi kalimat fakta dan opini, namun masih memerlukan penguatan terarah dalam menyusun kesimpulan logis.",
        },
        {
            "nama": "CANTIKA PUTRI WULANDARI",
            "nilai_akhir": 55,
            "capaian_kompetensi": "Peserta didik kurang mampu memahami struktur teks laporan hasil observasi, memerlukan pendampingan intensif dan program remedial terstruktur.",
        },
        {
            "nama": "DIMAS WAHYU SAPUTRA",
            "nilai_akhir": 85,
            "capaian_kompetensi": "Peserta didik sangat mampu mengevaluasi akurasi data serta memproduksi teks argumentasi dengan penalaran kritis tinggi.",
        },
    ]

    # 2. Tanggal Pengoreksian (Otomatis / Dinamis dari waktu koreksi)
    tanggal_koreksi_sample = "2026-10-08"

    # 3. Jalankan Generator PDF
    output_pdf = "NILAI_RAPORT_STS_KELAS_X.1.pdf"
    
    try:
        hasil = export_raport_sts_pdf(
            output_filepath=output_pdf,
            data_siswa=sampel_siswa,
            kelas="X.1",
            semester=1,
            tahun_ajaran="2026/2027",
            fase="E",
            mata_pelajaran="Bahasa Indonesia",
            tanggal_pengoreksian=tanggal_koreksi_sample,
            nama_guru="Dra. Siti Rahmawati, M.Pd.",
            nip_guru="19780512 200501 2 008",
        )
        print(f"[BERHASIL] File PDF Raport STS telah dibuat: {hasil}")
        print("Spesifikasi Layout:")
        print("  - Kertas: A4 Portrait, Margin: 2cm (Atas, Bawah, Kanan), 2.5cm (Kiri)")
        print("  - Header: Abu-abu muda (#E5E7EB), Borders: Solid thin black grid")
        print("  - Tanggal Footer: Berdasarkan tanggal pengoreksian dinamis")
    except Exception as e:
        print(f"[INFO] Eksekusi mandiri memerlukan paket 'reportlab'.")
        print(f"       Gunakan: pip install reportlab")
        print(f"       Detail error: {e}")
