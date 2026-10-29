import os

context_file = 'src/context/AppContext.tsx'
with open(context_file, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add notification methods if not present
needle = "      showToast('Umpan Balik Direset', 'Data umpan balik lokal & cloud berhasil dibersihkan ke semula.', 'success');\n      return true;\n    }\n  };"

funcs = """      showToast('Umpan Balik Direset', 'Data umpan balik lokal & cloud berhasil dibersihkan ke semula.', 'success');
      return true;
    }
  };

  const addNotification = async (
    notifData: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }
  ): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const notif: AppNotification = {
      ...notifData,
      id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    const currentNotifs = cur.notifications || [];
    const isDup = currentNotifs.some(
      (n) =>
        n.recipientId === notif.recipientId &&
        n.category === notif.category &&
        n.targetId === notif.targetId &&
        Date.now() - new Date(n.createdAt).getTime() < 2 * 60 * 1000
    );
    if (isDup) return true;

    const updated = [notif, ...currentNotifs].slice(0, 150);
    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const markNotificationAsRead = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.map((n) =>
      n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n
    );

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const markAllNotificationsAsRead = async (userId: string, role?: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.map((n) => {
      const isForUser =
        n.recipientId === userId ||
        (role === 'admin' && (n.recipientId === 'ROLE_ADMIN' || n.recipientRole === 'admin')) ||
        (role === 'operator' && (n.recipientId === 'ROLE_OPERATOR' || n.recipientRole === 'operator')) ||
        ((role === 'guru' || role === 'kesiswaan') &&
          (n.recipientId === 'ALL_TEACHERS' || n.recipientRole === 'guru'));

      if (isForUser && !n.read) {
        return { ...n, read: true, readAt: new Date().toISOString() };
      }
      return n;
    });

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const deleteNotification = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentNotifs = cur.notifications || [];
    const updated = currentNotifs.filter((n) => n.id !== id);

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: updated,
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const clearAllNotifications = async (): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const newState: AppState = {
      ...cur,
      version: (cur.version || 1) + 1,
      notifications: [],
    };

    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncChannelRef.current?.postMessage({ type: 'STATE_UPDATED' });
    syncStateToServer(newState);
    return true;
  };

  const toggleFeedbackBestTestimonial = async (id: string): Promise<boolean> => {
    const cur = stateRef.current;
    if (!cur) return false;

    const currentFeedbacks = cur.feedbacks || [];
    const updated = currentFeedbacks.map((f) => {
      if (f.id === id) {
        return { ...f, isBestTestimonial: !f.isBestTestimonial };
      }
      return f;
    });

    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    syncStateToServer(newState);
    showToast('Testimoni Diperbarui', 'Status testimoni unggulan berhasil diubah.', 'info');
    return true;
  };"""

if needle in text and 'const addNotification =' not in text:
    text = text.replace(needle, funcs, 1)

# 2. Update saveFeedback to auto-generate notification for Admin/Operator
old_fb = "    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated };\n    stateRef.current = newState;\n    setState(newState);\n    persistLocalState(newState);\n    showToast('Umpan Balik Terkirim!', 'Terima kasih, saran & masukan Anda telah terkirim dan langsung termonitor oleh Administrator.', 'success');\n    syncStateToServer(newState);\n    return true;\n  };"

new_fb = """    const feedbackNotif: AppNotification = {
      id: `notif-fb-${feedback.id || Date.now()}-${Date.now()}`,
      recipientId: 'ROLE_ADMIN',
      recipientRole: 'admin',
      category: 'feedback_baru',
      title: 'Masukan / Feedback Baru Masuk',
      message: `${feedback.teacherName} (${feedback.userRole || 'Guru'}) mengirimkan ${feedback.kategori}: "${feedback.judul}" (${feedback.rating || 5} Bintang).`,
      targetModule: 'manajemen-data',
      targetView: 'feedback-center',
      targetId: feedback.id,
      read: false,
      createdAt: new Date().toISOString(),
      priority: 'normal',
      senderName: feedback.teacherName,
      senderRole: feedback.userRole || 'Guru',
    };
    const currentNotifs = cur.notifications || [];
    const updatedNotifs = [feedbackNotif, ...currentNotifs].slice(0, 150);

    const newState = { ...cur, version: (cur.version || 1) + 1, feedbacks: updated, notifications: updatedNotifs };
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);
    showToast('Umpan Balik Terkirim!', 'Terima kasih, saran & masukan Anda telah terkirim dan langsung termonitor oleh Administrator.', 'success');
    syncStateToServer(newState);
    return true;
  };"""

if old_fb in text:
    text = text.replace(old_fb, new_fb, 1)

# 3. Update saveTeacherExamAssignment to send notifications
old_asgn = "    showToast('Penugasan Guru Tersimpan', `Penggarapan soal ${assignment.subjectName} oleh ${assignment.teacherName} diperbarui.`, 'success');\n    await syncStateToServer(newState);\n    return true;\n  };"

new_asgn = """    const currentNotifs = cur.notifications || [];
    let updatedNotifs = [...currentNotifs];

    if (index < 0) {
      // Penugasan Soal Baru
      updatedNotifs.unshift({
        id: `notif-asgn-${assignment.id}-${Date.now()}`,
        recipientId: assignment.teacherId,
        recipientRole: 'guru',
        category: 'penugasan_baru',
        title: 'Penugasan Paket Soal Baru',
        message: `Anda ditugaskan menyusun paket soal ${assignment.subjectName} (${assignment.category}) target ${assignment.targetQuestions} butir soal. Batas waktu: ${assignment.dueDate}.`,
        targetModule: 'sumatif',
        targetView: 'assessments',
        targetId: assignment.id,
        read: false,
        createdAt: new Date().toISOString(),
        priority: 'high',
        senderName: 'Admin / Operator',
        senderRole: 'admin',
      });
    } else {
      const oldAsgn = existingAssignments[index];
      if (assignment.status === 'Telah Diverifikasi' && oldAsgn?.status !== 'Telah Diverifikasi') {
        updatedNotifs.unshift({
          id: `notif-vld-${assignment.id}-${Date.now()}`,
          recipientId: assignment.teacherId,
          recipientRole: 'guru',
          category: 'validasi_revisi',
          title: 'Paket Soal Disetujui (Approved)',
          message: `Selamat, paket soal ${assignment.subjectName} (${assignment.category}) Anda telah disetujui & diverifikasi oleh Admin/Kurikulum.`,
          targetModule: 'sumatif',
          targetView: 'assessments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'normal',
          senderName: 'Admin / Kurikulum',
          senderRole: 'admin',
        });
      } else if (assignment.status === 'Sedang Digarap' && assignment.validationNotes && assignment.validationNotes !== oldAsgn?.validationNotes) {
        updatedNotifs.unshift({
          id: `notif-rev-${assignment.id}-${Date.now()}`,
          recipientId: assignment.teacherId,
          recipientRole: 'guru',
          category: 'validasi_revisi',
          title: 'Catatan Revisi Paket Soal',
          message: `Paket soal ${assignment.subjectName} (${assignment.category}) memerlukan revisi: "${assignment.validationNotes}".`,
          targetModule: 'sumatif',
          targetView: 'assessments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high',
          senderName: 'Admin / Kurikulum',
          senderRole: 'admin',
        });
      } else if (assignment.status === 'Selesai Digarap' && oldAsgn?.status !== 'Selesai Digarap') {
        updatedNotifs.unshift({
          id: `notif-done-${assignment.id}-${Date.now()}`,
          recipientId: 'ROLE_ADMIN',
          recipientRole: 'admin',
          category: 'tugas_selesai',
          title: 'Penyelesaian Tugas Soal',
          message: `Guru ${assignment.teacherName} telah menyelesaikan 100% target butir soal (${assignment.targetQuestions} butir) untuk ${assignment.subjectName} (${assignment.category}). Siap diverifikasi.`,
          targetModule: 'manajemen-ujian',
          targetView: 'exam-assignments',
          targetId: assignment.id,
          read: false,
          createdAt: new Date().toISOString(),
          priority: 'high',
          senderName: assignment.teacherName,
          senderRole: 'guru',
        });
      }
    }

    newState.notifications = updatedNotifs.slice(0, 150);
    stateRef.current = newState;
    setState(newState);
    persistLocalState(newState);

    showToast('Penugasan Guru Tersimpan', `Penggarapan soal ${assignment.subjectName} oleh ${assignment.teacherName} diperbarui.`, 'success');
    await syncStateToServer(newState);
    return true;
  };"""

if old_asgn in text:
    text = text.replace(old_asgn, new_asgn, 1)

# 4. Update provider value export
prov_needle = "        clearAllFeedbacks,"
prov_addition = """        clearAllFeedbacks,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteNotification,
        clearAllNotifications,
        toggleFeedbackBestTestimonial,"""

if prov_needle in text and 'addNotification,' not in text:
    text = text.replace(prov_needle, prov_addition, 1)

with open(context_file, 'w', encoding='utf-8') as f:
    f.write(text)

print('Context patched successfully')
