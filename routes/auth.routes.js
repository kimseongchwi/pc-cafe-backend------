const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getConnection, query } = require('../config/database');
const { JWT_SECRET, ADMIN_SECRET_CODE } = require('../config/jwt');
const { authenticateToken } = require('../middleware/auth');

const connection = getConnection();

// 아이디 중복 확인
router.get('/check-username/:username', async (req, res) => {
    const { username } = req.params;
    
    try {
        const results = await query(connection, 'SELECT id FROM users WHERE username = ?', [username]);
        res.json({ exists: results.length > 0 });
    } catch (error) {
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 회원가입
router.post('/register', async (req, res) => {
    const { username, password, name, address, role, adminCode } = req.body;

    if (!username || !password || !name) {
        return res.status(400).json({ message: '필수 항목을 모두 입력해주세요.' });
    }

    if (role === 'admin' && adminCode !== ADMIN_SECRET_CODE) {
        return res.status(400).json({ message: '관리자 코드가 올바르지 않습니다.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await query(
            connection,
            'INSERT INTO users (username, password, name, address, role) VALUES (?, ?, ?, ?, ?)',
            [username, hashedPassword, name, address || null, role]
        );
        res.status(201).json({ message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
        }
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 로그인
router.post('/', async (req, res) => {
    const { username, password } = req.body;

    try {
        const results = await query(connection, 'SELECT * FROM users WHERE username = ?', [username]);
        
        if (results.length === 0) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) {
            return res.status(401).json({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
        }

        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username, 
                name: user.name,
                role: user.role 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

// 사용자 정보 조회
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const results = await query(
            connection,
            'SELECT id, username, name, address, role FROM users WHERE id = ?',
            [req.user.id]
        );

        if (results.length === 0) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
        }

        res.json(results[0]);
    } catch (error) {
        res.status(500).json({ message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router; 