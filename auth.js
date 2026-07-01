/* auth.js — ระบบยืนยันตัวตนด้วยรหัสพนักงาน (ใช้งานร่วมกับทุกหน้าใน ACC CRM) */
(() => {
  // ===== ข้อมูลพนักงาน (แก้ไข/เพิ่มรายชื่อได้ที่นี่) =====
  const EMPLOYEES = [
    { code: 'D-001', name: 'ชัญชนันท์ รัตนวิจิตร' },
    { code: 'D-002', name: 'สิริญาภรณ์ ฉลอง' },
    { code: 'D-005', name: 'วันทกานต์ ศรีคำแหง' },
    { code: 'D-017', name: 'ศศิวิมล เมตตา' },
    { code: 'D-019', name: 'ฤทธิรงค์ ทองอ่อน' },
    { code: 'D-020', name: 'ชลิตา คล้ายคลึง' },
    { code: 'D-023', name: 'อรภา นพกูลวงษ์' },
    { code: 'D-024', name: 'อำภาพร ช่วยพิเคราะห์' },
    { code: 'D-026', name: 'กมลวรรณ ดีการ' },
    { code: 'D-027', name: 'อรทัย ทองอ่อน' },
    { code: 'D-029', name: 'ณัฐณิชา วิริยะกิจ' },
    { code: 'D-030', name: 'ธนพร เจริญรื่น' },
    { code: 'D-031', name: 'ชนิดษฎา ไชยนันตา' },
    { code: 'D-032', name: 'สุรีมาศ ผลสุข' },
    { code: '12-D-002', name: 'สุพิชชา ปฏิสังข์' },
    { code: '12-D-003', name: 'มานิตา ปฏิสังข์' },
    { code: '12-D-004', name: 'สาธิตา ผลสุข' },
    { code: '0', name: 'บอส' }
  ];

  const SESSION_KEY = 'accCrmSession';
  const LOGIN_PAGE = 'login.html';
  const AVATAR_PREFIX = 'accCrmAvatar_';
  const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2);
  }

  function findEmployee(code) {
    if (!code) return null;
    return EMPLOYEES.find((e) => e.code.toLowerCase() === code.toLowerCase()) || null;
  }

  function login(code) {
    const emp = findEmployee(code);
    if (!emp) return null;
    const session = { code: emp.code, name: emp.name, loginAt: Date.now() };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = LOGIN_PAGE;
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function requireAuth() {
    const session = getSession();
    if (!session || !findEmployee(session.code)) {
      window.location.href = LOGIN_PAGE;
      return null;
    }
    return session;
  }

  function getAvatar(code) {
    if (!code) return null;
    try {
      return localStorage.getItem(AVATAR_PREFIX + code.toUpperCase()) || null;
    } catch (e) {
      return null;
    }
  }

  function setAvatar(code, dataUrl) {
    if (!code) return false;
    try {
      localStorage.setItem(AVATAR_PREFIX + code.toUpperCase(), dataUrl);
      return true;
    } catch (e) {
      return false;
    }
  }

  function removeAvatar(code) {
    if (!code) return;
    localStorage.removeItem(AVATAR_PREFIX + code.toUpperCase());
  }

  function validateAvatarFile(file) {
    if (!file) return 'no-file';
    if (!file.type || !file.type.startsWith('image/')) return 'not-image';
    if (file.size > MAX_AVATAR_SIZE) return 'too-large';
    return null;
  }

  // อ่านไฟล์รูปที่ผู้ใช้เลือก แล้วบันทึกเป็น avatar ของรหัสพนักงานนั้น
  // callback(err, dataUrl)
  function setAvatarFromFile(code, file, callback) {
    const err = validateAvatarFile(file);
    if (err) { callback && callback(err); return; }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const ok = setAvatar(code, dataUrl);
      if (ok) {
        callback && callback(null, dataUrl);
      } else {
        callback && callback('storage-failed');
      }
    };
    reader.onerror = () => callback && callback('read-failed');
    reader.readAsDataURL(file);
  }

  function applySessionToUI(session) {
    if (!session) return;
    const initials = getInitials(session.name);
    const avatarUrl = getAvatar(session.code);

    document.querySelectorAll('.user-avatar#userAvatar, [data-acc-avatar]').forEach((el) => {
      if (avatarUrl) {
        el.style.backgroundImage = 'url(' + avatarUrl + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else {
        el.style.backgroundImage = '';
        el.textContent = initials;
      }
    });

    const nameEl = document.getElementById('userNameSidebar');
    const roleEl = document.getElementById('userRoleSidebar');

    if (nameEl) nameEl.textContent = session.name;
    if (roleEl) roleEl.textContent = session.code;
  }

  // ===== ตัวปรับตำแหน่ง/ซูมรูปก่อนบันทึก (Avatar Cropper) =====
  const CROP_OUTPUT_SIZE = 360; // px ของรูปสี่เหลี่ยมที่ครอปออกมา

  function injectCropperStyles() {
    if (document.getElementById('accCropperStyles')) return;
    const style = document.createElement('style');
    style.id = 'accCropperStyles';
    style.textContent = `
      .acc-cropper-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;font-family:'Sarabun',sans-serif;}
      .acc-cropper-box{background:var(--white,#fff);border-radius:12px;width:100%;max-width:380px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.25);}
      .acc-cropper-head{padding:16px 20px 4px;font-size:15px;font-weight:700;color:var(--dark,#1e293b);}
      .acc-cropper-sub{padding:0 20px 12px;font-size:12px;color:var(--gray,#64748b);}
      .acc-cropper-stage{position:relative;width:320px;height:320px;max-width:100%;background:#111;overflow:hidden;cursor:grab;touch-action:none;margin:0 auto;}
      .acc-cropper-stage.dragging{cursor:grabbing;}
      .acc-cropper-img{position:absolute;top:0;left:0;transform-origin:0 0;user-select:none;pointer-events:none;max-width:none;max-height:none;display:block;}
      .acc-cropper-mask{position:absolute;inset:0;pointer-events:none;background:
        radial-gradient(circle at 50% 50%, transparent 0 49.9%, rgba(0,0,0,.55) 50%);}
      .acc-cropper-controls{padding:14px 20px;display:flex;align-items:center;gap:10px;}
      .acc-cropper-controls i{color:var(--gray,#64748b);font-size:13px;}
      .acc-cropper-controls input[type=range]{flex:1;accent-color:var(--primary,#2563EB);}
      .acc-cropper-foot{padding:12px 20px 18px;display:flex;justify-content:flex-end;gap:8px;}
      .acc-cropper-btn{padding:8px 16px;border:none;border-radius:6px;font-size:13.5px;font-weight:600;cursor:pointer;font-family:'Sarabun',sans-serif;}
      .acc-cropper-btn.cancel{background:var(--light,#f8fafc);color:var(--dark,#1e293b);border:1px solid var(--border,#e2e8f0);}
      .acc-cropper-btn.save{background:var(--primary,#2563EB);color:#fff;}
      .acc-cropper-btn.save:hover{background:var(--primary-dark,#1d4ed8);}
    `;
    document.head.appendChild(style);
  }

  // เปิด modal ให้ผู้ใช้ลาก/ซูมเลือกส่วนของรูปที่จะใช้เป็นโปรไฟล์
  // onSave(dataUrl) ถูกเรียกเมื่อกด "บันทึก"
  function openAvatarCropper(file, onSave, onCancel) {
    injectCropperStyles();

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => buildCropperUI(img, onSave, onCancel);
      img.onerror = () => onCancel && onCancel('read-failed');
      img.src = reader.result; // data: URL — ไม่มีปัญหาเรื่องถูก revoke เหมือน blob: URL
    };
    reader.onerror = () => onCancel && onCancel('read-failed');
    reader.readAsDataURL(file);
  }

  function buildCropperUI(img, onSave, onCancel) {
    const overlay = document.createElement('div');
    overlay.className = 'acc-cropper-overlay';
    overlay.innerHTML = `
      <div class="acc-cropper-box">
        <div class="acc-cropper-head">ปรับตำแหน่งรูปโปรไฟล์</div>
        <div class="acc-cropper-sub">ลากเพื่อเลื่อน และใช้แถบเลื่อนเพื่อซูมเข้า-ออก</div>
        <div class="acc-cropper-stage" id="accCropStage">
          <img class="acc-cropper-img" id="accCropImg">
          <div class="acc-cropper-mask"></div>
        </div>
        <div class="acc-cropper-controls">
          <i class="fas fa-search-minus"></i>
          <input type="range" id="accCropZoom" min="100" max="300" value="100">
          <i class="fas fa-search-plus"></i>
        </div>
        <div class="acc-cropper-foot">
          <button class="acc-cropper-btn cancel" id="accCropCancel">ยกเลิก</button>
          <button class="acc-cropper-btn save" id="accCropSave"><i class="fas fa-check"></i> บันทึก</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const stage = overlay.querySelector('#accCropStage');
    const imgEl = overlay.querySelector('#accCropImg');
    const zoomSlider = overlay.querySelector('#accCropZoom');

    let stageSize = 320; // ตรงกับ .acc-cropper-stage ที่กำหนดเป็น fixed px แล้ว จึงไม่ต้องพึ่ง layout async
    let baseScale = Math.max(stageSize / img.naturalWidth, stageSize / img.naturalHeight) || 1;
    let zoom = 1;       // ตัวคูณเพิ่มจาก baseScale (1 = พอดีกรอบ)
    let offsetX = (stageSize - img.naturalWidth * baseScale) / 2;
    let offsetY = (stageSize - img.naturalHeight * baseScale) / 2;

    function currentScale() { return baseScale * zoom; }

    function clampOffsets() {
      const scale = currentScale();
      const dispW = img.naturalWidth * scale;
      const dispH = img.naturalHeight * scale;
      const minX = stageSize - dispW;
      const minY = stageSize - dispH;
      offsetX = Math.min(0, Math.max(minX, offsetX));
      offsetY = Math.min(0, Math.max(minY, offsetY));
    }

    function render() {
      clampOffsets();
      const scale = currentScale();
      imgEl.style.width = img.naturalWidth + 'px';
      imgEl.style.height = img.naturalHeight + 'px';
      imgEl.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';
    }

    // ตั้งค่า src พร้อม transform ตั้งต้นในครั้งเดียว ป้องกันไม่ให้เห็นรูปขนาดเต็ม (unscaled) วาบขึ้นมาก่อน
    imgEl.style.width = img.naturalWidth + 'px';
    imgEl.style.height = img.naturalHeight + 'px';
    imgEl.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + currentScale() + ')';
    imgEl.src = img.src;

    // เผื่อกรณีกรอบจริงบนหน้าจอกว้างน้อยกว่า 320px (เช่นจอมือถือเล็กมาก) ให้คำนวณใหม่จากขนาดจริงอีกครั้ง
    requestAnimationFrame(() => {
      const rect = stage.getBoundingClientRect();
      if (rect.width > 0 && Math.abs(rect.width - stageSize) > 1) {
        stageSize = rect.width;
        baseScale = Math.max(stageSize / img.naturalWidth, stageSize / img.naturalHeight) || 1;
        zoom = 1;
        offsetX = (stageSize - img.naturalWidth * baseScale) / 2;
        offsetY = (stageSize - img.naturalHeight * baseScale) / 2;
        render();
      }
    });

    zoomSlider.addEventListener('input', () => {
      zoom = parseInt(zoomSlider.value, 10) / 100;
      render();
    });

    // ลากด้วยเมาส์/นิ้ว
    let dragging = false;
    let lastX = 0, lastY = 0;

    function pointerDown(x, y) {
      dragging = true;
      lastX = x; lastY = y;
      stage.classList.add('dragging');
    }
    function pointerMove(x, y) {
      if (!dragging) return;
      offsetX += (x - lastX);
      offsetY += (y - lastY);
      lastX = x; lastY = y;
      render();
    }
    function pointerUp() {
      dragging = false;
      stage.classList.remove('dragging');
    }

    stage.addEventListener('mousedown', (e) => pointerDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => pointerMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', pointerUp);

    stage.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      pointerDown(t.clientX, t.clientY);
    }, { passive: true });
    stage.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      pointerMove(t.clientX, t.clientY);
    }, { passive: true });
    stage.addEventListener('touchend', pointerUp);

    function cleanup() {
      window.removeEventListener('mousemove', pointerMove);
      window.removeEventListener('mouseup', pointerUp);
      overlay.remove();
    }

    overlay.querySelector('#accCropCancel').addEventListener('click', () => {
      cleanup();
      onCancel && onCancel('cancelled');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        onCancel && onCancel('cancelled');
      }
    });

    overlay.querySelector('#accCropSave').addEventListener('click', () => {
      const scale = currentScale();
      // พิกัดของพื้นที่ที่มองเห็นใน stage เทียบกับรูปต้นฉบับ (naturalWidth/Height)
      const srcX = (-offsetX) / scale;
      const srcY = (-offsetY) / scale;
      const srcSize = stageSize / scale;

      const canvas = document.createElement('canvas');
      canvas.width = CROP_OUTPUT_SIZE;
      canvas.height = CROP_OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      cleanup();
      onSave && onSave(dataUrl);
    });
  }

  // ===== เมนูเล็กๆ ตอนคลิกปุ่มกล้อง: เปลี่ยนรูป / ลบรูป =====
  function injectAvatarMenuStyles() {
    if (document.getElementById('accAvatarMenuStyles')) return;
    const style = document.createElement('style');
    style.id = 'accAvatarMenuStyles';
    style.textContent = `
      .acc-avatar-menu{position:fixed;z-index:5001;background:var(--white,#fff);border:1px solid var(--border,#e2e8f0);
        border-radius:8px;box-shadow:0 8px 20px rgba(0,0,0,.18);min-width:170px;overflow:hidden;font-family:'Sarabun',sans-serif;}
      .acc-avatar-menu button{width:100%;text-align:left;padding:10px 14px;background:none;border:none;cursor:pointer;
        font-size:13.5px;font-family:'Sarabun',sans-serif;color:var(--dark,#1e293b);display:flex;align-items:center;gap:9px;}
      .acc-avatar-menu button:hover{background:var(--light,#f8fafc);}
      .acc-avatar-menu button.danger{color:var(--danger,#DC2626);}
      .acc-avatar-menu button i{width:14px;text-align:center;}
    `;
    document.head.appendChild(style);
  }

  function closeAvatarMenu() {
    const existing = document.getElementById('accAvatarMenu');
    if (existing) existing.remove();
    document.removeEventListener('click', closeAvatarMenu, true);
  }

  // เปิดเมนูเล็กๆ ใกล้ badge ให้เลือกเปลี่ยนรูปหรือลบรูป (ถ้ามีรูปอยู่แล้ว)
  function openAvatarMenu(anchorEl, session, hasAvatar, onChoosePick, onChooseRemove) {
    closeAvatarMenu();
    injectAvatarMenuStyles();

    const menu = document.createElement('div');
    menu.id = 'accAvatarMenu';
    menu.className = 'acc-avatar-menu';
    menu.innerHTML = `
      <button type="button" id="accAvatarMenuPick"><i class="fas fa-camera"></i> เปลี่ยนรูปโปรไฟล์</button>
      ${hasAvatar ? '<button type="button" class="danger" id="accAvatarMenuRemove"><i class="fas fa-trash-alt"></i> ลบรูปโปรไฟล์</button>' : ''}
    `;
    document.body.appendChild(menu);

    const rect = anchorEl.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    let top = rect.bottom + 6;
    let left = rect.left;
    if (left + menuRect.width > window.innerWidth - 8) left = window.innerWidth - menuRect.width - 8;
    if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 6;
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';

    menu.querySelector('#accAvatarMenuPick').addEventListener('click', (e) => {
      e.stopPropagation();
      closeAvatarMenu();
      onChoosePick && onChoosePick();
    });

    const removeBtn = menu.querySelector('#accAvatarMenuRemove');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeAvatarMenu();
        onChooseRemove && onChooseRemove();
      });
    }

    setTimeout(() => {
      document.addEventListener('click', closeAvatarMenu, true);
    }, 0);
  }

  // เปิดให้หน้าอื่นเรียกใช้ผ่าน window.AccAuth
  window.AccAuth = {
    EMPLOYEES,
    login,
    logout,
    getSession,
    requireAuth,
    applySessionToUI,
    getInitials,
    findEmployee,
    getAvatar,
    setAvatar,
    removeAvatar,
    setAvatarFromFile,
    validateAvatarFile,
    openAvatarCropper,
    openAvatarMenu
  };

  // หน้าทั่วไป (ไม่ใช่หน้า login) ให้ตรวจสอบสิทธิ์อัตโนมัติทันทีที่โหลดสคริปต์นี้
  const currentPage = (window.location.pathname.split('/').pop() || '').toLowerCase();
  if (currentPage !== LOGIN_PAGE) {
    const session = requireAuth();
    if (session) {
      const init = () => {
        applySessionToUI(session);

        // ผูกปุ่มเปลี่ยนรูปโปรไฟล์ (ถ้ามีอยู่ในหน้านี้)
        const avatarEl = document.getElementById('userAvatar');
        const badgeEl = document.getElementById('avatarEditBadge');
        const fileInput = document.getElementById('avatarFileInput');

        if (avatarEl && fileInput) {
          const openPicker = () => fileInput.click();

          const handleBadgeClick = (e) => {
            e.stopPropagation();
            const hasAvatar = !!getAvatar(session.code);
            openAvatarMenu(badgeEl || avatarEl, session, hasAvatar, openPicker, () => {
              removeAvatar(session.code);
              applySessionToUI(session);
              if (window.showToast) window.showToast('ลบรูปโปรไฟล์แล้ว', 'success');
            });
          };

          avatarEl.style.cursor = 'pointer';
          avatarEl.addEventListener('click', handleBadgeClick);
          if (badgeEl) badgeEl.addEventListener('click', handleBadgeClick);

          fileInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            fileInput.value = '';
            if (!file) return;

            const toastFn = window.showToast;
            const validationErr = validateAvatarFile(file);

            if (validationErr === 'not-image') {
              if (toastFn) toastFn('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
              return;
            }
            if (validationErr === 'too-large') {
              if (toastFn) toastFn('ไฟล์รูปใหญ่เกินไป (สูงสุด 2MB)', 'error');
              return;
            }

            openAvatarCropper(file, (croppedDataUrl) => {
              const ok = setAvatar(session.code, croppedDataUrl);
              if (!ok) {
                if (toastFn) toastFn('ไม่สามารถบันทึกรูปโปรไฟล์ได้', 'error');
                return;
              }
              applySessionToUI(session);
              if (toastFn) toastFn('เปลี่ยนรูปโปรไฟล์แล้ว', 'success');
            }, () => { /* ผู้ใช้ยกเลิกการครอป — ไม่ต้องทำอะไร */ });
          });
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    }
  }
})();