(function () {
  "use strict";

  var data = window.GENOME_DATA;
  if (!data) return;

  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }
  function icon(name) {
    var node = document.createElement("i");
    node.setAttribute("data-lucide", name);
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function normalise(value) {
    return String(value || "").toLocaleLowerCase("hu-HU").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
  function external(url, label) {
    var link = el("a", "", label);
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.appendChild(icon("external-link"));
    return link;
  }

  function initNav() {
    var button = one("[data-nav-toggle]");
    var sidebar = one("#oldalsav");
    if (!button || !sidebar) return;
    button.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      button.innerHTML = "";
      button.appendChild(icon(open ? "x" : "menu"));
      refreshIcons();
    });
    all(".nav-link", sidebar).forEach(function (link) {
      link.addEventListener("click", function () { sidebar.classList.remove("open"); });
    });
  }

  function initReveal() {
    var items = all(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (item) { item.classList.add("visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -25px" });
    items.forEach(function (item, index) {
      item.style.transitionDelay = Math.min(index % 5, 3) * 45 + "ms";
      observer.observe(item);
    });
  }

  function initTilt() {
    if (window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return;
    all(".tilt").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var box = card.getBoundingClientRect();
        var x = (event.clientX - box.left) / box.width - 0.5;
        var y = (event.clientY - box.top) / box.height - 0.5;
        card.style.transform = "rotateX(" + (-y * 4).toFixed(2) + "deg) rotateY(" + (x * 5).toFixed(2) + "deg) translateY(-2px)";
      });
      card.addEventListener("pointerleave", function () { card.style.transform = ""; });
    });
  }

  function initGenomeScene() {
    var canvas = one("[data-genome-scene]");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var context = canvas.getContext("2d");
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    var width = 0;
    var height = 0;
    var frame = 0;
    var points = Array.from({ length: 44 }, function (_, index) {
      return { x: (index * 83) % 997 / 997, y: (index * 157) % 991 / 991, z: (index * 47) % 100 / 100 };
    });
    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function draw() {
      frame += 0.006;
      context.clearRect(0, 0, width, height);
      points.forEach(function (point) {
        var drift = (point.y + frame * (0.05 + point.z * 0.05)) % 1;
        var size = 0.6 + point.z * 1.8;
        context.fillStyle = "rgba(118,224,213," + (0.05 + point.z * 0.16) + ")";
        context.fillRect(point.x * width, drift * height, size, size);
      });
      var centerX = width * 0.72;
      var amp = Math.min(width * 0.12, 135);
      var top = height * 0.04;
      var span = height * 0.8;
      for (var index = 0; index < 34; index += 1) {
        var t = index / 33;
        var angle = t * Math.PI * 7 + frame * 8;
        var y = top + t * span;
        var x1 = centerX + Math.sin(angle) * amp;
        var x2 = centerX + Math.sin(angle + Math.PI) * amp;
        var depth = (Math.cos(angle) + 1) / 2;
        context.beginPath();
        context.moveTo(x1, y);
        context.lineTo(x2, y);
        context.strokeStyle = "rgba(101,210,201," + (0.04 + depth * 0.12) + ")";
        context.lineWidth = 1;
        context.stroke();
        context.beginPath();
        context.arc(x1, y, 1.4 + depth * 2, 0, Math.PI * 2);
        context.fillStyle = "rgba(77,217,210," + (0.2 + depth * 0.55) + ")";
        context.fill();
        context.beginPath();
        context.arc(x2, y, 1.4 + (1 - depth) * 2, 0, Math.PI * 2);
        context.fillStyle = "rgba(183,219,99," + (0.16 + (1 - depth) * 0.45) + ")";
        context.fill();
      }
      requestAnimationFrame(draw);
    }
    resize();
    window.addEventListener("resize", resize);
    draw();
  }

  var vusLabels = {
    hordozosag: "Hordozói lelet",
    ismert_allapot: "Ismert állapot része",
    kiemelt_bizonytalan: "Kiemelt bizonytalan",
    gyenge_technikai: "Gyenge BAM-jel",
    nem_megerositett: "BAM-mal nem támogatott",
    vus: "Valódi VUS",
    kockazati_jel: "Kockázati marker",
    joindulatu_irany: "Jóindulatú irány"
  };

  function clinvarHu(value) {
    var parts = String(value || "").split("|").map(function (part) {
      return {
        Pathogenic: "patogén",
        Likely_pathogenic: "valószínűleg patogén",
        Uncertain_significance: "bizonytalan jelentőségű",
        Conflicting_classifications_of_pathogenicity: "ellentmondó besorolások",
        Benign: "jóindulatú",
        Likely_benign: "valószínűleg jóindulatú",
        risk_factor: "kockázati tényező",
        drug_response: "gyógyszerválasz",
        association: "asszociáció",
        other: "egyéb"
      }[part] || part.replaceAll("_", " ");
    });
    return parts.filter(Boolean).join(" / ") || "nincs összesített besorolás";
  }

  function renderVus() {
    var body = one("[data-vus-table]");
    if (!body) return;
    var search = one("[data-vus-search]");
    var filter = one("[data-vus-filter]");
    var count = one("[data-vus-count]");
    function draw() {
      var query = normalise(search.value);
      var wanted = filter.value;
      var rows = data.vus.filter(function (item) {
        var text = [item.gene, item.variant, item.meaningHu, item.actionHu, item.report, item.currentClnsig, item.currentConditions].join(" ");
        return (!query || normalise(text).indexOf(query) !== -1) && (!wanted || item.status === wanted);
      });
      body.innerHTML = "";
      count.textContent = rows.length + " / " + data.vus.length + " variáns";
      if (!rows.length) {
        var emptyRow = document.createElement("tr");
        var emptyCell = el("td", "empty", "Nincs a szűrésnek megfelelő variáns.");
        emptyCell.colSpan = 5;
        emptyRow.appendChild(emptyCell);
        body.appendChild(emptyRow);
        return;
      }
      rows.forEach(function (item) {
        var row = document.createElement("tr");
        var name = document.createElement("td");
        name.appendChild(el("strong", "", item.gene));
        name.appendChild(el("code", "", item.variant || item.genotype || "ClinVar allél " + item.clinvarId));
        name.appendChild(el("span", "status-pill " + item.status, vusLabels[item.status] || item.status));
        row.appendChild(name);
        var meaning = document.createElement("td");
        meaning.appendChild(el("div", "", item.meaningHu));
        if (item.actionHu) meaning.appendChild(el("small", "", "Teendő: " + item.actionHu));
        row.appendChild(meaning);
        var bam = document.createElement("td");
        var depth = item.bam && item.bam.depth !== undefined ? item.bam.depth : 0;
        var alt = item.bam && item.bam.alternateReads !== undefined ? item.bam.alternateReads : 0;
        bam.appendChild(el("strong", "", alt + " eltérő / " + depth + "×"));
        bam.appendChild(el("small", "", depth >= 10 && alt >= 3 ? "Technikailag támogatott" : alt >= 1 ? "Gyenge támogatás" : "Nem támogatott"));
        row.appendChild(bam);
        var report = document.createElement("td");
        report.appendChild(el("span", "", item.reportTitleHu || item.report.replace(".pdf", "")));
        report.appendChild(el("small", "", "Dante: VUS · jelenlegi ClinVar: " + clinvarHu(item.currentClnsig)));
        row.appendChild(report);
        var source = document.createElement("td");
        if (item.variationId) source.appendChild(external("https://www.ncbi.nlm.nih.gov/clinvar/variation/" + item.variationId + "/", "ClinVar "));
        row.appendChild(source);
        body.appendChild(row);
      });
      refreshIcons();
    }
    search.addEventListener("input", draw);
    filter.addEventListener("change", draw);
    draw();
  }

  function clinicalStatus(report) {
    return {
      clinical: "Klinikai lelet",
      known: "Ismert állapot",
      informational: "Információs / VUS",
      negative: "Kóroki eltérés nélkül"
    }[report.statusType] || report.status;
  }

  function renderClinical() {
    var root = one("[data-clinical-list]");
    if (!root) return;
    var search = one("[data-clinical-search]");
    var category = one("[data-clinical-category]");
    var status = one("[data-clinical-status]");
    category.appendChild(new Option("Minden kategória", ""));
    Object.keys(data.categories).sort(function (a, b) { return a.localeCompare(b, "hu"); }).forEach(function (name) {
      category.appendChild(new Option(name + " (" + data.categories[name] + ")", name));
    });
    function draw() {
      var query = normalise(search.value);
      var rows = data.clinicalReports.filter(function (item) {
        var finding = item.finding ? [item.finding.gene, item.finding.variant, item.finding.meaning].join(" ") : "";
        return (!query || normalise([item.title, item.category, item.description, finding].join(" ")).indexOf(query) !== -1) && (!category.value || item.category === category.value) && (!status.value || item.statusType === status.value);
      });
      root.innerHTML = "";
      if (!rows.length) { root.appendChild(el("div", "empty", "Nincs a szűrésnek megfelelő riport.")); return; }
      rows.forEach(function (item) {
        var row = el("article", "clinical-item");
        var title = document.createElement("div");
        title.appendChild(el("h3", "", item.title));
        title.appendChild(el("span", "category", item.category));
        if (item.finding) title.appendChild(el("code", "", item.finding.gene + " · " + item.finding.variant));
        row.appendChild(title);
        row.appendChild(el("p", "", item.finding ? item.finding.meaning : item.description));
        var meta = el("div", "clinical-meta");
        meta.appendChild(el("span", "report-status " + item.statusType, clinicalStatus(item)));
        var link = el("a", "", "PDF");
        link.href = item.url;
        link.target = "_blank";
        link.appendChild(icon("file-text"));
        meta.appendChild(link);
        row.appendChild(meta);
        root.appendChild(row);
      });
      refreshIcons();
    }
    search.addEventListener("input", draw);
    category.addEventListener("change", draw);
    status.addEventListener("change", draw);
    draw();
  }

  function renderMedications() {
    var root = one("[data-med-grid]");
    if (!root) return;
    var search = one("[data-med-search]");
    var filter = one("[data-med-filter]");
    var items = data.medications.concat(data.notAssessedMedications);
    var statusText = { high: "Kiemelt", watch: "Ellenőrzendő", context: "Helyzetfüggő", normal: "Szokásos válasz", unresolved: "Külön vizsgálat kell" };
    function draw() {
      var query = normalise(search.value);
      var rows = items.filter(function (item) {
        return (!query || normalise([item.title, item.gene, item.variant, item.result, item.meaning, item.examples.join(" ")].join(" ")).indexOf(query) !== -1) && (!filter.value || item.priority === filter.value);
      });
      root.innerHTML = "";
      rows.forEach(function (item) {
        var card = el("article", "med-card " + item.priority);
        var head = document.createElement("header");
        var title = document.createElement("div");
        title.appendChild(el("h2", "", item.title));
        title.appendChild(el("code", "", item.gene + " · " + item.variant));
        head.appendChild(title);
        head.appendChild(el("span", "report-status " + (item.priority === "normal" ? "negative" : item.priority === "high" ? "clinical" : "informational"), statusText[item.priority]));
        card.appendChild(head);
        card.appendChild(el("div", "result", item.result));
        card.appendChild(el("p", "", item.meaning));
        var examples = el("div", "examples");
        examples.appendChild(el("strong", "", "Készítménypéldák"));
        item.examples.forEach(function (example) { examples.appendChild(el("span", "", example)); });
        card.appendChild(examples);
        card.appendChild(el("div", "action", item.action));
        var details = document.createElement("details");
        var summary = document.createElement("summary");
        summary.textContent = "Biztonsági megjegyzés";
        details.appendChild(summary);
        details.appendChild(el("p", "", item.warning));
        details.appendChild(external(item.sourceUrl, "Szakmai forrás "));
        card.appendChild(details);
        root.appendChild(card);
      });
      refreshIcons();
    }
    search.addEventListener("input", draw);
    filter.addEventListener("change", draw);
    draw();
  }

  function renderLifestyle() {
    var root = one("[data-life-list]");
    if (!root) return;
    var buttons = all("[data-life-tab]");
    var active = "Alvás";
    function draw() {
      root.innerHTML = "";
      data.lifestyle.filter(function (item) { return item.group === active; }).forEach(function (item) {
        var card = el("article", "life-item");
        card.appendChild(el("span", "", item.result));
        card.appendChild(el("h3", "", item.title));
        card.appendChild(el("code", "", item.gene));
        card.appendChild(el("p", "", item.meaning));
        card.appendChild(el("p", "advice", item.action));
        root.appendChild(card);
      });
    }
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        active = button.getAttribute("data-life-tab");
        buttons.forEach(function (other) { other.classList.toggle("active", other === button); });
        draw();
      });
    });
    draw();
  }

  function renderReports() {
    var root = one("[data-report-library]");
    if (!root) return;
    var search = one("[data-report-search]");
    var type = one("[data-report-type]");
    function draw() {
      var query = normalise(search.value);
      var rows = data.reports.filter(function (item) {
        return (!query || normalise([item.type, item.category, item.title, item.status].join(" ")).indexOf(query) !== -1) && (!type.value || item.type === type.value);
      });
      root.innerHTML = "";
      rows.forEach(function (item) {
        var row = el("article", "library-item");
        row.appendChild(el("span", "", item.type));
        row.appendChild(el("span", "", item.category));
        var title = document.createElement("div");
        title.appendChild(el("strong", "", item.title));
        title.appendChild(el("small", "", item.status));
        row.appendChild(title);
        var link = el("a", "", "Megnyitás");
        link.href = item.url;
        link.target = "_blank";
        link.appendChild(icon("download"));
        row.appendChild(link);
        root.appendChild(row);
      });
      refreshIcons();
    }
    search.addEventListener("input", draw);
    type.addEventListener("change", draw);
    draw();
  }

  function renderSources() {
    var root = one("[data-source-list]");
    if (!root) return;
    data.sources.forEach(function (item) {
      var row = el("article", "source-row");
      row.appendChild(el("span", "", item.group));
      var copy = document.createElement("div");
      copy.appendChild(el("strong", "", item.title));
      copy.appendChild(el("p", "", item.note));
      row.appendChild(copy);
      row.appendChild(external(item.url, "Forrás "));
      root.appendChild(row);
    });
  }

  function initReportTabs() {
    var buttons = all("[data-report-tab]");
    if (!buttons.length) return;
    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        var target = button.getAttribute("data-report-tab");
        buttons.forEach(function (other) { other.classList.toggle("active", other === button); });
        all("[data-report-panel]").forEach(function (panel) { panel.hidden = panel.getAttribute("data-report-panel") !== target; });
      });
    });
  }

  initNav();
  initGenomeScene();
  renderVus();
  renderClinical();
  renderMedications();
  renderLifestyle();
  renderReports();
  renderSources();
  initReportTabs();
  initReveal();
  initTilt();
  refreshIcons();
})();
