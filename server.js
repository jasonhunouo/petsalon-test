const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MySQL 連接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'petsalon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 初始化數據庫表
async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        owner_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(20) NOT NULL,
        pet_name VARCHAR(100) NOT NULL,
        breed VARCHAR(100),
        gender VARCHAR(10) NOT NULL,
        is_neutered BOOLEAN NOT NULL,
        weight DECIMAL(5,2),
        medical_details TEXT,
        is_taking_medication BOOLEAN NOT NULL,
        medication_details VARCHAR(255),
        personality VARCHAR(255),
        service_type VARCHAR(100),
        photo_consent BOOLEAN DEFAULT FALSE,
        is_agreed BOOLEAN NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ 數據庫表已初始化');
  } catch (error) {
    console.error('❌ 初始化數據庫失敗:', error);
  } finally {
    connection.release();
  }
}

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 提交預約表單
app.post('/', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const {
      OwnerName,
      PhoneNumber,
      PetName,
      Breed,
      Gender,
      IsNeutered,
      Weight,
      MedicalDetails,
      IsTakingMedication,
      MedicationDetails,
      Personality,
      ServiceType,
      PhotoConsent,
      IsAgreed
    } = req.body;

    // 驗證必填字段
    if (!OwnerName || !PhoneNumber || !PetName || !Gender || !IsNeutered || !IsTakingMedication || !IsAgreed) {
      return res.status(400).json({ error: '缺少必填字段' });
    }

    const query = `
      INSERT INTO bookings (
        owner_name, phone_number, pet_name, breed, gender, is_neutered, weight,
        medical_details, is_taking_medication, medication_details, personality,
        service_type, photo_consent, is_agreed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      OwnerName,
      PhoneNumber,
      PetName,
      Breed || null,
      Gender,
      IsNeutered === 'true' ? 1 : 0,
      Weight || null,
      MedicalDetails || null,
      IsTakingMedication === 'true' ? 1 : 0,
      MedicationDetails || null,
      Personality || null,
      ServiceType || null,
      PhotoConsent ? 1 : 0,
      IsAgreed ? 1 : 0
    ];

    await connection.query(query, values);
    res.json({ success: true, message: '預約已保存' });
  } catch (error) {
    console.error('❌ 保存預約失敗:', error);
    res.status(500).json({ error: '保存失敗' });
  } finally {
    connection.release();
  }
});

// 獲取所有預約（管理用）
app.get('/bookings', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('❌ 查詢失敗:', error);
    res.status(500).json({ error: '查詢失敗' });
  } finally {
    connection.release();
  }
});

const PORT = process.env.PORT || 8080;

// 啟動服務器
app.listen(PORT, async () => {
  console.log(`🚀 API 服務運行在 http://localhost:${PORT}`);
  await initDatabase();
});
