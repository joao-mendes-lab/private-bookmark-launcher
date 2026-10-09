// Private Bookmark Launcher — popup logic
// Reads the live Firefox bookmark tree, lets the user pick any combination
// of bookmarks (across folders), and opens them all as tabs in the current
// window (normal or private — whichever the extension is running in).

const treeEl = document.getElementById("tree");
const counterEl = document.getElementById("counter");
const openBtn = document.getElementById("open-btn");
const clearBtn = document.getElementById("clear-btn");
const searchInput = document.getElementById("search");
const clearSearchBtn = document.getElementById("clear-search");
const expandAllBtn = document.getElementById("expand-all");
const collapseAllBtn = document.getElementById("collapse-all");
const statusEl = document.getElementById("status");

// Selection is a set of bookmark node ids. It lives in memory for the
// lifetime of this tab, so navigating/expanding folders never drops it.
const selected = new Set();

// Maps populated while rendering the tree view.
const nodeMap = new Map();     // id -> bookmark node
const parentMap = new Map();    // id -> parent id
const checkboxMap = new Map(); // id -> checkbox element (tree view)

let treeRoots = []; // top-level nodes returned by browser.bookmarks.getTree()

function isBookmark(node) { return !!node.url; }
function isFolder(node) { return !node.url; }

function setStatus(msg, kind) {
  statusEl.textContent = msg || "";
  statusEl.className = "status" + (kind ? " " + kind : "");
}

function clearStatus() {
  statusEl.textContent = "";
  statusEl.className = "status";
}

// ---------- Tree indexing ----------

function indexTree(node, parentId) {
  nodeMap.set(node.id, node);
  parentMap.set(node.id, parentId);
  if (node.children) {
    for (const child of node.children) indexTree(child, node.id);
  }
}

function descendantBookmarkIds(node) {
  const out = [];
  (function walk(n) {
    if (isBookmark(n)) { out.push(n.id); return; }
    if (n.children) for (const c of n.children) walk(c);
  })(node);
  return out;
}

function folderPath(node) {
  const parts = [];
  let pid = parentMap.get(node.id);
  while (pid) {
    const p = nodeMap.get(pid);
    if (!p) break;
    parts.unshift(p.title || "Folder");
    pid = parentMap.get(p.id);
  }
  return parts.join(" › ");
}

// ---------- Selection logic ----------

function toggleBookmark(node, checked) {
  if (checked) selected.add(node.id);
  else selected.delete(node.id);
  updateAncestorCheckboxes(node);
}

function setFolderSelection(node, checked) {
  for (const id of descendantBookmarkIds(node)) {
    if (checked) selected.add(id);
    else selected.delete(id);
  }
  updateSubtreeCheckboxes(node);
  updateAncestorCheckboxes(node);
}

function folderState(node) {
  const desc = descendantBookmarkIds(node);
  if (desc.length === 0) return { checked: false, indeterminate: false };
  const count = desc.reduce((n, id) => n + (selected.has(id) ? 1 : 0), 0);
  return {
    checked: count === desc.length,
    indeterminate: count > 0 && count < desc.length,
  };
}

function applyFolderState(node) {
  const cb = checkboxMap.get(node.id);
  if (!cb || isBookmark(node)) return;
  const s = folderState(node);
  cb.checked = s.checked;
  cb.indeterminate = s.indeterminate;
}

function updateSubtreeCheckboxes(node) {
  if (isBookmark(node)) {
    const cb = checkboxMap.get(node.id);
    if (cb) cb.checked = selected.has(node.id);
  } else {
    applyFolderState(node);
  }
  if (node.children) for (const c of node.children) updateSubtreeCheckboxes(c);
}

function updateAncestorCheckboxes(node) {
  let pid = parentMap.get(node.id);
  while (pid) {
    const parent = nodeMap.get(pid);
    if (!parent) break;
    applyFolderState(parent);
    pid = parentMap.get(parent.id);
  }
}

function updateCounter() {
  const n = selected.size;
  counterEl.textContent = n + (n === 1 ? " bookmark selected" : " bookmarks selected");
  openBtn.disabled = n === 0;
}

// ---------- URL validation ----------

function isOpenable(url) {
  return /^https?:\/\//i.test(url);
}

// ---------- Rendering: tree view ----------

