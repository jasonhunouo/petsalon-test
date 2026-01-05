const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

console.log('🔧 環境變數配置:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('PORT:', process.env.PORT);

// MySQL 連接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'petsalon',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0
});

// 初始化數據庫表
async function initDatabase() {
  try {
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
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ 初始化數據庫失敗:', error.message);
  }
}

// 健康檢查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 提交預約表單
app.post('/', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
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
    console.error('❌ 保存預約失敗:', error.message);
    res.status(500).json({ error: '保存失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 獲取所有預約
app.get('/bookings', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM bookings ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
    res.status(500).json({ error: '查詢失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// ===== 管理後台 API 端點 =====

// 獲取單個預約詳情
app.get('/bookings/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '預約不存在' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('❌ 查詢失敗:', error.message);
    res.status(500).json({ error: '查詢失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 更新預約
app.put('/bookings/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const {
      owner_name,
      phone_number,
      pet_name,
      breed,
      gender,
      is_neutered,
      weight,
      medical_details,
      is_taking_medication,
      medication_details,
      personality,
      service_type,
      photo_consent,
      is_agreed
    } = req.body;

    const query = `
      UPDATE bookings SET
        owner_name = ?,
        phone_number = ?,
        pet_name = ?,
        breed = ?,
        gender = ?,
        is_neutered = ?,
        weight = ?,
        medical_details = ?,
        is_taking_medication = ?,
        medication_details = ?,
        personality = ?,
        service_type = ?,
        photo_consent = ?,
        is_agreed = ?
      WHERE id = ?
    `;

    const values = [
      owner_name,
      phone_number,
      pet_name,
      breed || null,
      gender,
      is_neutered ? 1 : 0,
      weight || null,
      medical_details || null,
      is_taking_medication ? 1 : 0,
      medication_details || null,
      personality || null,
      service_type || null,
      photo_consent ? 1 : 0,
      is_agreed ? 1 : 0,
      req.params.id
    ];

    await connection.query(query, values);
    res.json({ success: true, message: '預約已更新' });
  } catch (error) {
    console.error('❌ 更新失敗:', error.message);
    res.status(500).json({ error: '更新失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 刪除預約
app.delete('/bookings/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '預約已刪除' });
  } catch (error) {
    console.error('❌ 刪除失敗:', error.message);
    res.status(500).json({ error: '刪除失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 搜尋預約
app.get('/search/bookings', async (req, res) => {
  let connection;
  try {
    const { keyword } = req.query;
    connection = await pool.getConnection();
    
    let query = 'SELECT * FROM bookings WHERE 1=1';
    let params = [];
    
    if (keyword) {
      query += ' AND (owner_name LIKE ? OR phone_number LIKE ? OR pet_name LIKE ?)';
      params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
    }
    
    query += ' ORDER BY created_at DESC';
    const [rows] = await connection.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('❌ 搜尋失敗:', error.message);
    res.status(500).json({ error: '搜尋失敗: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

const PORT = process.env.PORT || 8080;

// 啟動服務器
const server = app.listen(PORT, async () => {
  console.log(`🚀 API 服務運行在 http://localhost:${PORT}`);
  await initDatabase();
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('SIGTERM 信號已收到，正在關閉...');
  server.close(() => {
    console.log('服務器已關閉');
    process.exit(0);
  });
});
