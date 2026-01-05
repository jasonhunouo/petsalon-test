// ===== 管理后台 API 端点 =====

// 获取单个预约详情
app.get('/bookings/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '预约不存在' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    res.status(500).json({ error: '查询失败: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 更新预约
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
    res.json({ success: true, message: '预约已更新' });
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    res.status(500).json({ error: '更新失败: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 删除预约
app.delete('/bookings/:id', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: '预约已删除' });
  } catch (error) {
    console.error('❌ 删除失败:', error.message);
    res.status(500).json({ error: '删除失败: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});

// 搜索预约
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
    console.error('❌ 搜索失败:', error.message);
    res.status(500).json({ error: '搜索失败: ' + error.message });
  } finally {
    if (connection) connection.release();
  }
});
