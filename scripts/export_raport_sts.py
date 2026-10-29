#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Eksport Nilai Raport STS Siswa ke PDF Presisi (ReportLab)
Lokasi: scripts/export_raport_sts.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from export_raport_sts import export_raport_sts_pdf, format_tanggal_indonesia, get_kktp_capaian

if __name__ == "__main__":
    from export_raport_sts import export_raport_sts_pdf
    print("Skrip ReportLab siap digunakan untuk ekspor Raport STS dengan standar KKTP.")
