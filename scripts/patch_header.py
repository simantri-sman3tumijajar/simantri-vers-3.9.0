with open('src/components/Header.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Imports
if 'NotificationBellDropdown' not in text:
    old_imp = "import { NetworkBandwidthBadge } from './NetworkBandwidthBadge';"
    new_imp = "import { NetworkBandwidthBadge } from './NetworkBandwidthBadge';\nimport { NotificationBellDropdown } from './NotificationBellDropdown';\nimport { FeedbackModal } from './FeedbackModal';"
    text = text.replace(old_imp, new_imp, 1)

# 2. State
if 'isFeedbackModalOpen' not in text:
    old_state = "  const [showProfileMenu, setShowProfileMenu] = useState(false);"
    new_state = "  const [showProfileMenu, setShowProfileMenu] = useState(false);\n  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);"
    text = text.replace(old_state, new_state, 1)

# 3. Insert NotificationBellDropdown before Profile
if '<NotificationBellDropdown />' not in text:
    old_bell_loc = "{/* Profil Pengguna & Pusat Akses Lengkap Terpadu */}"
    new_bell_loc = "{/* Lonceng Notifikasi Real-Time Selektif & Anti-Spam */}\n            <NotificationBellDropdown />\n\n            {/* Profil Pengguna & Pusat Akses Lengkap Terpadu */}"
    text = text.replace(old_bell_loc, new_bell_loc, 1)

# 4. Add Feedback button inside Profile dropdown
if 'Beri Masukan & Testimoni' not in text:
    old_menu_btn = "                      {/* Tombol Logout */}"
    new_menu_btn = """                      {/* Tombol Buka Modal Feedback / Aspirasi */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setIsFeedbackModalOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors text-left cursor-pointer group"
                      >
                        <MessageSquarePlus className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                        <span>Kirim Aspirasi &amp; Testimoni</span>
                      </button>

                      {/* Tombol Logout */}"""
    text = text.replace(old_menu_btn, new_menu_btn, 1)

# 5. Add FeedbackModal before closing header tag
if '<FeedbackModal' not in text:
    old_close = "    </header>"
    new_close = """      {/* Modal Aspirasi & Masukan Pengguna Real-Time */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </header>"""
    text = text.replace(old_close, new_close, 1)

with open('src/components/Header.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Header successfully updated with Notification Bell & Feedback Modal')
