/**
 * Firestore → Google Drive Backup Script
 * Using service account authentication
 */

const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { Firestore } = require("@google-cloud/firestore");

// 🔑 Path to your service account JSON file
const SERVICE_ACCOUNT_KEY = path.join(__dirname, "lla5785v3-0-firebase-adminsdk-fbsvc-d2c5dd2442.json");

// 📂 Google Drive BACKUP FOLDER ID
const DRIVE_FOLDER_ID = "1MzeTocaOF6074jEYDTwehsDNQZ-p2UpB";

// Load service account
const auth = new google.auth.GoogleAuth({
  keyFile: SERVICE_ACCOUNT_KEY,
  scopes: [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/datastore"
  ],
});

// Firestore client
const firestore = new Firestore({
  projectId: "lla5785v3-0",
  keyFilename: SERVICE_ACCOUNT_KEY,
});

// Drive client
const drive = google.drive({ version: "v3", auth });

async function backupFirestore() {
  console.log("🚀 Starting Firestore backup...");

  const backupData = {};
  const collections = await firestore.listCollections();

  for (const col of collections) {
    console.log(`📂 Fetching collection: ${col.id}`);
    const snapshot = await col.get();

    backupData[col.id] = [];
    snapshot.forEach(doc => {
      backupData[col.id].push({
        id: doc.id,
        data: doc.data(),
      });
    });
  }

  // Save to local JSON file
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `backup-${timestamp}.json`;
  const filePath = path.join(__dirname, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Local backup saved: ${filePath}`);

  // Upload to Google Drive
  const fileMetadata = {
    name: fileName,
    parents: [DRIVE_FOLDER_ID],  // 👈 Upload into your BACKUP FOLDER
  };

  const media = {
    mimeType: "application/json",
    body: fs.createReadStream(filePath),
  };

  const response = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: "id, name, parents",
  });

  console.log(`☁️ Uploaded to Google Drive: ${response.data.name} (ID: ${response.data.id})`);
}

backupFirestore().catch(err => {
  console.error("❌ Backup failed:", err);
});
