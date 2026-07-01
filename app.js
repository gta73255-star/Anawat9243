(() => {
  const pageMap = {
    dashboard: 'dashboard.html',
    customers: 'customers.html',
    vat: 'vat.html',
    wht: 'wht.html',
    social: 'social.html',
    financial: 'financial.html'
  };

  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-check-circle"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 2200);
  }

  function navigateTo(page) {
    if (pageMap[page]) {
      window.location.href = pageMap[page];
    }
  }

  function toggleDark() {
    const root = document.documentElement;
    const currentTheme = root.getAttribute('data-theme') || document.body.getAttribute('data-theme');
    const nextTheme = currentTheme === 'dark' ? '' : 'dark';

    root.setAttribute('data-theme', nextTheme);
    document.body.setAttribute('data-theme', nextTheme);
    localStorage.setItem('accCrmTheme', nextTheme);

    const icon = document.getElementById('darkIcon');
    if (icon) {
      icon.className = nextTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    showToast(nextTheme === 'dark' ? 'เปลี่ยนเป็นโหมดมืดแล้ว' : 'เปลี่ยนเป็นโหมดสว่างแล้ว', 'info');
  }

  function doBackup() {
    showToast('สำรองข้อมูลเรียบร้อยแล้ว', 'success');
  }

  function showDeadlines() {
    const list = document.getElementById('deadlineList');
    if (list) {
      list.innerHTML = '<div class="alert alert-info"><i class="fas fa-info-circle"></i> ไม่มีงานใกล้ครบกำหนดในตอนนี้</div>';
    }
    openModal('deadlineModal');
  }

  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show');
    }
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show');
    }
  }

  function openTaskModal(defaultType = 'ยื่นภาษีหัก ณ ที่จ่าย') {
    const taskType = document.getElementById('taskType');
    if (taskType) taskType.value = defaultType;

    const modalTitle = document.getElementById('taskModalTitle');
    if (modalTitle) modalTitle.textContent = 'เพิ่มงาน';

    const progress = document.getElementById('taskProgress');
    const label = document.getElementById('progressLabel');
    if (progress) progress.value = 0;
    if (label) label.textContent = '0';

    openModal('taskModal');
  }

  function switchFormTab(tabId, tabElement) {
    document.querySelectorAll('.tabs .tab').forEach((tab) => tab.classList.remove('active'));
    document.querySelectorAll('[id^="custTab"]').forEach((panel) => {
      panel.style.display = 'none';
    });

    if (tabElement) tabElement.classList.add('active');
    const tabPanel = document.getElementById(tabId);
    if (tabPanel) tabPanel.style.display = 'block';
  }

  function saveCustomer() {
    showToast('บันทึกข้อมูลลูกค้าแล้ว', 'success');
    closeModal('customerModal');
  }

  function saveTask() {
    showToast('บันทึกงานแล้ว', 'success');
    closeModal('taskModal');
  }

  function uploadDoc() {
    showToast('อัปโหลดเอกสารเรียบร้อยแล้ว', 'success');
    closeModal('docModal');
  }

  function saveInvoice() {
    showToast('บันทึกใบแจ้งหนี้แล้ว', 'success');
    closeModal('invoiceModal');
  }

  function saveUser() {
    showToast('บันทึกผู้ใช้งานแล้ว', 'success');
    closeModal('userModal');
  }

  function initApp() {
    const savedTheme = localStorage.getItem('accCrmTheme') || '';
    if (savedTheme) {
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    }

    const icon = document.getElementById('darkIcon');
    if (icon) {
      icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
      item.addEventListener('click', () => navigateTo(item.getAttribute('data-page')));
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          closeModal(modal.id);
        }
      });
    });

    // Month filter for WHT page
    const monthFilter = document.getElementById('whtMonthFilter');
    if (monthFilter) {
      monthFilter.addEventListener('change', (e) => {
        const selectedMonth = e.target.value;
        showToast(selectedMonth ? `แสดงข้อมูลเดือน ${e.target.options[e.target.selectedIndex].text}` : 'แสดงข้อมูลทั้งหมด', 'info');
        filterWhtByMonth(selectedMonth);
      });
    }

    const path = window.location.pathname.split('/').pop() || 'dashboard.html';
    const activePage = path.replace('.html', '');
    document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
      item.classList.toggle('active', item.getAttribute('data-page') === activePage);
    });

    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('show');
    }
  }

  function filterWhtByMonth(month) {
    const table = document.getElementById('whtTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tr:not(:first-child)');
    rows.forEach((row) => {
      if (!month) {
        row.style.display = '';
      } else {
        // This will filter when actual data is added
        row.style.display = '';
      }
    });
  }

  window.navigateTo = navigateTo;
  window.toggleDark = toggleDark;
  window.doBackup = doBackup;
  window.showDeadlines = showDeadlines;
  window.openTaskModal = openTaskModal;
  window.closeModal = closeModal;
  window.openModal = openModal;
  window.switchFormTab = switchFormTab;
  window.saveCustomer = saveCustomer;
  window.saveTask = saveTask;
  window.uploadDoc = uploadDoc;
  window.saveInvoice = saveInvoice;
  window.saveUser = saveUser;
  window.filterWhtByMonth = filterWhtByMonth;
  window.showToast = showToast;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();