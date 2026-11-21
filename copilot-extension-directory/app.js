(() => {
  const entries = window.RESOURCE_ENTRIES;
  const labels = { mcp: "MCP 服务", skill: "Skill", agent: "Agent", canvas: "Canvas 扩展" };
  const grid = document.getElementById("resourceGrid");
  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const summary = document.getElementById("resultSummary");
  const emptyState = document.getElementById("emptyState");
  const dialog = document.getElementById("detailDialog");
  const detailContent = document.getElementById("detailContent");
  let activeCategory = "all";
  let query = "";

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function setCounts() {
    document.getElementById("allCount").textContent = entries.length;
    for (const category of Object.keys(labels)) {
      document.getElementById(`${category}Count`).textContent =
        entries.filter((entry) => entry.category === category).length;
    }
  }

  function getVisibleEntries() {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    const result = entries.filter((entry) => {
      if (activeCategory !== "all" && entry.category !== activeCategory) return false;
      if (!needle) return true;
      const searchable = [
        entry.name, entry.publisher, entry.summary, entry.description,
        ...entry.tags, labels[entry.category]
      ].join(" ").toLocaleLowerCase("zh-CN");
      return searchable.includes(needle);
    });

    if (sortSelect.value === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    } else if (sortSelect.value === "category") {
      result.sort((a, b) => labels[a.category].localeCompare(labels[b.category], "zh-CN") || a.name.localeCompare(b.name, "zh-CN"));
    } else {
      result.sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "zh-CN"));
    }
    return result;
  }

  function cardMarkup(entry, index) {
    const tags = entry.tags.slice(0, 3).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    const demoBadge = entry.demo ? '<span class="demo-badge">演示 / 待核验</span>' : "";
    return `
      <article class="resource-card" style="--card-index:${index}">
        <div class="card-topline">
          <div class="resource-icon ${escapeHtml(entry.accent)}">${escapeHtml(entry.icon)}</div>
          <span class="type-badge ${escapeHtml(entry.category)}">${escapeHtml(labels[entry.category])}</span>
        </div>
        <div class="card-title-row"><h3>${escapeHtml(entry.name)}</h3>${demoBadge}</div>
        <p class="publisher">${escapeHtml(entry.publisher)}</p>
        <p class="card-summary">${escapeHtml(entry.summary)}</p>
        <div class="tag-list">${tags}</div>
        <div class="card-bottom">
          <span class="source-status"><span class="${entry.demo ? "status-dot demo-dot" : "status-dot"}"></span>${entry.demo ? "演示条目" : "来源已核验"}</span>
          <button class="detail-button" type="button" data-open="${escapeHtml(entry.id)}">查看详情 <span aria-hidden="true">↗</span></button>
        </div>
      </article>`;
  }

  function render() {
    const visible = getVisibleEntries();
    grid.innerHTML = visible.map(cardMarkup).join("");
    emptyState.hidden = visible.length > 0;
    grid.hidden = visible.length === 0;
    summary.textContent = query || activeCategory !== "all"
      ? `找到 ${visible.length} 项资源`
      : `共 ${visible.length} 项资源`;
    document.getElementById("clearFilters").hidden = !query && activeCategory === "all";
    grid.querySelectorAll("[data-open]").forEach((button) => {
      button.addEventListener("click", () => openDetail(button.dataset.open));
    });
  }

  function openDetail(id) {
    const entry = entries.find((item) => item.id === id);
    if (!entry) return;
    const sourceMarkup = entry.sourceUrl
      ? `<a class="source-link" href="${escapeHtml(entry.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(entry.sourceLabel)} <span aria-hidden="true">↗</span></a>`
      : `<span class="source-link unavailable">${escapeHtml(entry.sourceLabel)}</span>`;
    const tags = entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
    detailContent.innerHTML = `
      <div class="detail-cover ${escapeHtml(entry.accent)}">
        <span class="detail-icon">${escapeHtml(entry.icon)}</span>
        <span class="type-badge ${escapeHtml(entry.category)}">${escapeHtml(labels[entry.category])}</span>
        ${entry.demo ? '<span class="demo-badge">演示 / 待核验</span>' : ""}
      </div>
      <div class="detail-body">
        <p class="detail-publisher">${escapeHtml(entry.publisher)}</p>
        <h2 id="detailTitle">${escapeHtml(entry.name)}</h2>
        <p class="detail-summary">${escapeHtml(entry.summary)}</p>
        <div class="tag-list detail-tags">${tags}</div>
        <div class="detail-section"><h3>关于这个资源</h3><p>${escapeHtml(entry.description)}</p></div>
        <div class="detail-section"><h3>来源</h3>${sourceMarkup}</div>
        <div class="detail-section"><h3>安装指引</h3><p>${escapeHtml(entry.install)}</p></div>
        <div class="detail-facts">
          <section><h3><span class="fact-icon">◷</span> 维护状态</h3><p>${escapeHtml(entry.maintenance)}</p></section>
          <section class="${entry.demo ? "risk-demo" : ""}"><h3><span class="fact-icon">!</span> 信任与风险提示</h3><p>${escapeHtml(entry.risk)}</p></section>
        </div>
      </div>`;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  document.getElementById("categoryFilters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    document.querySelectorAll(".category-button").forEach((item) => {
      const selected = item === button;
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    render();
  });

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    render();
  });
  sortSelect.addEventListener("change", render);

  function clearFilters() {
    activeCategory = "all";
    query = "";
    searchInput.value = "";
    document.querySelectorAll(".category-button").forEach((item) => {
      const selected = item.dataset.category === "all";
      item.classList.toggle("selected", selected);
      item.setAttribute("aria-pressed", String(selected));
    });
    render();
  }

  document.getElementById("clearFilters").addEventListener("click", clearFilters);
  document.getElementById("emptyReset").addEventListener("click", clearFilters);
  function closeDialog() {
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  document.getElementById("dialogClose").addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      searchInput.focus();
    }
    if (event.key === "Escape" && dialog.hasAttribute("open")) closeDialog();
  });

  setCounts();
  render();
})();
