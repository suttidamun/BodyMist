/* ==========================================================================
   Body Scent — script.js
   ไฟล์เดียวใช้ร่วมกันทุกหน้า (ตรวจจาก id ของ element ว่าอยู่หน้าไหน)
   - product.html : #filter-bar, #product-list
   - order.html   : #orderForm, #customerName, #contact, #items, #total, #note
   - admin.html   : #ordersTable tbody
   ========================================================================== */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbx9_t7JEXSME9797dztIEP2LVU_cvH1mnpab2CohYRFH7KdB-6bo1_6P_dBQlfLBm8PuA/exec";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQVarGWYGD33KO0hc43N27ZaGZjNecGqfqnjUG0_1dCudszjps2X3h3na9QEqLMxHfty9lqgIC8HN0g/pub?gid=0&single=true&output=csv";

// ถ้าแถวแรกของ Sheet เป็นข้อมูลออเดอร์เลย (ไม่มีหัวคอลัมน์) ให้เปลี่ยนเป็น false
const CSV_HAS_HEADER = true;

const MOODS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "fresh", label: "Fresh" },
  { key: "sweet", label: "Sweet" },
  { key: "confident", label: "Confident" },
  { key: "romance", label: "Romance" },
];

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("product-list")) initProductPage();
  if (document.getElementById("orderForm")) initOrderPage();
  if (document.getElementById("ordersTable")) initAdminPage();
});

/* --------------------------------------------------------------------------
   1. product.html — โหลด products.json แสดงเป็นการ์ด + ปุ่มกรอง mood
   -------------------------------------------------------------------------- */
async function initProductPage() {
  const list = document.getElementById("product-list");
  const bar = document.getElementById("filter-bar");

  list.classList.add("grid", "grid--4");

  let products = [];
  try {
    const res = await fetch("products.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    products = await res.json();
  } catch (error) {
    console.error(error);
    list.textContent = "โหลดข้อมูลสินค้าไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง";
    return;
  }

  // อ่าน ?mood=xxx ถ้าไม่ตรงกับ mood ที่มี ให้ใช้ "ทั้งหมด"
  const param = (new URLSearchParams(window.location.search).get("mood") || "all").toLowerCase();
  let current = MOODS.some((m) => m.key === param) ? param : "all";

  function render() {
    const shown = current === "all" ? products : products.filter((p) => p.mood === current);

    list.textContent = "";
    if (shown.length === 0) {
      list.textContent = "ยังไม่มีสินค้าในหมวดนี้";
      return;
    }
    shown.forEach((p) => list.appendChild(createProductCard(p)));
  }

  function renderFilterBar() {
    if (!bar) return;
    bar.textContent = "";
    MOODS.forEach((m) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.mood = m.key;
      btn.className = "btn " + (m.key === current ? "" : "btn--outline");
      btn.textContent = m.label;
      btn.addEventListener("click", () => {
        current = m.key;
        updateUrl();
        renderFilterBar();
        render();
      });
      bar.appendChild(btn);
    });
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    if (current === "all") url.searchParams.delete("mood");
    else url.searchParams.set("mood", current);
    window.history.replaceState(null, "", url);
  }

  renderFilterBar();
  render();
}

function createProductCard(p) {
  const card = document.createElement("article");
  card.className = "card mood-" + p.mood;

  const img = document.createElement("img");
  img.className = "card__image";
  img.src = p.image;
  img.alt = p.name + (p.size ? " " + p.size : "");
  img.loading = "lazy";

  const body = document.createElement("div");
  body.className = "card__body";

  const title = document.createElement("h3");
  title.className = "card__title mood-title";
  title.textContent = p.name;

  const meta = document.createElement("p");
  meta.className = "small mb-0";
  meta.textContent = p.size || "";

  const desc = document.createElement("p");
  desc.className = "card__text";
  desc.textContent = p.description;

  const price = document.createElement("p");
  price.className = "card__price";
  price.textContent = Number(p.price).toLocaleString("th-TH") + " บาท";

  // ชื่อสินค้าที่ส่งไปหน้า order = ชื่อ + ไซส์ (ถ้ามี)
  const itemName = [p.name, p.size].filter(Boolean).join(" ");
  const link = document.createElement("a");
  link.className = "btn btn--block";
  link.href = "order.html?" + new URLSearchParams({ item: itemName, price: p.price }).toString();
  link.textContent = "สั่งซื้อ";

  body.append(title, meta, desc, price, link);
  card.append(img, body);
  return card;
}

/* --------------------------------------------------------------------------
   2. order.html — เติม item/price จาก URL แล้วส่งข้อมูลไป Apps Script
   -------------------------------------------------------------------------- */
function initOrderPage() {
  const form = document.getElementById("orderForm");
  const params = new URLSearchParams(window.location.search);

  // เติมทั้งสองช่องทันทีที่โหลดหน้า (ช่อง total ต้องเติมเสมอ)
  const itemsInput = document.getElementById("items");
  const totalInput = document.getElementById("total");
  if (itemsInput) itemsInput.value = params.get("item") || "";
  if (totalInput) totalInput.value = params.get("price") || "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const payload = {
      customerName: document.getElementById("customerName").value,
      contact: document.getElementById("contact").value,
      items: document.getElementById("items").value,
      total: document.getElementById("total").value,
      note: document.getElementById("note").value,
    };

    fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(() => {
        window.location.href = "thankyou.html";
      })
      .catch((error) => {
        console.error(error);
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
      });
  });
}

/* --------------------------------------------------------------------------
   3. admin.html — ดึง CSV มาแสดงเป็นตาราง (ล่าสุดขึ้นก่อน)
   -------------------------------------------------------------------------- */
async function initAdminPage() {
  const tbody = document.querySelector("#ordersTable tbody");
  if (!tbody) return;

  showRow(tbody, "กำลังโหลดข้อมูล...");

  let rows;
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    rows = parseCSV(await res.text());
  } catch (error) {
    console.error(error);
    showRow(tbody, "โหลดข้อมูลออเดอร์ไม่สำเร็จ กรุณารีเฟรชหน้านี้อีกครั้ง");
    return;
  }

  // ตัดแถวว่าง และหัวคอลัมน์ (ถ้ามี) แล้วกลับลำดับให้ล่าสุดขึ้นก่อน
  rows = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (CSV_HAS_HEADER) rows = rows.slice(1);
  rows.reverse();

  if (rows.length === 0) {
    showRow(tbody, "ยังไม่มีออเดอร์");
    return;
  }

  tbody.textContent = "";
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    for (let i = 0; i < 6; i++) {
      const td = document.createElement("td");
      td.textContent = r[i] || ""; // ใช้ textContent กัน HTML แปลกปลอมจากข้อมูลที่ลูกค้ากรอก
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
}

function showRow(tbody, message) {
  tbody.textContent = "";
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = 6;
  td.textContent = message;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

// parse CSV เอง (รองรับเครื่องหมายคำพูด, comma และขึ้นบรรทัดใหม่ในช่อง, "" แทน ")
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
