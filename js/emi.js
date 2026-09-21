/* Cash Loan - EMI calculator (no libraries needed) */
(function () {
  "use strict";

  var LIMITS = { amount: [10000, 50000000], rate: [1, 40] };
  var DEFAULTS = { amount: 100000, rate: 12, months: 12 };

  function $(id) { return document.getElementById(id); }
  var amountText = $("amount"), amountRange = $("amountRange");
  var rateInput = $("rate"), rateRange = $("rateRange");
  var tenureInput = $("tenure"), tenureRange = $("tenureRange");
  var unitYears = $("unitYears"), unitMonths = $("unitMonths");

  var state = { amount: DEFAULTS.amount, rate: DEFAULTS.rate, months: DEFAULTS.months, unit: "months" };

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function inr(n) { return Math.round(n).toLocaleString("en-IN"); }
  function money(n) { return "₹" + inr(n); }
  function fill(range) {
    var min = +range.min, max = +range.max, v = clamp(+range.value, min, max);
    range.style.setProperty("--p", (((v - min) / (max - min)) * 100) + "%");
  }
  function monthsFromText(m) { return m === 1 ? "1 month" : m + " months"; }
  function periodText(m) {
    var y = Math.floor(m / 12), r = m % 12, out = [];
    if (y) out.push(y + (y === 1 ? " year" : " years"));
    if (r) out.push(r + (r === 1 ? " month" : " months"));
    return out.join(" ");
  }

  // ----- the maths -----
  function calc(P, annualRate, n) {
    var r = annualRate / 12 / 100, emi;
    if (r === 0) emi = P / n;
    else emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    var total = emi * n;
    return { emi: emi, total: total, interest: total - P, r: r };
  }

  // ----- showing the answer -----
  var C = 2 * Math.PI * 46;
  function render() {
    var res = calc(state.amount, state.rate, state.months);
    $("emiBig").textContent = money(res.emi);
    $("rPrincipal").textContent = money(state.amount);
    $("rInterest").textContent = money(res.interest);
    $("kInterest").textContent = money(res.interest);
    $("kTotal").textContent = money(res.total);
    $("kPeriod").textContent = periodText(state.months);

    var share = res.total > 0 ? res.interest / res.total : 0;
    var pDash = C * (1 - share);
    $("donutPrincipal").setAttribute("stroke-dasharray", pDash + " " + (C - pDash));
    $("donutShare").textContent = Math.round(share * 100) + "%";

    // year-wise breakup
    var bal = state.amount, rows = "", y = 0, yi = 0, yp = 0, n = state.months;
    for (var m = 1; m <= n; m++) {
      var i = bal * res.r, p = Math.min(bal, res.emi - i);
      bal = Math.max(0, bal - p); yi += i; yp += p;
      if (m % 12 === 0 || m === n) {
        y++;
        rows += "<tr><td>" + (m === n && m % 12 ? "Year " + y + " (part)" : "Year " + y) + "</td><td>" + money(yp) +
          "</td><td>" + money(yi) + "</td><td>" + money(bal) + "</td></tr>";
        yi = 0; yp = 0;
      }
    }
    $("yearRows").innerHTML = rows;
  }

  // ----- keep every control in step with the state -----
  function syncAmount(from) {
    if (from !== "text") amountText.value = inr(state.amount);
    if (from !== "range") { amountRange.value = state.amount; }
    fill(amountRange);
  }
  function syncRate(from) {
    if (from !== "text") rateInput.value = String(state.rate);
    if (from !== "range") rateRange.value = state.rate;
    fill(rateRange);
  }
  function setUnit(unit) {
    state.unit = unit;
    if (unit === "years") {
      tenureRange.min = 1; tenureRange.max = 30; tenureRange.step = 1;
      tenureInput.min = 1; tenureInput.max = 30;
      $("tMin").textContent = "1 yr"; $("tMax").textContent = "30 yrs";
      $("tUnitLabel").textContent = "years";
    } else {
      tenureRange.min = 3; tenureRange.max = 360; tenureRange.step = 1;
      tenureInput.min = 3; tenureInput.max = 360;
      $("tMin").textContent = "3 mo"; $("tMax").textContent = "360 mo";
      $("tUnitLabel").textContent = "months";
    }
    syncTenure();
  }
  function tenureValue() { return state.unit === "years" ? Math.round(state.months / 12) : state.months; }
  function syncTenure(from) {
    var v = tenureValue();
    if (from !== "text") tenureInput.value = v;
    if (from !== "range") tenureRange.value = v;
    fill(tenureRange);
    tenureRange.setAttribute("aria-valuetext", periodText(state.months));
  }
  function setMonthsFromControl(v) {
    var lo = state.unit === "years" ? 1 : 3, hi = state.unit === "years" ? 30 : 360;
    v = clamp(Math.round(v) || lo, lo, hi);
    state.months = state.unit === "years" ? v * 12 : v;
  }

  // ----- events -----
  amountText.addEventListener("input", function () {
    var digits = amountText.value.replace(/\D/g, "");
    var v = digits ? Math.min(+digits, LIMITS.amount[1]) : 0;
    amountText.value = digits ? inr(v) : "";
    state.amount = clamp(v, LIMITS.amount[0], LIMITS.amount[1]);
    syncAmount("text"); render();
  });
  amountText.addEventListener("blur", function () { syncAmount(); });
  amountRange.addEventListener("input", function () {
    state.amount = +amountRange.value; syncAmount("range"); render();
  });
  document.querySelectorAll("[data-amt]").forEach(function (b) {
    b.addEventListener("click", function () { state.amount = +b.getAttribute("data-amt"); syncAmount(); render(); });
  });

  rateInput.addEventListener("input", function () {
    var v = parseFloat(rateInput.value);
    if (isNaN(v)) return;
    state.rate = clamp(v, LIMITS.rate[0], LIMITS.rate[1]);
    syncRate("text"); render();
  });
  rateInput.addEventListener("blur", function () { syncRate(); });
  rateRange.addEventListener("input", function () {
    state.rate = +rateRange.value; syncRate("range"); render();
  });

  tenureInput.addEventListener("input", function () {
    var v = parseFloat(tenureInput.value);
    if (isNaN(v)) return;
    setMonthsFromControl(v); syncTenure("text"); render();
  });
  tenureInput.addEventListener("blur", function () { syncTenure(); });
  tenureRange.addEventListener("input", function () {
    setMonthsFromControl(+tenureRange.value); syncTenure("range"); render();
  });
  unitYears.addEventListener("change", function () { if (unitYears.checked) setUnit("years"); render(); });
  unitMonths.addEventListener("change", function () { if (unitMonths.checked) setUnit("months"); render(); });

  // ----- start values: web address first, then the visitor's earlier choices -----
  function fromAddress() {
    var q = {};
    location.search.replace(/^\?/, "").split("&").forEach(function (kv) {
      var p = kv.split("="); if (p[0]) q[p[0]] = decodeURIComponent(p[1] || "");
    });
    var used = false;
    if (+q.amount) { state.amount = clamp(+q.amount, LIMITS.amount[0], LIMITS.amount[1]); used = true; }
    if (+q.rate) { state.rate = clamp(+q.rate, LIMITS.rate[0], LIMITS.rate[1]); used = true; }
    if (+q.months) { state.months = clamp(Math.round(+q.months), 3, 360); used = true; }
    return used;
  }
  function fromChoices() {
    var store = {};
    try { store = JSON.parse(sessionStorage.getItem("cashloan_choices_v2")) || {}; } catch (e) {}
    var used = false;
    var a = (store.amount || "").replace(/,/g, "").match(/(\d+)\s*-\s*(\d+)/);
    if (a) { state.amount = Math.round((+a[1] + +a[2]) / 2 / 5000) * 5000; used = true; }
    var months = { "06 - 12 month": 9, "01 - 03 Year": 24, "03 - 05 Year": 48, "05 - 10 Year": 84, "10+ Year": 144 }[store.period];
    if (months) { state.months = months; used = true; }
    return used;
  }
  // loan pages start from an example for that loan (set on the page); the general page
  // starts from the visitor's earlier choices
  var root = $("emiRoot");
  function fromPage() {
    if (!root || !root.getAttribute("data-amount")) return false;
    state.amount = clamp(+root.getAttribute("data-amount"), LIMITS.amount[0], LIMITS.amount[1]);
    state.rate = clamp(+root.getAttribute("data-rate") || DEFAULTS.rate, LIMITS.rate[0], LIMITS.rate[1]);
    state.months = clamp(Math.round(+root.getAttribute("data-months")) || DEFAULTS.months, 3, 360);
    return true;
  }
  var fromLink = fromAddress();
  if (!fromLink && !fromPage()) fromLink = fromChoices();
  if (fromLink && $("prefillNote")) $("prefillNote").hidden = false;

  state.unit = state.months % 12 === 0 && state.months >= 24 ? "years" : "months";
  (state.unit === "years" ? unitYears : unitMonths).checked = true;
  syncAmount(); syncRate(); setUnit(state.unit); render();
})();
