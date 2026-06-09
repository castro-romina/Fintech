document.addEventListener('DOMContentLoaded', function () {

  class Client {
    constructor(id, name, surname, dni, email, password, isAdmin = false) {
      this.id = id;
      this.name = name;
      this.surname = surname;
      this.dni = dni;
      this.email = email;
      this.password = password;
      this.isAdmin = isAdmin;
    }

    fullName() {
      return `${this.name} ${this.surname}`;
    }
  }

  class Account {
    constructor(code, clientId, balance = 0) {
      this.code = code;
      this.clientId = clientId;
      this.balance = balance;
    }
  }

  class Movement {
    constructor(id, accountCode, type, amount, date) {
      this.id = id;
      this.accountCode = accountCode;
      this.type = type;    
      this.amount = amount;
      this.date = date;
    }
  }

  class WalletSystem {
    constructor() {
      this.clients   = [];
      this.accounts  = [];
      this.movements = [];
      this._nextClientId = 1;
      this._nextMovId    = 1;
      this._initDefaults();
    }

    _genCode() {
      return 'AC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    _initDefaults() {
      const admin = new Client(
        this._nextClientId++, 'Admin', 'Sistema',
        '00000000', 'admin@wallet.com', 'admin123', true
      );
      this.clients.push(admin);
      this.accounts.push(new Account(this._genCode(), admin.id, 10000));
    }

    /** Valida credenciales y retorna el cliente, o null si falla */
    login(email, password) {
      return this.clients.find(c => c.email === email && c.password === password) || null;
    }

    /**
     * Registra un nuevo cliente y crea su cuenta.
     * @returns { client, account } | { error: string }
     */
    registerClient(name, surname, dni, email, password, initialBalance) {
      if (this.clients.find(c => c.email === email)) {
        return { error: 'El correo ya está registrado.' };
      }
      if (this.clients.find(c => c.dni === dni)) {
        return { error: 'El DNI ya está registrado.' };
      }
      const client  = new Client(this._nextClientId++, name, surname, dni, email, password);
      const account = new Account(this._genCode(), client.id, parseFloat(initialBalance) || 0);
      this.clients.push(client);
      this.accounts.push(account);
      return { client, account };
    }

    /** Elimina un cliente y todos sus datos asociados */
    deleteClient(clientId) {
      const codes = this.accounts
        .filter(a => a.clientId === clientId)
        .map(a => a.code);
      this.clients   = this.clients.filter(c => c.id !== clientId);
      this.accounts  = this.accounts.filter(a => a.clientId !== clientId);
      this.movements = this.movements.filter(m => !codes.includes(m.accountCode));
    }

    /** Retorna la cuenta de un cliente dado su ID */
    getAccount(clientId) {
      return this.accounts.find(a => a.clientId === clientId);
    }

    /**
     * Deposita un monto en la cuenta indicada.
     * @returns { account, movement } | { error: string }
     */
    deposit(accountCode, amount) {
      const account = this.accounts.find(a => a.code === accountCode);
      if (!account)    return { error: 'Cuenta no encontrada.' };
      if (amount <= 0) return { error: 'El monto debe ser mayor a 0.' };

      account.balance += amount;
      const mov = new Movement(this._nextMovId++, accountCode, 'DEPÓSITO', amount, new Date());
      this.movements.push(mov);
      return { account, movement: mov };
    }

    /**
     * Retira un monto de la cuenta indicada.
     * @returns { account, movement } | { error: string }
     */
    withdraw(accountCode, amount) {
      const account = this.accounts.find(a => a.code === accountCode);
      if (!account)              return { error: 'Cuenta no encontrada.' };
      if (amount <= 0)           return { error: 'El monto debe ser mayor a 0.' };
      if (amount > account.balance) return { error: 'Saldo insuficiente.' };

      account.balance -= amount;
      const mov = new Movement(this._nextMovId++, accountCode, 'RETIRO', amount, new Date());
      this.movements.push(mov);
      return { account, movement: mov };
    }

    /** Retorna los movimientos de una cuenta, ordenados por fecha descendente */
    getMovements(accountCode) {
      return this.movements
        .filter(m => m.accountCode === accountCode)
        .sort((a, b) => b.date - a.date);
    }
  }

  const wallet       = new WalletSystem();
  let currentUser    = null;
  let currentAccount = null;

  /** Cambia la pantalla visible */
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');

    if (id === 'screen-dashboard') refreshDashboard();
    if (id === 'screen-withdraw') {
      document.getElementById('withdraw-balance-display').textContent =
        '$' + fmt(currentAccount.balance);
    }
    if (id === 'screen-history') renderHistory();
    if (id === 'screen-admin')   renderAdmin();
  }

  /** Muestra un mensaje de alerta temporal */
  function showAlert(id, msg, type) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.className = `alert ${type} show`;
    setTimeout(() => el.classList.remove('show'), 3500);
  }

  /** Formatea un número como moneda argentina */
  function fmt(amount) {
    return amount.toLocaleString('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /** Formatea una fecha de forma legible */
  function fmtDate(date) {
    return new Date(date).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  /** Retorna un saludo según la hora del día */
  function getGreeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 19) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function doLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-pass').value;

    if (!email || !pass) {
      return showAlert('alert-login', 'Completá todos los campos.', 'error');
    }
    const user = wallet.login(email, pass);
    if (!user) {
      return showAlert('alert-login', 'Credenciales incorrectas.', 'error');
    }

    currentUser    = user;
    currentAccount = wallet.getAccount(user.id);

    document.getElementById('login-email').value = '';
    document.getElementById('login-pass').value  = '';

    showScreen(user.isAdmin ? 'screen-admin' : 'screen-dashboard');
  }

  function doRegister() {
    const name    = document.getElementById('reg-name').value.trim();
    const surname = document.getElementById('reg-surname').value.trim();
    const dni     = document.getElementById('reg-dni').value.trim();
    const email   = document.getElementById('reg-email').value.trim();
    const pass    = document.getElementById('reg-pass').value;
    const balance = parseFloat(document.getElementById('reg-balance').value) || 0;

    if (!name || !surname || !dni || !email || !pass) {
      return showAlert('alert-register', 'Completá todos los campos obligatorios.', 'error');
    }
    if (pass.length < 5) {
      return showAlert('alert-register', 'La contraseña debe tener al menos 5 caracteres.', 'error');
    }

    const result = wallet.registerClient(name, surname, dni, email, pass, balance);
    if (result.error) {
      return showAlert('alert-register', result.error, 'error');
    }

    showAlert('alert-register', `¡Cuenta creada! Código: ${result.account.code}`, 'success');

    setTimeout(() => {
      ['reg-name', 'reg-surname', 'reg-dni', 'reg-email', 'reg-pass', 'reg-balance']
        .forEach(id => { document.getElementById(id).value = ''; });

      if (currentUser?.isAdmin) {
        showScreen('screen-admin');
      } else {
        currentUser    = result.client;
        currentAccount = result.account;
        showScreen('screen-dashboard');
      }
    }, 1800);
  }

  function doLogout() {
    currentUser    = null;
    currentAccount = null;
    showScreen('screen-login');
  }

  function doDeposit() {
    const amount = parseFloat(document.getElementById('deposit-amount').value);
    if (!amount) {
      return showAlert('alert-deposit', 'Ingresá un monto válido.', 'error');
    }
    const result = wallet.deposit(currentAccount.code, amount);
    if (result.error) {
      return showAlert('alert-deposit', result.error, 'error');
    }
    currentAccount = result.account;
    document.getElementById('deposit-amount').value = '';
    showAlert('alert-deposit', `✅ Depósito de $${fmt(amount)} realizado con éxito.`, 'success');
    setTimeout(() => showScreen('screen-dashboard'), 1600);
  }

  function doWithdraw() {
    const amount = parseFloat(document.getElementById('withdraw-amount').value);
    if (!amount) {
      return showAlert('alert-withdraw', 'Ingresá un monto válido.', 'error');
    }
    const result = wallet.withdraw(currentAccount.code, amount);
    if (result.error) {
      return showAlert('alert-withdraw', result.error, 'error');
    }
    currentAccount = result.account;
    document.getElementById('withdraw-amount').value = '';
    showAlert('alert-withdraw', `✅ Retiro de $${fmt(amount)} realizado con éxito.`, 'success');
    setTimeout(() => showScreen('screen-dashboard'), 1600);
  }

  function deleteClient(clientId) {
    if (!confirm('¿Estás seguro de eliminar este cliente y su cuenta?')) return;
    wallet.deleteClient(clientId);
    renderAdmin();
  }

  function switchTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if (event && event.target) event.target.classList.add('active');
  }

  function refreshDashboard() {
    if (!currentUser || !currentAccount) return;
    document.getElementById('dash-greeting').textContent = getGreeting();
    document.getElementById('dash-username').textContent = currentUser.fullName() + ' 👤';
    document.getElementById('dash-balance').textContent  = fmt(currentAccount.balance);
    document.getElementById('dash-account').textContent  = `Cuenta · ${currentAccount.code}`;
    renderRecentMovements();
  }

  function renderRecentMovements() {
    const container = document.getElementById('dash-recent-movements');
    const movs = wallet.getMovements(currentAccount.code).slice(0, 3);

    if (!movs.length) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">🏦</div>No hay movimientos aún.</div>';
      return;
    }
    container.innerHTML = movs.map(movementHTML).join('');
  }

  function renderHistory() {
    const container = document.getElementById('history-list');
    const movs = wallet.getMovements(currentAccount.code);

    if (!movs.length) {
      container.innerHTML = '<div class="empty-state"><div class="emoji">📋</div>No hay movimientos registrados.</div>';
      return;
    }
    container.innerHTML = movs.map(movementHTML).join('');
  }

  /** Genera el HTML de un movimiento */
  function movementHTML(m) {
    const isDep = m.type === 'DEPÓSITO';
    return `
      <div class="movement-item">
        <div class="movement-icon ${isDep ? 'dep' : 'ret'}">${isDep ? '💰' : '💸'}</div>
        <div class="movement-info">
          <div class="movement-type">${m.type}</div>
          <div class="movement-date">${fmtDate(m.date)}</div>
        </div>
        <div class="movement-amount ${isDep ? 'dep' : 'ret'}">
          ${isDep ? '+' : '-'}$${fmt(m.amount)}
        </div>
      </div>
    `;
  }

  function renderAdmin() {
    // --- Pestaña: Clientes ---
    const clientList = document.getElementById('admin-client-list');
    const nonAdmins  = wallet.clients.filter(c => !c.isAdmin);

    if (!nonAdmins.length) {
      clientList.innerHTML = '<div class="empty-state"><div class="emoji">👤</div>No hay clientes.</div>';
    } else {
      clientList.innerHTML = nonAdmins.map(c => {
        const acc = wallet.getAccount(c.id);
        return `
          <div class="client-item">
            <div class="client-info-row">
              <div class="client-name">${c.fullName()}</div>
              <div class="client-sub">DNI: ${c.dni} · ${c.email}</div>
              ${acc ? `<div class="client-sub" style="color:var(--cyan)">Saldo: $${fmt(acc.balance)}</div>` : ''}
            </div>
            <button class="delete-btn" onclick="deleteClient(${c.id})" title="Eliminar">🗑️</button>
          </div>
        `;
      }).join('');
    }

    // --- Pestaña: Cuentas ---
    const accList = document.getElementById('admin-account-list');
    if (!wallet.accounts.length) {
      accList.innerHTML = '<div class="empty-state"><div class="emoji">🏦</div>No hay cuentas.</div>';
    } else {
      accList.innerHTML = wallet.accounts.map(a => {
        const cli = wallet.clients.find(c => c.id === a.clientId);
        return `
          <div class="client-item">
            <div class="client-info-row">
              <div class="client-name">${a.code}</div>
              <div class="client-sub">Titular: ${cli ? cli.fullName() : 'N/A'}</div>
            </div>
            <div style="text-align:right; flex-shrink:0">
              <div style="font-family:'Syne',sans-serif; font-weight:700; color:var(--cyan)">$${fmt(a.balance)}</div>
              <div style="font-size:10px; color:var(--muted)">saldo</div>
            </div>
          </div>
        `;
      }).join('');
    }

    // --- Pestaña: Movimientos ---
    const movList = document.getElementById('admin-movement-list');
    const allMovs = [...wallet.movements].sort((a, b) => b.date - a.date);

    if (!allMovs.length) {
      movList.innerHTML = '<div class="empty-state"><div class="emoji">📋</div>No hay movimientos.</div>';
    } else {
      movList.innerHTML = allMovs.map(m => {
        const isDep = m.type === 'DEPÓSITO';
        return `
          <div class="client-item" style="align-items:flex-start">
            <div class="client-info-row">
              <div class="client-name">${m.type}</div>
              <div class="client-sub">Cuenta: ${m.accountCode}</div>
              <div class="client-sub">${fmtDate(m.date)}</div>
            </div>
            <div style="font-family:'Syne',sans-serif; font-weight:700; flex-shrink:0;
                        color:${isDep ? 'var(--mint)' : 'var(--rose)'}">
              ${isDep ? '+' : '-'}$${fmt(m.amount)}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  document.getElementById('login-email').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  document.getElementById('login-pass').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });

  window.showScreen   = showScreen;
  window.doLogin      = doLogin;
  window.doRegister   = doRegister;
  window.doLogout     = doLogout;
  window.doDeposit    = doDeposit;
  window.doWithdraw   = doWithdraw;
  window.deleteClient = deleteClient;
  window.switchTab    = switchTab;
});