/* Cash Loan - small helper script (no libraries needed) */

// ----- Contact form settings -----
var CONTACT_ENDPOINT = "";
var CONTACT_EMAIL = "support@cashloan.example";

(function () {
  "use strict";

  var STORE_KEY = "cashloan_choices_v2";

  function readStore() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function writeStore(data) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(data)); }
    catch (e) { /* private mode */ }
  }

  // True when the visitor pressed refresh (reload button / F5)
  function isReload() {
    var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    if (nav) return nav.type === "reload";
    return !!(window.performance && performance.navigation && performance.navigation.type === 1);
  }
  var reloaded = isReload();

  var choices = readStore();

  // ----- Dropdown buttons that open a dialog with radio options -----
  document.querySelectorAll(".select[data-key]").forEach(function (btn) {
    var key = btn.getAttribute("data-key");
    var dialog = document.getElementById(btn.getAttribute("aria-controls"));
    var label = btn.querySelector(".select-value");
    var radios = Array.prototype.slice.call(dialog.querySelectorAll('input[type="radio"]'));
    var what = btn.getAttribute("data-label") || "an option";
    var next = document.querySelector(".cta .btn");
    var errBox = document.getElementById("fieldError");

    if (reloaded) { delete choices[key]; writeStore(choices); }

    radios.forEach(function (r) { r.checked = (r.value === choices[key]); });
    if (!dialog.querySelector("input:checked")) delete choices[key];

    function clearError() {
      btn.classList.remove("has-error");
      if (errBox) errBox.textContent = "";
    }
    function refresh() {
      var picked = !!choices[key];
      label.textContent = picked ? choices[key] : "Select " + what;
      btn.classList.toggle("is-empty", !picked);
      if (next) {
        next.classList.toggle("is-disabled", !picked);
        next.setAttribute("aria-disabled", picked ? "false" : "true");
        next.setAttribute("data-google-interstitial", picked ? "true" : "false");
      }
      if (picked) clearError();
    }
    refresh();

    if (next) {
      next.addEventListener("click", function (e) {
        if (choices[key]) return;
        e.preventDefault();
        if (errBox) errBox.textContent = "Please select your " + what + " to continue.";
        btn.classList.remove("has-error");
        void btn.offsetWidth;
        btn.classList.add("has-error");
      });
    }

    function place() {
      var r = btn.getBoundingClientRect();
      var gap = 10, edge = 12;
      var box = dialog.querySelector(".options");
      dialog.style.width = r.width + "px";
      dialog.style.left = r.left + "px";
      box.style.maxHeight = "";
      var h = dialog.offsetHeight;
      if (r.bottom + gap + h <= window.innerHeight - edge) {
        dialog.style.top = r.bottom + gap + "px";
        dialog.style.bottom = "auto";
      } else {
        dialog.style.bottom = window.innerHeight - r.top + gap + "px";
        dialog.style.top = "auto";
      }
      box.style.maxHeight = Math.max(120, window.innerHeight - Math.abs(r.bottom + gap - (window.innerHeight - h)) - edge * 2) + "px";
    }

    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      if (expanded) {
        dialog.close();
        return;
      }
      place();
      dialog.showModal();
      btn.setAttribute("aria-expanded", "true");
    });

    window.addEventListener("resize", function () {
      if (dialog.open) place();
    });
    window.addEventListener("scroll", function () {
      if (dialog.open) place();
    }, { passive: true });

    radios.forEach(function (r) {
      r.addEventListener("change", function () {
        choices[key] = r.value;
        writeStore(choices);
        refresh();
      });
      r.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); dialog.close(); }
      });
    });

    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) { dialog.close(); return; }
      if (e.detail > 0 && e.target.closest(".option")) {
        setTimeout(function () { dialog.close(); }, 160);
      }
    });

    dialog.addEventListener("close", function () {
      btn.setAttribute("aria-expanded", "false");
      btn.focus();
    });
  });

  // ----- Contact form -----
  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    var statusEl = document.getElementById("formStatus");
    var sendBtn = contactForm.querySelector('button[type="submit"]');

    var showStatus = function (text, ok) {
      statusEl.textContent = text;
      statusEl.className = "form-status " + (ok ? "ok" : "err");
    };

    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = contactForm.elements;
      if (f.website && f.website.value) return;

      var data = {
        firstName: f.firstName.value.trim(),
        lastName: f.lastName.value.trim(),
        email: f.email.value.trim(),
        message: f.message.value.trim()
      };

      if (!CONTACT_ENDPOINT) {
        var fullName = data.firstName + " " + data.lastName;
        var body = "Name: " + fullName + "\nEmail: " + data.email + "\n\n" + data.message;
        window.location.href = "mailto:" + CONTACT_EMAIL +
          "?subject=" + encodeURIComponent("Message from " + fullName) +
          "&body=" + encodeURIComponent(body);
        showStatus("Opening your email app. Please press send there to finish.", true);
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "Sending...";
      showStatus("", true);
      fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed: " + res.status);
          contactForm.reset();
          showStatus("Thank you! Your message has been sent. We will get back to you soon.", true);
        })
        .catch(function () {
          showStatus("Sorry, your message could not be sent. Please try again in a moment.", false);
        })
        .then(function () {
          sendBtn.disabled = false;
          sendBtn.textContent = "Send";
        });
    });
  }

  // ----- Back buttons on About / Privacy / Contact return to the page you came from -----
  document.querySelectorAll("a.back[data-history]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      if (document.referrer && document.referrer.indexOf(location.origin) === 0 && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    });
  });

  // ----- Last page: show what the visitor selected -----
  document.querySelectorAll("[data-summary]").forEach(function (el) {
    el.textContent = choices[el.getAttribute("data-summary")] || "Not selected";
  });

  // A refresh starts every page fresh
  if (reloaded) {
    var startFresh = function () {
      window.scrollTo(0, 0);
      var cf = document.getElementById("contactForm");
      if (cf) cf.reset();
    };
    window.addEventListener("load", function () { startFresh(); setTimeout(startFresh, 80); });
  }

})();
