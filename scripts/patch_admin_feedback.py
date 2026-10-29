with open('src/components/AdminFeedbackManagementView.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add toggleFeedbackBestTestimonial to useApp destructuring
old_use_app = "const { state, updateFeedbackStatus, deleteFeedback, clearAllFeedbacks, showToast } = useApp();"
new_use_app = "const { state, updateFeedbackStatus, deleteFeedback, clearAllFeedbacks, toggleFeedbackBestTestimonial, showToast } = useApp();"
if old_use_app in text:
    text = text.replace(old_use_app, new_use_app, 1)

# 2. Update stats to include saran, kritik, testimoni, bestTestimonials
old_stats_code = """    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '-';

    return {
      total,
      baruCount,
      ditinjauCount,
      ditindaklanjutiCount,
      avgRating,"""

new_stats_code = """    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '-';
    const saranCount = feedbacks.filter((f) => f.kategori === 'Saran Pengembangan' || f.kategori === 'Saran Fitur').length;
    const kritikCount = feedbacks.filter((f) => f.kategori === 'Kritik / Laporan Kendala').length;
    const testimoniCount = feedbacks.filter((f) => f.kategori === 'Testimoni Penggunaan' || f.kategori === 'Apresiasi').length;
    const bestTestimonialCount = feedbacks.filter((f) => f.isBestTestimonial).length;

    return {
      total,
      baruCount,
      ditinjauCount,
      ditindaklanjutiCount,
      avgRating,
      saranCount,
      kritikCount,
      testimoniCount,
      bestTestimonialCount,"""

if old_stats_code in text:
    text = text.replace(old_stats_code, new_stats_code, 1)

# 3. Update filtering logic for 'Testimoni Unggulan'
old_filter = "if (selectedCategory !== 'ALL' && f.kategori !== selectedCategory) return false;"
new_filter = """if (selectedCategory === 'Testimoni Unggulan') {
        if (!f.isBestTestimonial) return false;
      } else if (selectedCategory !== 'ALL' && f.kategori !== selectedCategory) {
        return false;
      }"""
if old_filter in text:
    text = text.replace(old_filter, new_filter, 1)

# 4. Add 'Testimoni Unggulan' button and toggle button on cards
card_needle = "                      {/* Tombol Hapus */}"
card_addition = """                      {/* Tombol Tandai Testimoni Terbaik */}
                      <button
                        onClick={() => toggleFeedbackBestTestimonial(f.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          f.isBestTestimonial
                            ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title={f.isBestTestimonial ? 'Hapus dari Testimoni Terbaik' : 'Tandai sebagai Testimoni Terbaik'}
                      >
                        <Star className={`w-3.5 h-3.5 ${f.isBestTestimonial ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                        <span>{f.isBestTestimonial ? 'Testimoni Unggulan' : 'Jadikan Unggulan'}</span>
                      </button>

                      {/* Tombol Hapus */}"""

if card_needle in text and 'Testimoni Unggulan' not in text:
    text = text.replace(card_needle, card_addition, 1)

with open('src/components/AdminFeedbackManagementView.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('AdminFeedbackManagementView successfully patched')
