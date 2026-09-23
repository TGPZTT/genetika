(function () {
  "use strict";

  var data = window.HELIX_DATA;
  if (!data) {
    return;
  }

  function one(selector, root) {
    return (root || document).querySelector(selector);
  }

  function all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (text !== undefined && text !== null) {
      element.textContent = text;
    }
    return element;
  }

  function icon(name) {
    var element = document.createElement("i");
    element.setAttribute("data-lucide", name);
    element.setAttribute("aria-hidden", "true");
    return element;
  }

  function externalLink(url, label, className) {
    var link = node("a", className || "source-icon-link");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.appendChild(icon("external-link"));
    link.appendChild(document.createTextNode(label));
    return link;
  }

  function normalise(value) {
    return String(value || "")
      .toLocaleLowerCase("hu-HU")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function statusLabel(status) {
    var labels = {
      high: "Kiemelten fontos",
      watch: "Figyelendő",
      normal: "Szokásos válasz",
      context: "Kontextusfüggő",
      unresolved: "Nincs értékelve",
      confirm: "Megerősítendő",
      review: "Bizonytalan / áttekintendő",
      benign: "Jóindulatú jellegű"
    };
    return labels[status] || status;
  }

  function initNavigation() {
    var toggle = one("[data-nav-toggle]");
    var sidebar = one("#oldalsav");
    if (!toggle || !sidebar) {
      return;
    }
    toggle.addEventListener("click", function () {
      var isOpen = sidebar.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      toggle.setAttribute("aria-label", isOpen ? "Navigáció bezárása" : "Navigáció megnyitása");
      var use = toggle.querySelector("svg");
      if (use && window.lucide) {
        toggle.innerHTML = "";
        toggle.appendChild(icon(isOpen ? "x" : "menu"));
        window.lucide.createIcons();
      }
    });
    all(".nav-link", sidebar).forEach(function (link) {
      link.addEventListener("click", function () {
        sidebar.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function renderConstellation() {
    var root = one("[data-report-constellation]");
    if (!root) {
      return;
    }
    var items = [];
    data.clinicalReports.forEach(function (report) {
      items.push({
        type: report.statusType,
        label: report.title + " - " + report.status
      });
    });
    for (var index = 0; index < 4; index += 1) {
      items.push({
        type: "main",
        label: ["Gyógyszerválasz", "Táplálkozási genetika", "Alvás és kronotípus", "Sport és teljesítmény"][index]
      });
    }
    items.forEach(function (item, index) {
      var cell = node("span", "report-cell " + item.type);
      cell.title = item.label;
      cell.setAttribute("aria-label", item.label);
      cell.style.setProperty("--cell-delay", String(Math.min(index, 55) * 12) + "ms");
      root.appendChild(cell);
    });
  }

  function renderFocusList() {
    var root = one("[data-focus-list]");
    if (!root) {
      return;
    }
    data.focusItems.forEach(function (item, index) {
      var article = node("article", "action-card level-" + item.level);
      article.id = item.id;

      var status = node("div", "action-status");
      status.appendChild(node("span", "", "Prioritás " + String(index + 1).padStart(2, "0")));
      status.appendChild(node("strong", "", item.level === "high" ? "Magas gyakorlati jelentőség" : statusLabel(item.level)));
      article.appendChild(status);

      var content = node("div", "action-content");
      content.appendChild(node("div", "kicker", item.eyebrow));
      content.appendChild(node("h2", "", item.title));
      content.appendChild(node("div", "gene-line", item.gene));
      content.appendChild(node("p", "action-summary", item.summary));

      var details = document.createElement("details");
      var summary = document.createElement("summary");
      summary.appendChild(icon("scan-search"));
      summary.appendChild(document.createTextNode("Részletes jelentés és teendők"));
      details.appendChild(summary);

      var detailGrid = node("div", "action-detail-grid");
      var meaning = node("div");
      meaning.appendChild(node("h3", "", "Klinikai jelentőség"));
      meaning.appendChild(node("p", "", item.meaning));
      detailGrid.appendChild(meaning);

      var actions = node("div");
      actions.appendChild(node("h3", "", "Javasolt lépések"));
      var list = document.createElement("ul");
      item.actions.forEach(function (action) {
        list.appendChild(node("li", "", action));
      });
      actions.appendChild(list);
      detailGrid.appendChild(actions);

      var urgent = node("div", "urgent-box");
      urgent.appendChild(node("strong", "", "Sürgősségi jelzések: "));
      urgent.appendChild(document.createTextNode(item.urgent));
      detailGrid.appendChild(urgent);
      detailGrid.appendChild(externalLink(item.sourceUrl, "Szakmai forrás megnyitása", "action-source"));

      details.appendChild(detailGrid);
      content.appendChild(details);
      article.appendChild(content);
      root.appendChild(article);
    });
  }

  function renderFeaturedVariants() {
    var root = one("[data-featured-variants]");
    if (!root) {
      return;
    }
    ["f5", "gilbert", "c8b", "lama3"].forEach(function (id) {
      var item = data.focusItems.find(function (entry) {
        return entry.id === id;
      });
      if (!item) {
        return;
      }
      var article = node("article", "variant-feature " + (item.level === "high" ? "high" : "confirm"));
      article.id = id;
      article.appendChild(node("span", "", item.eyebrow));
      article.appendChild(node("h2", "", item.title.split(" - ")[0]));
      article.appendChild(node("code", "", item.gene));
      article.appendChild(node("p", "", item.summary));
      article.appendChild(externalLink(item.sourceUrl, "Klinikai forrás"));
      root.appendChild(article);
    });
  }

  function renderVariantTable() {
    var body = one("[data-variant-table]");
    if (!body) {
      return;
    }
    var search = one("[data-variant-search]");
    var filter = one("[data-variant-filter]");

    function draw() {
      body.innerHTML = "";
      var query = normalise(search.value);
      var wanted = filter.value;
      var items = data.variantAudit.filter(function (item) {
        var haystack = normalise([item.gene, item.rsid, item.variant, item.classification, item.bodyEffect, item.personalMeaning, item.action].join(" "));
        return (!query || haystack.indexOf(query) !== -1) && (!wanted || item.status === wanted);
      });
      if (!items.length) {
        var emptyRow = document.createElement("tr");
        var emptyCell = node("td", "empty-state", "Nincs a szűrésnek megfelelő variáns.");
        emptyCell.colSpan = 5;
        emptyRow.appendChild(emptyCell);
        body.appendChild(emptyRow);
        return;
      }
      items.forEach(function (item) {
        var row = document.createElement("tr");

        var nameCell = node("td", "variant-name");
        nameCell.appendChild(node("strong", "", item.gene + " " + item.rsid));
        nameCell.appendChild(node("code", "", item.variant));
        nameCell.appendChild(node("span", "variant-classification", item.classification));
        nameCell.appendChild(node("span", "status-badge " + item.status, statusLabel(item.status)));
        row.appendChild(nameCell);
        row.appendChild(node("td", "", item.bodyEffect));
        row.appendChild(node("td", "", item.personalMeaning));
        row.appendChild(node("td", "", item.action));

        var sourceCell = document.createElement("td");
        sourceCell.appendChild(externalLink(item.sourceUrl, "ClinVar"));
        row.appendChild(sourceCell);
        body.appendChild(row);
      });
    }

    search.addEventListener("input", draw);
    filter.addEventListener("change", draw);
    draw();
  }

  function createMedicationCard(item) {
    var article = node("article", "med-card " + item.priority);
    article.id = item.id;

    var head = node("div", "med-card-head");
    var headCopy = node("div");
    headCopy.appendChild(node("h2", "", item.title));
    headCopy.appendChild(node("div", "med-code", item.gene + " · " + item.variant));
    head.appendChild(headCopy);
    head.appendChild(node("span", "status-badge " + item.priority, statusLabel(item.priority)));
    article.appendChild(head);

    var result = node("div", "med-result");
    result.appendChild(node("strong", "", item.result + ". "));
    result.appendChild(document.createTextNode(item.meaning));
    article.appendChild(result);

    var details = document.createElement("details");
    var summary = document.createElement("summary");
    summary.appendChild(document.createTextNode("Készítménypéldák és teendő"));
    summary.appendChild(icon("chevron-down"));
    details.appendChild(summary);

    var detail = node("div", "med-details");
    var exampleBlock = node("div");
    exampleBlock.appendChild(node("h3", "", "Hatóanyag és készítménypélda"));
    var exampleList = document.createElement("ul");
    item.examples.forEach(function (example) {
      exampleList.appendChild(node("li", "", example));
    });
    exampleBlock.appendChild(exampleList);
    detail.appendChild(exampleBlock);

    var actionBlock = node("div");
    actionBlock.appendChild(node("h3", "", "Mikor fontos?"));
    actionBlock.appendChild(node("p", "", item.action));
    detail.appendChild(actionBlock);

    var warning = node("div", "med-warning");
    warning.appendChild(node("strong", "", "Figyelmeztetés: "));
    warning.appendChild(document.createTextNode(item.warning));
    detail.appendChild(warning);
    detail.appendChild(externalLink(item.sourceUrl, "Irányelv vagy szakmai forrás"));

    details.appendChild(detail);
    article.appendChild(details);
    return article;
  }

  function renderMedicationGrid() {
    var root = one("[data-medication-grid]");
    if (!root) {
      return;
    }
    var search = one("[data-med-search]");
    var filter = one("[data-med-filter]");
    var entries = data.medications.concat(data.notAssessedMedications);

    function draw() {
      root.innerHTML = "";
      var query = normalise(search.value);
      var wanted = filter.value;
      var items = entries.filter(function (item) {
        var haystack = normalise([
          item.title, item.gene, item.variant, item.result, item.meaning,
          item.examples.join(" "), item.action, item.warning
        ].join(" "));
        return (!query || haystack.indexOf(query) !== -1) && (!wanted || item.priority === wanted);
      });
      if (!items.length) {
        root.appendChild(node("div", "empty-state", "Nincs a szűrésnek megfelelő gyógyszeres eredmény."));
        return;
      }
      items.forEach(function (item) {
        root.appendChild(createMedicationCard(item));
      });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }

    search.addEventListener("input", draw);
    filter.addEventListener("change", draw);
    draw();
  }

  function renderLifestyle() {
    var root = one("[data-lifestyle-grid]");
    if (!root) {
      return;
    }
    var buttons = all("[data-life-tab]");
    var active = "Táplálkozás";

    function draw() {
      root.innerHTML = "";
      data.lifestyle
        .filter(function (item) {
          return item.group === active;
        })
        .forEach(function (item) {
          var article = node("article", "life-card");
          article.appendChild(node("code", "", item.gene));
          article.appendChild(node("h2", "", item.title));
          article.appendChild(node("div", "life-result", item.result));
          article.appendChild(node("p", "", item.meaning));
          article.appendChild(node("p", "life-action", "Gyakorlati ötlet: " + item.action));
          root.appendChild(article);
        });
    }

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        active = button.getAttribute("data-life-tab");
        buttons.forEach(function (candidate) {
          var selected = candidate === button;
          candidate.classList.toggle("active", selected);
          candidate.setAttribute("aria-selected", selected ? "true" : "false");
        });
        draw();
      });
    });
    draw();
  }

  function createVcfCard(item) {
    var article = node("article", "vcf-card " + item.status);
    article.id = item.id;
    var head = node("div", "vcf-card-head");
    var title = node("div");
    title.appendChild(node("span", "vcf-gene", item.gene));
    title.appendChild(node("code", "", item.variant));
    head.appendChild(title);
    head.appendChild(node("span", "status-badge " + item.status, statusLabel(item.status)));
    article.appendChild(head);
    article.appendChild(node("h2", "", item.classification));
    article.appendChild(node("div", "vcf-quality", item.quality));

    var meaning = node("div", "vcf-meaning");
    meaning.appendChild(node("h3", "", "Klinikai jelentőség"));
    meaning.appendChild(node("p", "", item.meaning));
    article.appendChild(meaning);

    if (item.notMeaning) {
      var notMeaning = node("div", "vcf-not-meaning");
      notMeaning.appendChild(icon("info"));
      var notCopy = node("div");
      notCopy.appendChild(node("strong", "", "Értelmezési korlát"));
      notCopy.appendChild(node("p", "", item.notMeaning));
      notMeaning.appendChild(notCopy);
      article.appendChild(notMeaning);
    }

    var foot = node("div", "vcf-card-foot");
    foot.appendChild(node("p", "", item.action));
    foot.appendChild(externalLink(item.sourceUrl, "ClinVar / szakmai forrás"));
    article.appendChild(foot);
    return article;
  }

  function renderVcfFindings() {
    var root = one("[data-vcf-findings]");
    if (!root || !data.vcf) {
      return;
    }
    var search = one("[data-vcf-search]");
    var filter = one("[data-vcf-filter]");
    function draw() {
      root.innerHTML = "";
      var query = normalise(search.value);
      var wanted = filter.value;
      var items = data.vcf.keyFindings.filter(function (item) {
        var haystack = normalise([item.gene, item.variant, item.classification, item.meaning, item.notMeaning, item.action].join(" "));
        return (!query || haystack.indexOf(query) !== -1) && (!wanted || item.status === wanted);
      });
      if (!items.length) {
        root.appendChild(node("div", "empty-state", "Nincs a szűrésnek megfelelő VCF-találat."));
        return;
      }
      items.forEach(function (item) {
        root.appendChild(createVcfCard(item));
      });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }
    search.addEventListener("input", draw);
    filter.addEventListener("change", draw);
    draw();
  }

  function initReportTools() {
    var copyButton = one("[data-copy-summary]");
    var printButton = one("[data-print-page]");
    if (printButton) {
      printButton.addEventListener("click", function () {
        window.print();
      });
    }
    if (!copyButton) {
      return;
    }
    copyButton.addEventListener("click", function () {
      var source = one("[data-summary-copy-source]");
      var status = one("[data-copy-status]");
      var value = source ? source.innerText.trim() : "";
      function done() {
        if (status) {
          status.textContent = "Az összefoglaló a vágólapra került.";
        }
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(value).then(done);
        return;
      }
      var textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      done();
    });
  }

  function initPageTelemetry() {
    var progress = node("div", "page-progress");
    progress.appendChild(node("span"));
    document.body.appendChild(progress);
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      progress.firstChild.style.transform = "scaleX(" + ratio + ")";
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
  }

  function clinicalItem(report) {
    var badgeClasses = {
      clinical: "confirm",
      known: "known",
      informational: "review",
      negative: "benign"
    };
    var article = node("article", "clinical-item " + report.statusType);
    var title = node("div", "clinical-title");
    title.appendChild(node("strong", "", report.title));
    title.appendChild(node("span", "", report.category));
    if (report.finding) {
      title.appendChild(
        node(
          "div",
          "finding-detail",
          report.finding.gene + " · " + report.finding.variant + " · " + report.finding.zygosity
        )
      );
      var interpretation = node("div", "finding-interpretation");
      interpretation.appendChild(node("strong", "", report.finding.classification));
      interpretation.appendChild(node("span", "", report.finding.meaning));
      title.appendChild(interpretation);
    }
    article.appendChild(title);
    article.appendChild(node("p", "", report.description));

    var actions = node("div", "clinical-actions");
    actions.appendChild(
      node(
        "span",
        "status-badge " + badgeClasses[report.statusType],
        report.status
      )
    );
    var link = node("a", "button small");
    link.href = report.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.appendChild(icon("file-text"));
    link.appendChild(document.createTextNode("PDF"));
    actions.appendChild(link);
    article.appendChild(actions);
    return article;
  }

  function renderClinicalList() {
    var root = one("[data-clinical-list]");
    if (!root) {
      return;
    }
    var search = one("[data-clinical-search]");
    var category = one("[data-clinical-category]");
    var status = one("[data-clinical-status]");

    category.appendChild(new Option("Minden kategória", ""));
    Object.keys(data.categories)
      .sort(function (a, b) {
        return a.localeCompare(b, "hu");
      })
      .forEach(function (name) {
        category.appendChild(new Option(name + " (" + data.categories[name] + ")", name));
      });

    function draw() {
      root.innerHTML = "";
      var query = normalise(search.value);
      var wantedCategory = category.value;
      var wantedStatus = status.value;
      var items = data.clinicalReports.filter(function (report) {
        var haystack = normalise([report.title, report.category, report.description, report.status, report.finding ? report.finding.gene + " " + report.finding.variant + " " + report.finding.meaning : ""].join(" "));
        var matchesStatus = !wantedStatus || wantedStatus === report.statusType;
        return (
          (!query || haystack.indexOf(query) !== -1) &&
          (!wantedCategory || report.category === wantedCategory) &&
          matchesStatus
        );
      });
      if (!items.length) {
        root.appendChild(node("div", "empty-state", "Nincs a szűrésnek megfelelő klinikai riport."));
        return;
      }
      items.forEach(function (report) {
        root.appendChild(clinicalItem(report));
      });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }

    search.addEventListener("input", draw);
    category.addEventListener("change", draw);
    status.addEventListener("change", draw);
    draw();
  }

  function renderReportLibrary() {
    var root = one("[data-report-library]");
    if (!root) {
      return;
    }
    var search = one("[data-report-search]");
    var type = one("[data-report-type]");

    function draw() {
      root.innerHTML = "";
      var query = normalise(search.value);
      var wantedType = type.value;
      var items = data.reports.filter(function (report) {
        var haystack = normalise([report.type, report.category, report.title, report.status].join(" "));
        return (!query || haystack.indexOf(query) !== -1) && (!wantedType || report.type === wantedType);
      });
      if (!items.length) {
        root.appendChild(node("div", "empty-state", "Nincs a szűrésnek megfelelő PDF."));
        return;
      }
      items.forEach(function (report) {
        var row = node("article", "library-item");
        row.appendChild(node("span", "", report.type));
        row.appendChild(node("span", "", report.category));
        var title = node("div");
        title.appendChild(node("strong", "", report.title));
        title.appendChild(node("div", "finding-detail", report.status));
        row.appendChild(title);
        var link = node("a", "button small");
        link.href = report.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.appendChild(icon("download"));
        link.appendChild(document.createTextNode("Megnyitás"));
        row.appendChild(link);
        root.appendChild(row);
      });
      if (window.lucide) {
        window.lucide.createIcons();
      }
    }

    search.addEventListener("input", draw);
    type.addEventListener("change", draw);
    draw();
  }

  function renderSources() {
    var root = one("[data-source-list]");
    if (!root) {
      return;
    }
    data.sources.forEach(function (source) {
      var row = node("article", "source-row");
      row.appendChild(node("span", "", source.group));
      var copy = node("div");
      copy.appendChild(node("strong", "", source.title));
      copy.appendChild(node("p", "", source.note));
      row.appendChild(copy);
      var link = node("a", "button small secondary");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.appendChild(icon("external-link"));
      link.appendChild(document.createTextNode("Forrás"));
      row.appendChild(link);
      root.appendChild(row);
    });
  }

  initNavigation();
  renderConstellation();
  renderFocusList();
  renderFeaturedVariants();
  renderVariantTable();
  renderMedicationGrid();
  renderLifestyle();
  renderVcfFindings();
  renderClinicalList();
  renderReportLibrary();
  renderSources();
  initReportTools();
  initPageTelemetry();

  if (window.lucide) {
    window.lucide.createIcons();
  }
})();
