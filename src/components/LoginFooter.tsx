import React from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';

export interface LoginFooterProps {
  isDarkBg?: boolean;
  academicYear?: string;
  semester?: string;
  schoolName?: string;
  className?: string;
}

export const LoginFooter: React.FC<LoginFooterProps> = ({
  isDarkBg = false,
  academicYear,
  semester,
  schoolName,
  className = '',
}) => {
  const { state } = useApp();
  const { t } = useLanguage();
  const school = state?.schoolInfo;

  const finalAcademicYear = academicYear || school?.tahunAjaranAktif || '2026/2027';
  const finalSemester = semester || school?.semesterAktif || 'Ganjil';
  const finalSchoolName = schoolName || school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR';

  return (
    <footer
      className={`mt-auto py-4 text-center space-y-0.5 relative z-10 w-full shrink-0 ${className}`}
    >
      <p
        className={`text-xs font-medium leading-relaxed ${
          isDarkBg
            ? 'text-white/90 drop-shadow-sm'
            : 'text-slate-700'
        }`}
      >
        {t('header.academic_year', 'Tahun Pelajaran')} {finalAcademicYear} • {t('header.semester', 'Semester')} {finalSemester}
      </p>
      <p
        className={`text-xs font-bold tracking-wide leading-relaxed ${
          isDarkBg
            ? 'text-white drop-shadow-sm'
            : 'text-slate-900'
        }`}
      >
        © 2026 {finalSchoolName}
      </p>
    </footer>
  );
};

export default LoginFooter;
