import express from "express";
import puppeteer from "puppeteer";

const app = express();
const PORT = 3000;
const TARGET_URL = "https://www.eghtesadnews.com/markets/euro";

// Utility to convert Persian to English numberssss
function convertPersianToEnglish(str) {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  return str.replace(/[۰-۹]/g, d => persianDigits.indexOf(d).toString());
}

// Scraping function
async function fetchEuroPrice() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

  // Wait for the damned table rows to appear
  await page.waitForSelector("tbody");

  const data = await page.$$eval("tbody tr", rows => {
    return Array.from(rows).map(row =>
      Array.from(row.querySelectorAll("td")).map(td => td.innerText.trim())
    );
  });

  await browser.close();


  const validRow = data.find(row => row.length === 4 && row[0].match(/[۰-۹]/));
  if (!validRow) throw new Error("Euro price row not found");

  return {
    price: validRow[0],
    change: validRow[1],
    percentChange: validRow[2],
    time: validRow[3],
  };
}

app.get("/euro-price", async (req, res) => {
  try {
    const raw = await fetchEuroPrice();
    const translated = {
      price: convertPersianToEnglish(raw.price),
      change: convertPersianToEnglish(raw.change),
      percentChange: convertPersianToEnglish(raw.percentChange),
      time: raw.time,
    };
    res.json(translated);
  } catch (err) {
    console.error("Error fetching price:", err.message);
    res.status(500).json({ error: "Failed to fetch euro price" });
  }
});

// Default fallback
app.get("/", (req, res) => {
  res.send("Euro Price Scraper is running. Try /euro-price");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