function createRow(node, level) {
  const row = document.createElement("div");
  row.className = "row " + (isBookmark(node) ? "bookmark" : "folder");
  row.style.paddingLeft = (level * 18 + 8) + "px";

  const cb = document.createElement("input");
  cb.type = "checkbox";
  checkboxMap.set(node.id, cb);

  if (isBookmark(node)) {
    if (!isOpenable(node.url)) {
      cb.disabled = true;
      row.classList.add("disabled");
      row.title = "Cannot open this bookmark — unsupported protocol: " + node.url;
    } else {
      cb.addEventListener("change", () => {
        toggleBookmark(node, cb.checked);
        updateCounter();
      });
    }
  } else {
    cb.addEventListener("change", () => {
      setFolderSelection(node, cb.checked);
      updateCounter();
    });
  }
  row.appendChild(cb);

  if (isFolder(node)) {
    const hasChildren = node.children && node.children.length > 0;
    const toggle = document.createElement("span");
    toggle.className = "toggle" + (hasChildren ? "" : " no-children");
    toggle.textContent = "▼";
    toggle.addEventListener("click", () => {
      const next = row.nextElementSibling;
      if (next && next.classList.contains("children")) {
        next.classList.toggle("hidden");
        toggle.classList.toggle("collapsed");
      }
    });
    row.appendChild(toggle);

    const icon = document.createElement("span");
    icon.className = "icon folder-icon";
    icon.textContent = "📁";
    row.appendChild(icon);
  } else {
    const icon = document.createElement("span");
    icon.className = "icon bookmark-icon";
    row.appendChild(icon);
  }

  const label = document.createElement("span");
  label.className = "label";
  label.textContent = node.title || node.url || "(untitled)";
  row.appendChild(label);

  if (isBookmark(node) && isOpenable(node.url)) {
    const url = document.createElement("span");
    url.className = "url";
    url.textContent = node.url;
    row.appendChild(url);
  } else if (isBookmark(node)) {
    const url = document.createElement("span");
    url.className = "url";
    url.textContent = node.url;
    row.appendChild(url);
  }

  return row;
}

function renderNode(node, container, level) {
  const row = createRow(node, level);
  container.appendChild(row);

  if (isFolder(node) && node.children && node.children.length) {
    const childContainer = document.createElement("div");
    childContainer.className = "children";
    for (const child of node.children) renderNode(child, childContainer, level + 1);
    container.appendChild(childContainer);
  }
}

