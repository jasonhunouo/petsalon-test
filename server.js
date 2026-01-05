const express = require('express');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 1. 設定 CORS (允許跨域請求)
app.use(cors());
app.use(express.json());

// 2. 資料庫連線設定 (自動讀取 Zeabur 的環境變數)
// 如果沒有 DATABASE_URL，會嘗試讀取個別變數
const dbConfig = {
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_CONNECTION_STRING,
  ssl: {
    rejectUnauthorized: false // Zeabur 的資料庫通常需要 SSL
  }
};

const client = new Client(dbConfig);

// 3. 啟動伺服器並連接資料庫
async function startServer() {
  try {
    await client.connect();
    console.log("✅ 資料庫連線成功");

    // 自動建立資料表 (PostgreSQL 語法)
    await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id SERIAL PRIMARY KEY,
        owner_name TEXT,
        phone_number TEXT,
        pet_name TEXT,
        breed TEXT,
        gender TEXT,
        is_neutered INTEGER,
        weight REAL,
        medical_details TEXT,
        is_taking_medication INTEGER,
        medication_details TEXT,
        personality TEXT,
        service_type TEXT,
        photo_consent INTEGER,
        is_agreed INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ 資料表檢查/建立完成");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("❌ 啟動失敗:", err);
  }
}

startServer();

// 4. API 路由
app.get('/', (req, res) => {
  res.send('Pet Salon API is Running on Zeabur! 🐶');
});

app.post('/', async (req, res) => {
  try {
    const data = req.body;
    
    // 轉換布林值
    const isNeutered = data.IsNeutered === "true" || data.IsNeutered === true ? 1 : 0;
    const isTakingMedication = data.IsTakingMedication === "true" || data.IsTakingMedication === true ? 1 : 0;
    const photoConsent = data.PhotoConsent === "true" || data.PhotoConsent === true ? 1 : 0;
    const isAgreed = data.IsAgreed === "true" || data.IsAgreed === true ? 1 : 0;

    const query = `
      INSERT INTO bookings (
        owner_name, phone_number, pet_name, breed, gender, 
        is_neutered, weight, medical_details, is_taking_medication, 
        medication_details, personality, service_type, photo_consent, is_agreed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      data.OwnerName, data.PhoneNumber, data.PetName, data.Breed || "", data.Gender,
      isNeutered, data.Weight || 0, data.MedicalDetails || "", isTakingMedication,
      data.MedicationDetails || "", data.Personality || "", data.ServiceType || "未指定",
      photoConsent, isAgreed
    ];

    const result = await client.query(query, values);

    res.json({ success: true, result: result.rows[0] });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
