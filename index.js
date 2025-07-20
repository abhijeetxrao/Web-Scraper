const puppeteer = require("puppeteer");
require("dotenv").config();
const writeToSheet = require("./googleSheets");


const SHEET_ID = "1xnQi4spCYlyxJSTSegb7dmI64X4PkeJ3L1Ji2KNPhnQ";
const RANGE = "Sheet1!A1";


async function loginToInstagram(browser) {
  const page = await browser.newPage();
  await page.goto("https://www.instagram.com/accounts/login/", {
    waitUntil: "networkidle2",
  });


  if (page.url().includes("accounts/login")) {
    console.log("Logging into Instagram...");


    await page.waitForSelector("input[name='username']", { visible: true });
    await page.type("input[name='username']", process.env.IG_USERNAME, {
      delay: 1000,
    });
    await page.type("input[name='password']", process.env.IG_PASSWORD, {
      delay: 1000,
    });


    await Promise.all([
      page.click("button[type='submit']"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
  } else {
    console.log("Already logged in (session reused).");
  }


  return page;
}


async function searchGoogle(keyword) {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.ExecutablePath,
    userDataDir: process.env.USER_DATA,
    defaultViewport: null,
  });


  const igPage = await loginToInstagram(browser);
  const page = await browser.newPage();
  let allResults = [];






  for (let i = 0; i < 8; i++) {
    const start = i * 10;
    const searchURL = `https://www.google.com/search?q=${encodeURIComponent(
      keyword
    )}&start=${start}`;
    await page.goto(searchURL, { waitUntil: "domcontentloaded" });
    const pageResults = await page.evaluate(() => {
      const data = [];
      const anchors = document.querySelectorAll("a h3");


      anchors.forEach((h3) => {
        const parent = h3.closest("a");
        if (
          parent &&
          parent.href.includes("instagram.com/") &&
          !parent.href.includes("/p/") && // exclude posts
          !parent.href.includes("/explore/") &&
          !parent.href.includes("/reel/") &&
          !parent.href.includes("/tags/") &&
          !parent.href.includes("/about/") &&
          !parent.href.includes("/accounts/")
        ) {
          data.push({
            title: h3.innerText.trim(),
            url: parent.href,
          });
        }
      });


      return data;
    });


    allResults.push(...pageResults);
    await new Promise((r) => setTimeout(r, 4000));
  }


  console.log(`\n Total results fetched: ${allResults.length}\n`);








  for (const [i, profile] of allResults.entries()) {
    console.log(`\n Visiting profile ${i + 1}: ${profile.url}`);
    try {
      await igPage.goto(profile.url, { waitUntil: "domcontentloaded" });
      await igPage.waitForSelector("header", { timeout: 8000 });


      const data = await igPage.evaluate(() => {
        const username = document.location.pathname.replaceAll("/", "");
        const followersText =
          document
            .querySelector("header section ul li:nth-child(2) span")
            ?.getAttribute("title") ||
          document.querySelector("header section ul li:nth-child(2) span")
            ?.innerText ||
          "";
        const bio =
          document.querySelector("header section div.-vDIg")?.innerText || "";
        const emailMatch = bio.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
        );
        const email = emailMatch ? emailMatch[0] : "Not found";


        return {
          username,
          followers: followersText,
          email,
        };
      });


      console.log("👤 Username:", data.username);
      console.log("👥 Followers:", data.followers);
      console.log("📧 Email:", data.email);


      await writeToSheet(SHEET_ID, RANGE, [
        profile.url,
        data.username,
        data.followers,
        data.email,
      ]);


    } catch (err) {
      console.log("⚠️ Error scraping profile:", err.message);
    }






    // await browser.close();
  }


  // allResults.forEach((result, i) => {
  //   console.log(`${i + 1}. ${result.title}`);
  //   console.log(`   ${result.url}`);
  // });
}


(async () => {
  await searchGoogle("India's best food bloggers site:instagram.com");
})();


