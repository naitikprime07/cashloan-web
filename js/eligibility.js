/* Cash Loan - eligibility check for one loan at a time (a simple estimate, no libraries needed) */
(function () {
  "use strict";

  var form = document.getElementById("eligForm");
  var out = document.getElementById("result");
  var errBox = document.getElementById("formError");
  var root = document.getElementById("eligRoot");

  // ----- one entry per loan: name, colour, how it is judged, typical rates and periods (in months) -----
  var CREDIT = { 750: "750", 700: "700", 650: "650", 0: "0", "?": "?" };
  var LOANS = {
    "personal-loan": {
      name: "Personal Loan",
      a: "166,107,255",
      mode: "income",
      max: 5000000,
      periods: [12, 24, 36, 60, 84],
      def: 36,
      rates: { 750: 11, 700: 14, 650: 18, 0: 24, "?": 16 },
    },
    "auto-loan": {
      name: "Auto Loan",
      a: "76,194,255",
      mode: "income",
      max: 3000000,
      periods: [12, 24, 36, 60, 84],
      def: 60,
      rates: { 750: 9, 700: 10.5, 650: 12.5, 0: 15, "?": 11.5 },
      notes: [
        "Lenders usually finance about 80 to 90 percent of the vehicle\u2019s price, so keep a down payment of 10 to 20 percent ready.",
        "Insurance and registration are extra costs on top of the price.",
      ],
    },
    "student-loan": {
      name: "Student Loan",
      a: "255,184,77",
      mode: "income",
      max: 2000000,
      periods: [60, 84, 120, 180],
      def: 120,
      rates: { 750: 9.5, 700: 10.5, 650: 12, 0: 14, "?": 11 },
      ageLabel: "Age of the parent or guardian applying with you",
      incomeLabel: "Monthly income of the parent or guardian",
      workLabel: "Employment type of the parent or guardian",
      emisLabel: "Loan EMIs the parent or guardian already pays each month",
      notes: [
        "Repayment usually starts after your course ends, so the first EMI is often a year or more away.",
        "Interest can build during the course. Paying it while you study lowers the total cost.",
      ],
    },
    "business-loan": {
      name: "Business Loan",
      a: "46,211,183",
      mode: "income",
      max: 10000000,
      periods: [12, 24, 36, 60, 84],
      def: 36,
      rates: { 750: 12, 700: 14, 650: 17, 0: 22, "?": 15 },
      incomeLabel: "Monthly income of the business",
      notes: [
        "Keep 6 to 12 months of bank statements and your GST or income tax returns ready.",
        "Lenders also check how long the business has been running.",
      ],
    },
    "payday-loan": {
      name: "Payday Loan",
      a: "255,138,76",
      mode: "income",
      max: 50000,
      periods: [3, 6, 9, 12],
      def: 3,
      rates: { 750: 24, 700: 28, 650: 33, 0: 38, "?": 31 },
      salaryOnly: true,
      incomeTimes: 1,
      incomeLabel: "Monthly salary",
    },
    "home-loan": {
      name: "Home Loan",
      a: "255,122,144",
      mode: "income",
      max: 50000000,
      periods: [120, 180, 240, 300, 360],
      def: 240,
      rates: { 750: 8.75, 700: 9.5, 650: 10.5, 0: 12, "?": 10 },
      notes: [
        "Keep a down payment of at least 10 to 25 percent of the property value ready.",
        "Stamp duty, registration and other costs come on top of the price.",
      ],
    },
    "gold-loan": {
      name: "Gold Loan",
      a: "255,207,92",
      mode: "gold",
      max: 5000000,
      periods: [3, 6, 12, 24, 36],
      def: 12,
      rate: 11,
      notes: [
        "Ask the lender for the weight, purity and value of your gold in writing.",
        "Your gold is kept in the lender\u2019s vault and returned when you repay in full.",
      ],
    },
  };
  var SCORE = {
    750: { foir: 0.05, points: 3 },
    700: { foir: 0, points: 2 },
    650: { foir: -0.05, points: 1 },
    0: { foir: -0.1, points: 0 },
    "?": { foir: -0.03, points: 1 },
  };
  var WORK_TYPE = { Salaried: "salaried", "Self Employed": "self" };
  function workType() {
    var el = document.querySelector('input[name="workType"]:checked');
    return el ? WORK_TYPE[el.value] || "" : "";
  }
  var FROM_FLOW = {
    "Student Loan": "student-loan",
    "Business Loan": "business-loan",
    "Personal Loan": "personal-loan",
    "Home Loan": "home-loan",
    "Auto Loan": "auto-loan",
    "Gold Loan": "gold-loan",
    "Payday Loan": "payday-loan",
  };

  function $(id) {
    return document.getElementById(id);
  }
  function inr(n) {
    return Math.round(n).toLocaleString("en-IN");
  }
  function money(n) {
    return "₹" + inr(n);
  }
  function num(el) {
    return parseFloat(String(el.value).replace(/,/g, ""));
  }
  function choice(name) {
    var el = form.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : "";
  }
  function periodLabel(m) {
    if (m < 12 || m % 12) return m + " months";
    var y = m / 12;
    return y + (y === 1 ? " year" : " years");
  }
  function pmt(P, annual, n) {
    var r = annual / 12 / 100;
    return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  var store = {};
  try {
    store = JSON.parse(sessionStorage.getItem("cashloan_choices_v2")) || {};
  } catch (e) {}

  // keep the money boxes tidy while typing
  ["income", "emis", "goldRate"].forEach(function (id) {
    var el = $(id);
    el.addEventListener("input", function () {
      var d = el.value.replace(/\D/g, "");
      el.value = d ? Math.min(+d, 99999999).toLocaleString("en-IN") : "";
    });
  });
  $("grams").addEventListener("input", function () {
    var v = $("grams").value.replace(/[^\d.]/g, "");
    var i = v.indexOf(".");
    if (i > -1) v = v.slice(0, i + 1) + v.slice(i + 1).replace(/\./g, "");
    $("grams").value = v.slice(0, 9);
  });

  // ----- which loan is this page for -----
  var current = "";
  function setLoan(slug) {
    var cfg = LOANS[slug];
    current = slug;
    root.style.setProperty("--a", cfg.a);
    $("eligTitle").textContent = cfg.name + " Eligibility";
    $("eligLead").textContent =
      "Answer a few quick questions to see how much " +
      cfg.name +
      " you may get.";
    document.title = cfg.name + " Eligibility | CashLoan";
    var income = cfg.mode === "income";
    $("incomeFields").hidden = !income;
    $("goldFields").hidden = income;
    $("ageField").hidden = false;
    $("incomeLabel").textContent = cfg.incomeLabel || "Monthly income";
    $("ageLabel").textContent = cfg.ageLabel || "Your age";
    $("workLabel").textContent = cfg.workLabel || "Employment type";
    $("emisLabel").textContent =
      cfg.emisLabel || "Loan EMIs you already pay each month";
    var hint = $("incomeHint");
    hint.textContent = cfg.incomeHint || "";
    hint.hidden = !cfg.incomeHint;
    errBox.textContent = "";

    // loan periods that make sense for this loan
    var box = $("periodPills"),
      html = "",
      pick;
    var flowMonths = {
      "06 - 12 month": 9,
      "01 - 03 Year": 24,
      "03 - 05 Year": 48,
      "05 - 10 Year": 84,
      "10+ Year": 144,
    }[store.period];
    var inRange =
      flowMonths &&
      flowMonths >= cfg.periods[0] &&
      flowMonths <= cfg.periods[cfg.periods.length - 1];
    var target = inRange ? flowMonths : cfg.def; // the earlier choice if it suits this loan, else a normal period for it
    pick = cfg.periods[0];
    cfg.periods.forEach(function (m) {
      if (Math.abs(m - target) < Math.abs(pick - target)) pick = m;
    });
    cfg.periods.forEach(function (m) {
      html +=
        '<label class="pill-opt"><input type="radio" name="period" value="' +
        m +
        '" autocomplete="off"' +
        (m === pick ? " checked" : "") +
        "><span>" +
        periodLabel(m) +
        "</span></label>";
    });
    box.innerHTML = html;

    hideResult();
  }
  function hideResult() {
    out.hidden = true;
    out.innerHTML = "";
    root.classList.remove("has-result");
  }

  var fromAddress = (/[?&]loan=([a-z-]+)/.exec(location.search) || [])[1];
  if (fromAddress && LOANS[fromAddress]) {
    setLoan(fromAddress);
  } else {
    $("loanPick").hidden = false;
    var start = FROM_FLOW[store.loanType] || "personal-loan";
    form.querySelector('input[name="loan"][value="' + start + '"]').checked =
      true;
    setLoan(start);
    form.querySelectorAll('input[name="loan"]').forEach(function (r) {
      r.addEventListener("change", function () {
        setLoan(r.value);
      });
    });
  }

  // ----- the estimates -----
  function estimateIncome(cfg, a) {
    var s = SCORE[a.score],
      tips = [],
      bad = [];
    var maxMonths = Math.max(0, Math.floor((65 - a.age) * 12));
    var n = Math.min(a.months, maxMonths);

    var foir = a.income >= 50000 ? 0.5 : a.income >= 20000 ? 0.45 : 0.4;
    foir += s.foir;
    if (a.work !== "salaried") foir -= 0.03;
    foir = Math.min(0.5, Math.max(0.25, foir)); // never above the 50% comfort limit

    var capacity = Math.max(0, foir * a.income - a.emis);
    var rate = cfg.rates[a.score] + (a.work === "salaried" ? 0 : 1);
    var r = rate / 12 / 100,
      loan = 0,
      emi = 0;
    if (capacity > 0 && n > 0) {
      loan = (capacity * (1 - Math.pow(1 + r, -n))) / r;
      var step = loan >= 100000 ? 5000 : 1000;
      loan = Math.min(cfg.max, Math.floor(loan / step) * step);
      if (cfg.incomeTimes)
        loan = Math.min(
          loan,
          Math.floor((a.income * cfg.incomeTimes) / 1000) * 1000,
        );
      emi = pmt(loan, rate, n);
    }
    if (cfg.salaryOnly && a.work !== "salaried") {
      loan = 0;
      emi = 0;
    }

    var pts = s.points,
      burden = a.emis / a.income;
    pts += burden < 0.2 ? 2 : burden < 0.35 ? 1 : burden >= 0.5 ? -2 : 0;
    pts += a.income >= 50000 ? 2 : a.income >= 20000 ? 1 : 0;
    pts += a.work === "salaried" ? 1 : 0;
    pts += a.age >= 21 && a.age <= 58 ? 1 : 0;
    var level = pts >= 6 ? "good" : pts >= 3 ? "fair" : "low";
    if (loan <= 0 || n <= 0 || a.age < 21) level = "low";

    if (a.score === "750")
      tips.push(
        "A credit score of 750 or more is a strong point and can bring a lower rate.",
      );
    else if (a.score === "700")
      tips.push(
        "A credit score of 700 or more is usually accepted by most lenders.",
      );
    if (a.score === "0" || a.score === "650")
      bad.push(
        "A credit score below 700 can lower the amount and raise the rate. Paying dues on time for a few months helps.",
      );
    if (a.score === "?")
      bad.push(
        "You did not know your credit score. Check it for free, since it decides your rate.",
      );
    if (burden < 0.2)
      tips.push(
        "Your current EMIs are small compared with your income, which lenders like.",
      );
    if (burden >= 0.35)
      bad.push(
        "Your existing EMIs already take a large part of your income. Closing a small loan first can raise what you may get.",
      );
    if (a.work !== "salaried")
      bad.push(
        "Lenders often ask for more proof when income is not a fixed salary. Keep bank statements and returns ready.",
      );
    else tips.push("A regular salary makes your income easy to verify.");
    if (a.age < 21)
      bad.push(
        "Most lenders want the borrower to be 21 or older. You may need a co-applicant.",
      );
    if (n < a.months)
      bad.push(
        "Your age limits the loan period, since most lenders want the loan to end by about age 65.",
      );
    if (capacity <= 0)
      bad.push(
        "After your existing EMIs there is little room left for a new one.",
      );
    if (a.income < 15000)
      bad.push(
        "Many lenders have a minimum income. Ask them before you apply.",
      );
    if (cfg.salaryOnly && a.work !== "salaried")
      bad.push("Payday loans are usually given only against a regular salary.");
    if (cfg.salaryOnly && loan > 0)
      bad.push(
        "Payday loans cost much more than other loans. Compare a salary advance from your employer or a personal loan first.",
      );

    return {
      level: level,
      loan: loan,
      emi: emi,
      rate: rate,
      months: n,
      burden: (a.emis + emi) / a.income,
      tips: tips,
      bad: bad,
      basis:
        "We assumed that up to " +
        Math.round(foir * 100) +
        "% of " +
        (cfg.ageLabel ? "the" : "your") +
        " income can go to EMIs, at about " +
        rate +
        "% a year.",
    };
  }

  function estimateGold(cfg, a) {
    var value = a.grams * (a.purity / 24) * a.goldRate;
    var loan = Math.min(cfg.max, Math.floor((value * 0.75) / 1000) * 1000);
    var tips = [
      "Lenders usually give up to about 75% of the value of your gold.",
      "Your income and credit score matter much less for a loan against gold.",
    ];
    var bad = [
      "Only the weight of pure gold counts. Stones and other parts of the jewellery are not valued.",
      "Gold is valued at the rate of the day, so the amount can go up or down.",
    ];
    var level = a.age >= 18 && loan > 0 ? "good" : "low";
    if (a.age < 18) bad.unshift("You need to be 18 or older to take a loan.");
    if (loan <= 0)
      bad.unshift("The weight or rate you gave is too low for a loan.");
    return {
      level: level,
      loan: loan,
      emi: loan > 0 ? pmt(loan, cfg.rate, a.months) : 0,
      rate: cfg.rate,
      months: a.months,
      value: value,
      tips: tips,
      bad: bad,
      basis:
        "We assumed about 75% of the value of your gold and a rate of about " +
        cfg.rate +
        "% a year.",
    };
  }

  // ----- the answer on the screen -----
  var HEAD = {
    good: ["Good chance", "Your details look strong for this loan."],
    fair: [
      "Fair chance",
      "You may get this loan, but a few things could be improved.",
    ],
    low: [
      "Low chance for now",
      "The details you gave may make approval hard right now.",
    ],
  };
  function li(items) {
    return items
      .map(function (t) {
        return "<li>" + t + "</li>";
      })
      .join("");
  }

  function show(cfg, e) {
    var h = HEAD[e.level],
      html =
        '<div class="panel verdict ' +
        e.level +
        '">' +
        '<span class="badge">' +
        h[0] +
        "</span>" +
        '<p class="res-sub first">' +
        h[1] +
        "</p>";
    if (e.loan > 0) {
      html +=
        '<p class="res-label">You may be able to borrow up to</p><p class="emi-big">' +
        money(e.loan) +
        "</p>" +
        '<p class="res-sub">EMI of about ' +
        money(e.emi) +
        " a month for " +
        periodLabel(e.months) +
        " at around " +
        e.rate +
        "% a year</p>";
      if (e.value)
        html +=
          '<p class="res-sub">Your gold is worth about ' +
          money(e.value) +
          " at today&rsquo;s rate.</p>";
      if (e.burden !== undefined) {
        html +=
          '<div class="meter" aria-hidden="true"><div class="meter-bar"><i style="width:' +
          Math.min(100, Math.round(e.burden * 100)) +
          '%"></i><b></b></div>' +
          '<div class="meter-meta"><span>EMIs vs income: ' +
          Math.round(e.burden * 100) +
          "%</span><span>Comfort limit about 50%</span></div></div>";
      }
    } else {
      html +=
        '<p class="res-label">Estimated loan</p><p class="emi-big small">Not available right now</p>';
    }
    if (e.loan > 0 && e.basis)
      html += '<p class="res-basis">' + e.basis + "</p>";
    if (e.tips.length)
      html +=
        '<h3 class="res-h">What is working for you</h3><ul class="list ticks">' +
        li(e.tips) +
        "</ul>";
    if (e.bad.length)
      html +=
        '<h3 class="res-h">What could be better</h3><ul class="list cross">' +
        li(e.bad) +
        "</ul>";
    if (cfg.notes && cfg.notes.length)
      html +=
        '<h3 class="res-h">Good to know</h3><ul class="list ticks">' +
        li(cfg.notes) +
        "</ul>";
    var q =
      e.loan > 0
        ? "?amount=" + e.loan + "&rate=" + e.rate + "&months=" + e.months
        : "";
    html +=
      '<div class="btn-row"><a class="btn" id="applyBtn" data-interstitial-trigger="interstitial-apply-loan" href="blog-' +
      current +
      ".html" +
      q +
      '">Apply loan</a>' +
      '<a class="btn ghost" href="blogs.html">Choose another loan</a></div>' +
      '<p class="res-note">This is only an estimate to help you plan. The real amount, rate and approval are decided by the lender.</p></div>';
    out.innerHTML = html;
    out.hidden = false;
    root.classList.add("has-result");
    out.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function mark(el, on) {
    if (el) el.classList.toggle("has-error", !!on);
  }
  function clearMarks() {
    ["age", "income", "grams", "goldRate"].forEach(function (id) {
      mark($(id).closest(".money"), false);
    });
    mark(document.querySelector(".select[data-key='workKind']"), false);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    errBox.textContent = "";
    clearMarks();
    var cfg = LOANS[current],
      missing = [],
      first = null;
    function need(text, focusEl, markEl) {
      missing.push(text);
      mark(markEl, true);
      if (!first) first = focusEl;
    }
    var age = num($("age"));
    var ageOk = age >= 18 && age <= 70;
    var months = +choice("period"),
      e;

    if (cfg.mode === "gold") {
      var grams = num($("grams")),
        rate24 = num($("goldRate"));
      if (!ageOk)
        need("your age (18 to 70)", $("age"), $("age").closest(".money"));
      if (!(grams > 0))
        need(
          "the weight of your gold",
          $("grams"),
          $("grams").closest(".money"),
        );
      if (!(rate24 > 0))
        need(
          "today's rate of 24 carat gold",
          $("goldRate"),
          $("goldRate").closest(".money"),
        );
      else if (rate24 < 1000) {
        errBox.textContent =
          "Please check the rate. It should be the price of 1 gram of 24 carat gold, usually several thousand rupees.";
        mark($("goldRate").closest(".money"), true);
        $("goldRate").focus();
        return;
      }
    } else {
      var income = num($("income")),
        emis = num($("emis")) || 0;
      var jobBox = document.querySelector(".select[data-key='workKind']");
      if (!ageOk)
        need("your age (18 to 70)", $("age"), $("age").closest(".money"));
      if (!(income > 0))
        need("your monthly income", $("income"), $("income").closest(".money"));
      if (!workType()) need("your employment type", jobBox, jobBox);
    }
    if (missing.length) {
      errBox.textContent =
        "Please fill in " +
        missing.join(", ").replace(/, ([^,]*)$/, " and $1") +
        ".";
      if (first) first.focus();
      return;
    }

    if (cfg.mode === "gold") {
      e = estimateGold(cfg, {
        age: age,
        grams: grams,
        purity: +choice("purity"),
        goldRate: rate24,
        months: months,
      });
    } else {
      e = estimateIncome(cfg, {
        age: age,
        income: income,
        emis: emis,
        work: workType(),
        score: choice("score"),
        months: months,
      });
    }
    show(cfg, e);
  });

  document.addEventListener("change", function (ev) {
    if (ev.target && ev.target.name === "workType" && !out.hidden) hideResult();
  });

  form.addEventListener("input", clearMarks);
  document.addEventListener("change", function (ev) {
    if (ev.target && ev.target.name === "workType") clearMarks();
  });

  // any change after a result was shown hides the old answer
  form.addEventListener("input", function () {
    if (!out.hidden) hideResult();
  });
  form.addEventListener("change", function () {
    if (!out.hidden) hideResult();
  });
})();
