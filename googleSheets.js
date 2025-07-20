const { google } = require("googleapis");
const fs = require("fs");

const auth = new google.auth.GoogleAuth({
  keyFile: "./influencers-scrapping-7736411836f7.json", // replace with your downloaded JSON key filename
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

async function writeToSheet(sheetId, range, values) {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: range,
    valueInputOption: "RAW",
    resource: {
      values: [values],
    },
  });
}

module.exports = writeToSheet;