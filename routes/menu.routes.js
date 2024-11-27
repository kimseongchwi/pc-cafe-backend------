const express = require('express');
const router = express.Router();
const fs = require('fs');
const { getConnection, query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

const connection = getConnection();

// 메뉴 목록 조회
router.get('/', authenticateToken, async (req, res) => {
    try {
        const results = await query(connection, 'SELECT * FROM menus');
        results = results.map(menu => ({
            ...menu,
            imageUrl: menu.image_path ? `http://localhost:3000/${menu.image_path}` : null
        }));
        res.json(results);
    } catch (error) {
        console.error('메뉴 조회 실패:', error);
        res.status(500).json({ error: '메뉴 조회에 실패했습니다.' });
    }
});

// 메뉴 추가
router.post('/', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    const { name, price, category } = req.body;
    const image_path = req.file ? req.file.path.replace(/\\/g, '/') : null;

    if (!name || !price) {
        return res.status(400).json({ error: '메뉴명과 가격은 필수입니다.' });
    }

    try {
        const result = await query(
            connection,
            'INSERT INTO menus (name, price, category, image_path) VALUES (?, ?, ?, ?)',
            [name, price, category, image_path]
        );
        res.json({ id: result.insertId });
    } catch (error) {
        console.error('메뉴 추가 실패:', error);
        res.status(500).json({ error: '메뉴 추가에 실패했습니다.' });
    }
});

// 메뉴 수정
router.put('/:id', authenticateToken, isAdmin, upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { name, price, category } = req.body;
    const image_path = req.file ? req.file.path.replace(/\\/g, '/') : null;

    let query = 'UPDATE menus SET name = ?, price = ?, category = ?';
    let params = [name, price, category];

    if (image_path) {
        query += ', image_path = ?';
        params.push(image_path);
    }

    query += ' WHERE id = ?';
    params.push(id);

    try {
        await query(connection, query, params);
        res.json({ success: true });
    } catch (error) {
        console.error('메뉴 수정 실패:', error);
        res.status(500).json({ error: '메뉴 수정에 실패했습니다.' });
    }
});

// 메뉴 삭제
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // 1. 연관된 주문 데이터 삭제
        await query(connection, 'DELETE FROM orders WHERE menu_id = ?', [id]);

        // 2. 이미지 파일 삭제
        const menuResults = await query(connection, 'SELECT image_path FROM menus WHERE id = ?', [id]);
        const menu = menuResults[0];
        if (menu && menu.image_path) {
            try {
                fs.unlinkSync(menu.image_path);
            } catch (err) {
                console.error('이미지 파일 삭제 실패:', err);
            }
        }

        // 3. 메뉴 데이터 삭제
        await query(connection, 'DELETE FROM menus WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error('메뉴 삭제 실패:', error);
        res.status(500).json({ error: '메뉴 삭제에 실패했습니다.' });
    }
});

module.exports = router; 