// Mockup only: shows the two motions that need approval, the paycheck tear and the balance count.
// Durations come from tokens.css, which sets them to 0ms under prefers-reduced-motion, so both become instant.

const ms = (name) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

const money = (cents) =>
  (cents < 0 ? "-$" : "$") + (Math.abs(cents) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

function countTo(el) {
  const from = Number(el.dataset.from);
  const to = Number(el.dataset.to);
  const duration = ms("--duration-count");
  el.classList.toggle("is-negative", to < 0);
  const meter = el.closest("[data-demo-meter]");
  if (meter) {
    const flash = to >= from ? "is-up" : "is-down";
    meter.classList.remove("is-up", "is-down");
    void meter.offsetWidth; // restart the flash
    if (duration > 0) meter.classList.add(flash);
  }
  if (duration === 0) { el.textContent = money(to); return; }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = money(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  el.textContent = money(from);
  requestAnimationFrame(step);
}

// Result of a choice: count every meter as the page opens.
document.querySelectorAll("[data-demo-count]").forEach((el) => {
  if (!el.closest(".payday-cashed")) countTo(el);
});

// Payday: tear the check off, then count the cash in.
const tear = document.querySelector("[data-demo-tear]");
if (tear) {
  tear.addEventListener("click", () => {
    const payday = document.querySelector(".payday");
    payday.querySelector(".payday-check").classList.add("is-torn");
    tear.disabled = true;
    setTimeout(() => {
      payday.classList.add("is-cashed");
      tear.hidden = true;
      const after = payday.querySelector("[data-demo-after]");
      after.hidden = false;
      after.focus();
      payday.querySelectorAll(".payday-cashed [data-demo-count]").forEach(countTo);
    }, ms("--duration-tear"));
  });
}
