const express = require('express');
const router = express.Router();
const { getConnection, query } = require('../config/database');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const connection = getConnection();

// 주문 생성
router.post('/', authenticateToken, async (req, res) => {
    const { menuId, quantity, paymentMethod } = req.body;
    const userId = req.user.id;
    const userName = req.user.name;

    if (!menuId || !quantity || !paymentMethod) {
        return res.status(400).json({ message: '필수 항목을 모두 입력해주세요.' });
    }

    try {
        const result = await query(
            connection,
            'INSERT INTO orders (user_id, user_name, menu_id, menu_name, quantity, payment_method) VALUES (?, ?, ?, (SELECT name FROM menus WHERE id = ?), ?, ?)',
            [userId, userName, menuId, menuId, quantity, paymentMethod]
        );
        
        res.json({
            id: result.insertId,
            message: '주문이 완료되었습니다.'
        });
    } catch (error) {
        console.error('주문 생성 실패:', error);
        res.status(500).json({ message: '주문에 실패했습니다.' });
    }
});

// 주문 목록 조회
router.get('/', authenticateToken, async (req, res) => {
    const query = req.user.role === 'admin' 
        ? `SELECT orders.*, users.username, users.name as userName, menus.name as menuName, menus.price 
           FROM orders 
           JOIN users ON orders.user_id = users.id 
           JOIN menus ON orders.menu_id = menus.id
           ORDER BY orders.created_at DESC`
        : `SELECT orders.*, menus.name as menuName, menus.price 
           FROM orders 
           JOIN menus ON orders.menu_id = menus.id 
           WHERE user_id = ?
           ORDER BY orders.created_at DESC`;

    const params = req.user.role === 'admin' ? [] : [req.user.id];

    try {
        const results = await query(connection, query, params);
        res.json(results);
    } catch (error) {
        console.error('주문 조회 실패:', error);
        res.status(500).json({ message: '주문 조회에 실패했습니다.' });
    }
});

// 주문 상태 변경
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        await query(
            connection,
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id]
        );
        
        res.json({ 
            success: true,
            message: '주문 상태가 변경되었습니다.'
        });
    } catch (error) {
        console.error('주문 상태 업데이트 실패:', error);
        res.status(500).json({ message: '주문 상태 변경에 실패했습니다.' });
    }
});

module.exports = router; 