function renderTree() {
  treeEl.innerHTML = "";
  checkboxMap.clear();

  if (!treeRoots.length) {
    treeEl.innerHTML = '<div class="empty">No bookmarks found.</div>';
    return;
  }

  // treeRoots is usually a single root node containing the real top-level
  // folders (Bookmarks Menu, Bookmarks Toolbar, Other Bookmarks). Render its
  // children at level 0; if there's no wrapper, render the roots directly.
  const topLevel = treeRoots.length === 1 && treeRoots[0].children
    ? treeRoots[0].children
    : treeRoots;

  if (!topLevel.length) {
    treeEl.innerHTML = '<div class="empty">No bookmarks found.</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const node of topLevel) renderNode(node, frag, 0);
  treeEl.appendChild(frag);

  // Reflect current selection into the freshly built checkboxes.
  for (const node of nodeMap.values()) {
    if (isBookmark(node)) {
      const cb = checkboxMap.get(node.id);
      if (cb) cb.checked = selected.has(node.id);
    } else {
      applyFolderState(node);
    }
  }
}

// ---------- Rendering: search view ----------

function renderSearch(query) {
  treeEl.innerHTML = "";
  checkboxMap.clear();
  const q = query.trim().toLowerCase();
  if (!q) { renderTree(); return; }

  const matches = [];
  for (const node of nodeMap.values()) {
    if (!isBookmark(node)) continue;
    const title = (node.title || "").toLowerCase();
    const url = (node.url || "").toLowerCase();
    if (title.includes(q) || url.includes(q)) matches.push(node);
  }

  if (!matches.length) {
    treeEl.innerHTML = '<div class="empty">No bookmarks match "' + escapeHtml(query) + '".</div>';
    return;
  }

  const frag = document.createDocumentFragment();
  for (const node of matches) {
    const row = document.createElement("div");
    row.className = "row bookmark";
    row.style.paddingLeft = "10px";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    checkboxMap.set(node.id, cb);
    if (!isOpenable(node.url)) {
      cb.disabled = true;
      row.classList.add("disabled");
      row.title = "Cannot open this bookmark — unsupported protocol: " + node.url;
    } else {
      cb.checked = selected.has(node.id);
      cb.addEventListener("change", () => {
        toggleBookmark(node, cb.checked);
        updateCounter();
      });
    }
    row.appendChild(cb);

    const icon = document.createElement("span");
    icon.className = "icon bookmark-icon";
    row.appendChild(icon);

    const label = document.createElement("span");
    label.className = "label";
    label.textContent = node.title || node.url || "(untitled)";
    row.appendChild(label);

    const url = document.createElement("span");
    url.className = "url";
    url.textContent = node.url;
    row.appendChild(url);

    const crumb = document.createElement("span");
    crumb.className = "breadcrumb";
    crumb.textContent = folderPath(node);
    row.appendChild(crumb);

    frag.appendChild(row);
  }
  treeEl.appendChild(frag);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

// ---------- Expand / collapse all ----------

function setAllChildren(hidden) {
  for (const el of treeEl.querySelectorAll(".children")) {
    el.classList.toggle("hidden", hidden);
  }
  for (const t of treeEl.querySelectorAll(".toggle")) {
    t.classList.toggle("collapsed", hidden);
  }
}

// ---------- Open in current window ----------

function selectedUrlsInTreeOrder() {
  const urls = [];
  (function walk(node) {
    if (isBookmark(node)) {
      if (selected.has(node.id) && isOpenable(node.url)) urls.push(node.url);
      return;
    }
    if (node.children) for (const c of node.children) walk(c);
  })(treeRoots[0] || { children: treeRoots });
  return urls;
}

async function openSelectedInCurrentWindow() {
  clearStatus();
  const urls = selectedUrlsInTreeOrder();
  if (!urls.length) {
    setStatus("No openable bookmarks are selected. Non-http(s) bookmarks are skipped.", "error");
    return;
  }

  openBtn.disabled = true;
  setStatus("Opening " + urls.length + " tab" + (urls.length === 1 ? "" : "s") + " in this window…", "success");

  try {
    // Identify the window the extension page is currently running in, then
    // create one new tab per selected URL inside that same window. This works
    // whether the window is normal or private — we never create a new window.
    const currentTab = await browser.tabs.getCurrent();
    const windowId = currentTab.windowId;

    for (const url of urls) {
      try {
        await browser.tabs.create({ windowId, url, active: false });
      } catch (tabErr) {
        console.error("Failed to open tab:", url, tabErr);
      }
    }

    setStatus("Opened " + urls.length + " tab" + (urls.length === 1 ? "" : "s") + " in this window.", "success");
  } catch (err) {
    setStatus("Could not open tabs in the current window: " + err.message, "error");
  }

  openBtn.disabled = false;
}

// ---------- Event wiring ----------

clearBtn.addEventListener("click", () => {
  selected.clear();
  for (const node of nodeMap.values()) {
    if (isBookmark(node)) {
      const cb = checkboxMap.get(node.id);
      if (cb) cb.checked = false;
    } else {
      applyFolderState(node);
    }
  }
  updateCounter();
  clearStatus();
});

openBtn.addEventListener("click", openSelectedInCurrentWindow);

let searchTimer = null;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const q = searchInput.value;
    if (q.trim()) renderSearch(q);
    else renderTree();
  }, 120);
});

clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  renderTree();
  searchInput.focus();
});

expandAllBtn.addEventListener("click", () => setAllChildren(false));
collapseAllBtn.addEventListener("click", () => setAllChildren(true));

// ---------- Init ----------

async function init() {
  try {
    treeRoots = await browser.bookmarks.getTree();
  } catch (err) {
    treeEl.innerHTML = '<div class="empty">Could not read bookmarks: ' + escapeHtml(err.message) + '</div>';
    setStatus("Permission to read bookmarks was denied or unavailable.", "error");
    return;
  }

  // Index the whole tree for parent/path lookups.
  for (const root of treeRoots) indexTree(root, null);

  renderTree();
  updateCounter();
}

init();
