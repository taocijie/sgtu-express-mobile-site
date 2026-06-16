const STORE_KEY = "sgtu_express_v1";

const initialState = {
  users: [
    {
      id: "u_super",
      phone: "13800000000",
      password: "admin888",
      roles: ["publisher", "runner", "admin", "super"],
      disabled: false,
      warnings: 0,
      restricted: false,
      auth: { status: "approved", realName: "超级管理员", studentId: "000000", college: "管理组" },
    },
  ],
  orders: [],
  appeals: [],
  session: null,
};

let state = loadState();
let selectedEntry = "publisher";
let currentTab = "";

const $ = (id) => document.getElementById(id);
const statusText = {
  open: "待接单",
  accepted: "配送中",
  completed: "已完成",
  appealed: "申诉中",
};

const paymentText = {
  cod: "货到付款",
  prepaid: "需预付款",
  paid: "已预付",
  unpaid: "未付款",
};

function loadState() {
  const saved = localStorage.getItem(STORE_KEY);
  if (!saved) return structuredClone(initialState);
  try {
    return { ...structuredClone(initialState), ...JSON.parse(saved) };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
}

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`;
}

function currentUser() {
  return state.users.find((user) => user.id === state.session?.userId) || null;
}

function priceForWeight(weight) {
  const value = Number(weight);
  if (value <= 0.5) return { size: "小件", price: 2 };
  if (value <= 1) return { size: "中件", price: 4 };
  if (value <= 2) return { size: "大件", price: 6 };
  if (value <= 5) return { size: "超大件", price: 10 };
  return { size: "超大件", price: Math.ceil(10 + (value - 5) * 2) };
}

function maskTracking(no) {
  if (!no || no.length <= 6) return "******";
  return `${no.slice(0, 3)}******${no.slice(-3)}`;
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  setTimeout(() => $("toast").classList.add("hidden"), 2100);
}

function showModal(title, bodyHtml, onConfirm) {
  $("modalTitle").textContent = title;
  $("modalBody").innerHTML = bodyHtml;
  const modal = $("modal");
  modal.showModal();
  $("modalConfirm").onclick = (event) => {
    event.preventDefault();
    onConfirm?.();
    modal.close();
  };
}

function setView(name) {
  ["entryView", "loginView", "mainView"].forEach((id) => $(id).classList.add("hidden"));
  $(name).classList.remove("hidden");
}

function init() {
  document.querySelectorAll("[data-entry]").forEach((button) => {
    button.addEventListener("click", () => openLogin(button.dataset.entry));
  });
  $("adminEntry").addEventListener("click", () => openLogin("admin"));
  $("backToEntry").addEventListener("click", () => setView("entryView"));
  $("logoutBtn").addEventListener("click", logout);
  $("loginForm").addEventListener("submit", handleLogin);
  $("orderForm").addEventListener("submit", createOrder);
  $("weight").addEventListener("input", updatePricePreview);
  if (state.session) enterApp();
}

function openLogin(entry) {
  selectedEntry = entry;
  $("loginTitle").textContent = entry === "admin" ? "管理后台登录" : entry === "runner" ? "接单人登录" : "取件人登录";
  $("loginHint").textContent =
    entry === "admin"
      ? "超级管理员演示账号：13800000000 / admin888"
      : "新手机号会自动注册，密码至少 6 位。";
  setView("loginView");
}

function handleLogin(event) {
  event.preventDefault();
  const phone = $("loginPhone").value.trim();
  const password = $("loginPassword").value.trim();
  if (!/^1\d{10}$/.test(phone)) return showToast("请输入 11 位手机号");
  if (password.length < 6) return showToast("密码至少 6 位");

  let user = state.users.find((item) => item.phone === phone);
  if (user && user.password !== password) return showToast("密码不正确");
  if (!user) {
    user = {
      id: uid("u"),
      phone,
      password,
      roles: ["publisher"],
      disabled: false,
      warnings: 0,
      restricted: false,
      auth: { status: "none" },
    };
    state.users.push(user);
  }
  if (user.disabled) return showToast("账号已被禁用，请联系管理员");
  if (selectedEntry === "admin" && !user.roles.includes("admin") && !user.roles.includes("super")) {
    return showToast("当前账号不是管理员");
  }
  if (!user.roles.includes(selectedEntry) && selectedEntry !== "admin") user.roles.push(selectedEntry);
  state.session = { userId: user.id, entry: selectedEntry };
  saveState();
  enterApp();
}

function logout() {
  state.session = null;
  saveState();
  $("loginForm").reset();
  setView("entryView");
}

function enterApp() {
  const user = currentUser();
  if (!user) return logout();
  setView("mainView");
  $("userBadge").textContent = `${user.phone} · ${roleName(state.session.entry)}`;
  const tabs =
    state.session.entry === "publisher"
      ? [
          ["publisherCreate", "发布订单"],
          ["publisherOrders", "我的订单"],
        ]
      : state.session.entry === "runner"
        ? [
            ["runnerAvailable", "可接订单"],
            ["runnerMine", "我的接单"],
          ]
        : [
            ["adminDashboard", "概览"],
            ["adminAuth", "认证审核"],
            ["adminOrders", "订单管理"],
            ["adminUsers", "用户管理"],
          ];
  $("tabs").innerHTML = tabs.map(([id, label]) => `<button data-tab="${id}" type="button">${label}</button>`).join("");
  $("tabs").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => switchTab(button.dataset.tab)));
  switchTab(tabs[0][0]);
}

function roleName(role) {
  return { publisher: "取件人", runner: "接单人", admin: "管理员" }[role] || "用户";
}

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".tab-page").forEach((page) => page.classList.add("hidden"));
  $(tab).classList.remove("hidden");
  $("tabs").querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  render();
}

function updatePricePreview() {
  const weight = Number($("weight").value);
  if (!weight) {
    $("pricePreview").textContent = "填写重量后自动计算价格";
    return;
  }
  const result = priceForWeight(weight);
  $("pricePreview").textContent = `${result.size} · ¥${result.price} · ${result.price >= 10 ? "需预付款" : "支持货到付款"}`;
}

function createOrder(event) {
  event.preventDefault();
  const user = currentUser();
  const unpaid = state.orders.some((order) => order.publisherId === user.id && order.paymentStatus === "unpaid");
  if (unpaid) return showToast("上一单未付款，暂不能发布下一单");

  const computed = priceForWeight($("weight").value);
  const paymentStatus = computed.price >= 10 ? "unpaid" : "cod";
  const order = {
    id: uid("o"),
    publisherId: user.id,
    pickupAddress: $("pickupAddress").value.trim(),
    pickupCode: $("pickupCode").value.trim(),
    deliveryAddress: $("deliveryAddress").value.trim(),
    trackingNo: $("trackingNo").value.trim(),
    weight: Number($("weight").value),
    note: $("note").value.trim(),
    size: computed.size,
    price: computed.price,
    paymentStatus,
    status: "open",
    runnerId: null,
    createdAt: new Date().toISOString(),
    proofPhoto: "",
    rating: null,
    appeal: null,
  };
  state.orders.unshift(order);
  saveState();
  $("orderForm").reset();
  updatePricePreview();
  showToast(paymentStatus === "unpaid" ? "订单已创建，请模拟微信预付款" : "订单已发布，支持货到付款");
  switchTab("publisherOrders");
}

function render() {
  if (currentTab === "publisherOrders") renderPublisherOrders();
  if (currentTab === "runnerAvailable") renderRunnerAvailable();
  if (currentTab === "runnerMine") renderRunnerMine();
  if (currentTab === "adminDashboard") renderDashboard();
  if (currentTab === "adminAuth") renderAuthRequests();
  if (currentTab === "adminOrders") renderAllOrders();
  if (currentTab === "adminUsers") renderAllUsers();
}

function card(order, actor) {
  const tracking = actor === "runner-before" ? maskTracking(order.trackingNo) : order.trackingNo;
  const runner = order.runnerId ? state.users.find((user) => user.id === order.runnerId) : null;
  const publisher = state.users.find((user) => user.id === order.publisherId);
  const payClass = order.paymentStatus === "paid" || order.paymentStatus === "cod" ? "paid" : "warn";
  return `
    <article class="order-card">
      <div class="card-head">
        <h3>${order.pickupAddress} → ${order.deliveryAddress}</h3>
        <span class="status ${order.status === "completed" ? "done" : order.status === "appealed" ? "danger" : ""}">${statusText[order.status]}</span>
      </div>
      <div class="meta-grid">
        <div><span>价格 / 大小</span><b>¥${order.price} · ${order.size}</b></div>
        <div><span>重量</span><b>${order.weight} kg</b></div>
        <div><span>快递编号</span><b class="${actor === "runner-before" ? "masked" : ""}">${tracking}</b></div>
        <div><span>取件码</span><b>${order.pickupCode}</b></div>
        <div><span>支付</span><b><span class="status ${payClass}">${paymentText[order.paymentStatus]}</span></b></div>
        <div><span>发布人</span><b>${publisher?.phone || "-"}</b></div>
        <div><span>接单人</span><b>${runner?.auth?.realName || runner?.phone || "未接单"}</b></div>
      </div>
      ${order.note ? `<p class="meta">备注：${order.note}</p>` : ""}
      ${order.proofPhoto ? `<img class="photo" src="${order.proofPhoto}" alt="完成证明" />` : ""}
      ${order.rating ? `<p class="meta"><span class="stars">${"★".repeat(order.rating.stars)}${"☆".repeat(5 - order.rating.stars)}</span> ${order.rating.text || ""}</p>` : ""}
      ${order.appeal ? `<p class="meta">申诉：${order.appeal.reason} · ${order.appeal.status}</p>` : ""}
      <div class="row-actions">${actionsFor(order, actor)}</div>
    </article>`;
}

function actionsFor(order, actor) {
  if (actor === "publisher") {
    return [
      order.paymentStatus === "unpaid" ? `<button class="primary-btn" data-act="pay" data-id="${order.id}">微信支付</button>` : "",
      order.status === "completed" && !order.rating ? `<button class="ghost-btn" data-act="rate" data-id="${order.id}">评价</button>` : "",
      ["accepted", "completed"].includes(order.status) && !order.appeal ? `<button class="danger-btn" data-act="appeal" data-id="${order.id}">申诉</button>` : "",
    ].join("");
  }
  if (actor === "runner-before") return `<button class="primary-btn" data-act="accept" data-id="${order.id}">接单</button>`;
  if (actor === "runner") {
    return [
      order.status === "accepted" ? `<button class="danger-btn" data-act="cancel" data-id="${order.id}">取消接单</button>` : "",
      order.status === "accepted" ? `<button class="primary-btn" data-act="complete" data-id="${order.id}">上传完成照片</button>` : "",
    ].join("");
  }
  if (actor === "admin") {
    return order.appeal?.status === "待处理" ? `<button class="primary-btn" data-act="resolveAppeal" data-id="${order.id}">处理申诉</button>` : "";
  }
  return "";
}

function bindOrderActions(container) {
  container.querySelectorAll("[data-act]").forEach((button) => {
    button.addEventListener("click", () => handleOrderAction(button.dataset.act, button.dataset.id));
  });
}

function renderPublisherOrders() {
  const user = currentUser();
  const orders = state.orders.filter((order) => order.publisherId === user.id);
  $("myOrders").innerHTML = orders.length ? orders.map((order) => card(order, "publisher")).join("") : empty("还没有订单");
  bindOrderActions($("myOrders"));
}

function renderRunnerAvailable() {
  renderAuthCard();
  const user = currentUser();
  const canTake = user.auth?.status === "approved" && !user.restricted;
  const orders = canTake ? state.orders.filter((order) => order.status === "open" && order.paymentStatus !== "unpaid") : [];
  $("availableOrders").innerHTML = orders.length ? orders.map((order) => card(order, "runner-before")).join("") : empty(canTake ? "暂无可接订单" : "通过认证且未被限制后可接单");
  bindOrderActions($("availableOrders"));
}

function renderAuthCard() {
  const user = currentUser();
  const status = user.auth?.status || "none";
  const labels = { none: "未认证", pending: "待审核", approved: "已通过", rejected: "已拒绝" };
  $("authCard").innerHTML = `
    <div class="card-head">
      <h3>实名认证</h3>
      <span class="status ${status}">${labels[status]}</span>
    </div>
    <p class="meta">警告 ${user.warnings || 0}/3 ${user.restricted ? " · 已限制接单" : ""}</p>
    ${status !== "approved" ? `<button id="authApplyBtn" class="primary-btn" type="button">${status === "pending" ? "更新认证资料" : "提交认证"}</button>` : ""}
  `;
  $("authApplyBtn")?.addEventListener("click", openAuthForm);
}

function openAuthForm() {
  showModal(
    "实名认证",
    `<div class="form">
      <label>真实姓名<input id="authName" required placeholder="姓名"></label>
      <label>手机号<input id="authPhone" required inputmode="tel" placeholder="手机号"></label>
      <label>学号<input id="authStudent" required placeholder="上海工程技术大学学号"></label>
      <label>学院<input id="authCollege" required placeholder="学院"></label>
      <label>学生证照片<input id="authPhoto" type="file" accept="image/*"></label>
    </div>`,
    () => {
      const user = currentUser();
      user.auth = {
        status: "pending",
        realName: $("authName").value.trim(),
        phone: $("authPhone").value.trim(),
        studentId: $("authStudent").value.trim(),
        college: $("authCollege").value.trim(),
        photoName: $("authPhoto").files[0]?.name || "已上传",
      };
      saveState();
      render();
      showToast("认证资料已提交，等待管理员审核");
    },
  );
}

function renderRunnerMine() {
  const user = currentUser();
  const completed = state.orders.filter((order) => order.runnerId === user.id && order.rating);
  const avg = completed.length ? (completed.reduce((sum, order) => sum + order.rating.stars, 0) / completed.length).toFixed(1) : "暂无";
  $("runnerStats").innerHTML = `<span class="pill">平均评分：${avg}</span><span class="pill">警告：${user.warnings || 0}/3</span>`;
  const orders = state.orders.filter((order) => order.runnerId === user.id);
  $("runnerOrders").innerHTML = orders.length ? orders.map((order) => card(order, "runner")).join("") : empty("还没有接单");
  bindOrderActions($("runnerOrders"));
}

function handleOrderAction(action, id) {
  const order = state.orders.find((item) => item.id === id);
  const user = currentUser();
  if (!order) return;
  if (action === "pay") {
    showModal("模拟微信支付", `<p>本次需预付 ¥${order.price}。第一版为模拟调起，正式小程序需接入微信支付商户号。</p>`, () => {
      order.paymentStatus = "paid";
      saveState();
      render();
      showToast("支付成功，订单已开放接单");
    });
  }
  if (action === "accept") {
    if (user.auth?.status !== "approved" || user.restricted) return showToast("当前不可接单");
    order.status = "accepted";
    order.runnerId = user.id;
    saveState();
    switchTab("runnerMine");
    showToast("接单成功，已显示完整快递编号");
  }
  if (action === "cancel") {
    order.status = "open";
    order.runnerId = null;
    user.warnings = (user.warnings || 0) + 1;
    if (user.warnings >= 3) user.restricted = true;
    saveState();
    render();
    showToast(user.restricted ? "已累计 3 次警告，限制接单" : "已取消并记录 1 次警告");
  }
  if (action === "complete") openCompleteForm(order);
  if (action === "rate") openRatingForm(order);
  if (action === "appeal") openAppealForm(order);
  if (action === "resolveAppeal") {
    order.appeal.status = "已处理";
    order.status = "completed";
    saveState();
    render();
    showToast("申诉已处理");
  }
}

function openCompleteForm(order) {
  showModal(
    "上传完成照片",
    `<p class="meta">上传宿舍楼下照片后，订单会立即确认完成。</p><label>完成证明<input id="proofPhoto" type="file" accept="image/*"></label>`,
    () => {
      const file = $("proofPhoto").files[0];
      if (!file) return showToast("请选择照片");
      const reader = new FileReader();
      reader.onload = () => {
        order.proofPhoto = reader.result;
        order.status = "completed";
        saveState();
        render();
        showToast("订单已完成");
      };
      reader.readAsDataURL(file);
    },
  );
}

function openRatingForm(order) {
  showModal(
    "评价接单人",
    `<div class="form">
      <label>星级<select id="ratingStars"><option value="5">5 星</option><option value="4">4 星</option><option value="3">3 星</option><option value="2">2 星</option><option value="1">1 星</option></select></label>
      <label>文字评价<textarea id="ratingText" rows="3" placeholder="服务反馈"></textarea></label>
    </div>`,
    () => {
      order.rating = { stars: Number($("ratingStars").value), text: $("ratingText").value.trim() };
      saveState();
      render();
      showToast("评价已提交");
    },
  );
}

function openAppealForm(order) {
  showModal(
    "发起申诉",
    `<label>申诉原因<textarea id="appealReason" rows="4" placeholder="请描述问题"></textarea></label>`,
    () => {
      order.appeal = { reason: $("appealReason").value.trim() || "未填写原因", status: "待处理" };
      order.status = "appealed";
      saveState();
      render();
      showToast("申诉已提交，等待管理员处理");
    },
  );
}

function renderDashboard() {
  const runners = state.users.filter((user) => user.roles.includes("runner"));
  const stats = [
    ["总订单", state.orders.length],
    ["待接单", state.orders.filter((order) => order.status === "open").length],
    ["已完成", state.orders.filter((order) => order.status === "completed").length],
    ["接单人数", runners.length],
    ["待审核", state.users.filter((user) => user.auth?.status === "pending").length],
    ["已限制", state.users.filter((user) => user.restricted).length],
  ];
  $("dashboardStats").innerHTML = stats.map(([label, value]) => `<div class="stat"><strong>${value}</strong>${label}</div>`).join("");
}

function renderAuthRequests() {
  const pending = state.users.filter((user) => user.auth?.status === "pending");
  $("authRequests").innerHTML = pending.length
    ? pending
        .map(
          (user) => `<article class="order-card">
          <div class="card-head"><h3>${user.auth.realName || user.phone}</h3><span class="status pending">待审核</span></div>
          <div class="meta-grid">
            <div><span>手机号</span><b>${user.auth.phone || user.phone}</b></div>
            <div><span>学号</span><b>${user.auth.studentId}</b></div>
            <div><span>学院</span><b>${user.auth.college}</b></div>
            <div><span>学生证</span><b>${user.auth.photoName || "未上传"}</b></div>
          </div>
          <div class="row-actions">
            <button class="primary-btn" data-user-act="approve" data-id="${user.id}">通过</button>
            <button class="danger-btn" data-user-act="reject" data-id="${user.id}">拒绝</button>
          </div>
        </article>`,
        )
        .join("")
    : empty("暂无待审核认证");
  bindUserActions($("authRequests"));
}

function renderAllOrders() {
  $("allOrders").innerHTML = state.orders.length ? state.orders.map((order) => card(order, "admin")).join("") : empty("暂无订单");
  bindOrderActions($("allOrders"));
}

function renderAllUsers() {
  const me = currentUser();
  $("allUsers").innerHTML = state.users
    .map((user) => {
      const adminCount = state.users.filter((item) => item.roles.includes("admin")).length;
      const canMakeAdmin = me.roles.includes("super") && !user.roles.includes("admin") && adminCount < 4;
      return `<article class="order-card">
        <div class="card-head"><h3>${user.auth?.realName || user.phone}</h3><span class="status ${user.disabled ? "danger" : "approved"}">${user.disabled ? "已禁用" : "正常"}</span></div>
        <p class="meta">${user.phone} · ${user.roles.join(" / ")} · 警告 ${user.warnings || 0}/3 ${user.restricted ? "· 已限制" : ""}</p>
        <div class="row-actions">
          <button class="${user.disabled ? "primary-btn" : "danger-btn"}" data-user-act="toggleDisable" data-id="${user.id}">${user.disabled ? "解禁用户" : "禁用用户"}</button>
          <button class="ghost-btn" data-user-act="clearWarnings" data-id="${user.id}">清除警告</button>
          ${canMakeAdmin ? `<button class="primary-btn" data-user-act="makeAdmin" data-id="${user.id}">设为管理员</button>` : ""}
        </div>
      </article>`;
    })
    .join("");
  bindUserActions($("allUsers"));
}

function bindUserActions(container) {
  container.querySelectorAll("[data-user-act]").forEach((button) => {
    button.addEventListener("click", () => handleUserAction(button.dataset.userAct, button.dataset.id));
  });
}

function handleUserAction(action, id) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  if (action === "approve") user.auth.status = "approved";
  if (action === "reject") user.auth.status = "rejected";
  if (action === "toggleDisable") user.disabled = !user.disabled;
  if (action === "clearWarnings") {
    user.warnings = 0;
    user.restricted = false;
  }
  if (action === "makeAdmin") {
    const adminCount = state.users.filter((item) => item.roles.includes("admin")).length;
    if (adminCount >= 4) return showToast("管理员最多 4 名");
    user.roles.push("admin");
  }
  saveState();
  render();
  showToast("操作已保存");
}

function empty(text) {
  return `<p class="empty">${text}</p>`;
}

init();
