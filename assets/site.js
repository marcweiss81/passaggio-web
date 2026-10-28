/* Passaggio website behaviour: mobile menu, current-page marking, latest-APK lookup. */
(function () {
  "use strict";

  const RELEASES_API =
    "https://api.github.com/repos/marcweiss81/passaggio-releases/releases/tags/latest";
  const RELEASES_PAGE = "https://github.com/marcweiss81/passaggio-releases/releases/latest";

  function setupMenu() {
    const button = document.querySelector(".menu-btn");
    const nav = document.querySelector(".nav");
    if (!button || !nav) return;
    button.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.textContent = open ? "Close" : "Menu";
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        button.setAttribute("aria-expanded", "false");
        button.textContent = "Menu";
      });
    });
  }

  function markCurrentPage() {
    const path = location.pathname.replace(/\/index\.html$/, "/");
    document.querySelectorAll(".nav a, .site-footer nav a").forEach(function (link) {
      const href = link.getAttribute("href") || "";
      if (href.indexOf("#") === 0 || href.indexOf("http") === 0) return;
      const target = new URL(href, location.href).pathname.replace(/\/index\.html$/, "/");
      if (target === path) link.setAttribute("aria-current", "page");
    });
  }

  function formatSize(bytes) {
    return (bytes / (1024 * 1024)).toFixed(0) + " MB";
  }

  function formatDate(iso) {
    const date = new Date(iso);
    return date.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
  }

  function newestApk(assets) {
    return assets
      .filter(function (asset) { return /\.apk$/i.test(asset.name); })
      .sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); })[0];
  }

  function fillDownload() {
    const link = document.getElementById("apk-link");
    const meta = document.getElementById("apk-meta");
    if (!link) return;
    fetch(RELEASES_API, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (release) {
        if (!release || !release.assets) return;
        const apk = newestApk(release.assets);
        if (!apk) return;
        link.href = apk.browser_download_url;
        link.textContent = "Download " + apk.name;
        if (meta) {
          meta.textContent =
            formatSize(apk.size) + " · built " + formatDate(apk.created_at) +
            " · SHA-256 " + (apk.digest || "").replace("sha256:", "").slice(0, 16) + "…";
        }
      })
      .catch(function () {
        link.href = RELEASES_PAGE;
      });
  }

  function setYear() {
    document.querySelectorAll("[data-year]").forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  // A link such as /features.html#songs opens that disclosure section.
  function openLinkedDisclosure() {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    if (target && target.tagName === "DETAILS") target.open = true;
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupMenu();
    openLinkedDisclosure();
    markCurrentPage();
    fillDownload();
    setYear();
  });
  window.addEventListener("hashchange", openLinkedDisclosure);
})();
