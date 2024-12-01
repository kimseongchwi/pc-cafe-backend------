const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const JWT_SECRET = 'your-jwt-secret';
const ADMIN_SECRET_CODE = 'admin123';

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 이미지 업로드 설정
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// 인증 미들웨어
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '토큰이 유효하지 않습니다.' });
        }
        req.user = user;
        next();
    });
};

// 관리자 권한 확인 미들웨어
const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    next();
};

// MySQL 초기 연결 및 데이터베이스 설정
const initialConnection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1234'
});

initialConnection.connect((err) => {
    if (err) {
        console.error('MySQL 초기 연결 실패:', err);
        return;
    }
    console.log('MySQL 초기 연결 성공');

    initialConnection.query('CREATE DATABASE IF NOT EXISTS pc_cafe', (err) => {
        if (err) {
            console.error('데이터베이스 생성 실패:', err);
            return;
        }
        console.log('데이터베이스 생성 완료 또는 이미 존재함');

        initialConnection.query('USE pc_cafe', (err) => {
            if (err) {
                console.error('데이터베이스 선택 실패:', err);
                return;
            }

            const createUsersTableQuery = `
                CREATE TABLE IF NOT EXISTS users (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    registerid VARCHAR(50) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(50) NOT NULL,
                    address VARCHAR(255),
                    role ENUM('user', 'admin') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createMenusTableQuery = `
                CREATE TABLE IF NOT EXISTS menus (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    price INT NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    image_path VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createSeatsTableQuery = `
                CREATE TABLE IF NOT EXISTS seats (
                    number INT PRIMARY KEY,
                    registerid VARCHAR(50),
                    user_id INT,
                    user_name VARCHAR(50),
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `;

            const createOrdersTableQuery = `
                CREATE TABLE IF NOT EXISTS orders (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    seat_number INT NOT NULL,
                    user_id INT NOT NULL,
                    user_name VARCHAR(50) NOT NULL,
                    menu_id INT NOT NULL,
                    menu_name VARCHAR(100) NOT NULL,
                    quantity INT NOT NULL,
                    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
                    payment_method ENUM('card', 'cash') NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    FOREIGN KEY (menu_id) REFERENCES menus(id),
                    FOREIGN KEY (seat_number) REFERENCES seats(number)
                )
            `;

            // 테이블 생성 순서 조정
            initialConnection.query(createUsersTableQuery, (err) => {
                if (err) {
                    console.error('users 테이블 생성 실패:', err);
                    return;
                }
                console.log('users 테이블 생성 완료');

                initialConnection.query(createMenusTableQuery, (err) => {
                    if (err) {
                        console.error('menus 테이블 생성 실패:', err);
                        return;
                    }
                    console.log('menus 테이블 생성 완료');

                    initialConnection.query(createSeatsTableQuery, (err) => {
                        if (err) {
                            console.error('seats 테이블 생성 실패:', err);
                            return;
                        }
                        console.log('seats 테이블 생성 완료');

                        initialConnection.query(createOrdersTableQuery, (err) => {
                            if (err) {
                                console.error('orders 테이블 생성 실패:', err);
                                return;
                            }
                            console.log('orders 테이블 생성 완료');
                            initialConnection.end();
                            startApp();
                        });
                    });
                });
            });
        });
    });
});

function startApp() {
    const connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '1234',
        database: 'pc_cafe'
    });

    connection.connect((err) => {
        if (err) {
            console.error('DB 연결 실패:', err);
            return;
        }
        console.log('DB 연결 성공');
    });

    // 좌석 초기화
    // 좌석 초기화
connection.query('DELETE FROM orders', (err) => {  // 먼저 orders 테이블의 데이터를 삭제
    if (err) {
        console.error('주문 데이터 초기화 실패:', err);
        return;
    }

    connection.query('DELETE FROM seats', (err) => {  // 그 다음 seats 테이블 초기화
        if (err) {
            console.error('좌석 초기화 실패:', err);
            return;
        }

        const insertSeatsQuery = `
            INSERT INTO seats (number, registerid, user_id) VALUES
            (1, NULL, NULL), (2, NULL, NULL), (3, NULL, NULL), (4, NULL, NULL), (5, NULL, NULL),
            (6, NULL, NULL), (7, NULL, NULL), (8, NULL, NULL), (9, NULL, NULL), (10, NULL, NULL),
            (11, NULL, NULL), (12, NULL, NULL), (13, NULL, NULL), (14, NULL, NULL), (15, NULL, NULL),
            (16, NULL, NULL), (17, NULL, NULL), (18, NULL, NULL), (19, NULL, NULL), (20, NULL, NULL);
        `;

        connection.query(insertSeatsQuery, (err) => {
            if (err) {
                console.error('좌석 삽입 실패:', err);
            } else {
                console.log('좌석 초기화 완료');
            }
        });
    });
});

    // 좌석 정보 조회 API
    app.get('/api/seats', (req, res) => {
        connection.query('SELECT * FROM seats', (error, results) => {
            if (error) {
                console.error('좌석 정보 조회 실패:', error);
                return res.status(500).json({ message: '좌석 정보 조회에 실패했습니다.' });
            }
            res.json(results);
        });
    });

    // 로그인 시 좌석 업데이트
    app.post('/api/auth/login', async (req, res) => {
        const { registerid, password, seatNumber } = req.body;

        connection.query(
            'SELECT * FROM users WHERE registerid = ?',
            [registerid],
            async (error, results) => {
                if (error || results.length === 0) {
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
                        registerid: user.registerid, 
                        name: user.name,
                        role: user.role 
                    },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );

                // 좌석 업데이트 (관리자가 아닌 경우에만)
                if (seatNumber && user.role !== 'admin') {
                    connection.query(
                        'UPDATE seats SET registerid = ?, user_id = ?, user_name = ? WHERE number = ?',
                        [user.registerid, user.id, user.name, seatNumber],
                        (error) => {
                            if (error) {
                                console.error('좌석 업데이트 실패:', error);
                            }
                        }
                    );
                }

                res.json({
                    token,
                    user: {
                        id: user.id,
                        registerid: user.registerid,
                        name: user.name,
                        role: user.role
                    }
                });
            }
        );
    });

    app.post('/api/auth/logout', authenticateToken, (req, res) => {
        const userId = req.user.id;
    
        connection.query(
            'UPDATE seats SET registerid = NULL, user_id = NULL, user_name = NULL WHERE user_id = ?',  // user_name도 NULL로 설정
            [userId],
            (error) => {
                if (error) {
                    console.error('좌석 정보 초기화 실패:', error);
                    return res.status(500).json({ message: '로그아웃 처리 중 오류가 발생했습니다.' });
                }
                res.json({ message: '로그아웃이 완료되었습니다.' });
            }
        );
    });

    // 아이디 중복 확인 API
    app.get('/api/auth/check-registerid/:registerid', (req, res) => {
        const { registerid } = req.params;
        
        connection.query(
            'SELECT id FROM users WHERE registerid = ?',
            [registerid],
            (error, results) => {
                if (error) {
                    return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
                }
                res.json({ exists: results.length > 0 });
            }
        );
    });

    // 회원가입 API
    app.post('/api/auth/register', async (req, res) => {
        const { registerid, password, name, address, role, adminCode } = req.body;

        if (!registerid || !password || !name) {
            return res.status(400).json({ message: '필수 항목을 모두 입력해주세요.' });
        }

        if (role === 'admin' && adminCode !== ADMIN_SECRET_CODE) {
            return res.status(400).json({ message: '관리자 코드가 올바르지 않습니다.' });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            
            connection.query(
                'INSERT INTO users (registerid, password, name, address, role) VALUES (?, ?, ?, ?, ?)',
                [registerid, hashedPassword, name, address || null, role],
                (error) => {
                    if (error) {
                        if (error.code === 'ER_DUP_ENTRY') {
                            return res.status(400).json({ message: '이미 존재하는 아이디입니다.' });
                        }
                        return res.status(500).json({ message: '서버 오류가 발생했습니다.' });
                    }
                    res.status(201).json({ message: '회원가입이 완료되었습니다.' });
                }
            );
        } catch (error) {
            res.status(500).json({ message: '서버 오류가 발생했습니다.' });
        }
    });

    // 로그인 API
    app.post('/api/auth/login', async (req, res) => {
        const { registerid, password } = req.body;

        connection.query(
            'SELECT * FROM users WHERE registerid = ?',
            [registerid],
            async (error, results) => {
                if (error || results.length === 0) {
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
                        registerid: user.registerid, 
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
                        registerid: user.registerid,
                        name: user.name,
                        role: user.role
                    }
                });
            }
        );
    });

    // 사용자 정보 조회 API
    app.get('/api/users/me', authenticateToken, (req, res) => {
        connection.query(
            `SELECT users.id, users.registerid, users.name, users.address, users.role, seats.number AS seatNumber
         FROM users
         LEFT JOIN seats ON users.id = seats.user_id
         WHERE users.id = ?`,
        [req.user.id],
        (error, results) => {
            if (error || results.length === 0) {
                return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
            }
            res.json(results[0]);
            }
        );
    });

    // 메뉴 관련 API
    app.get('/api/menus', authenticateToken, (req, res) => {
        connection.query('SELECT * FROM menus', (error, results) => {
            if (error) {
                console.error('메뉴 조회 실패:', error);
                res.status(500).json({ error: '메뉴 조회에 실패했습니다.' });
                return;
            }
            results = results.map(menu => ({
                ...menu,
                imageUrl: menu.image_path ? `http://localhost:3000/${menu.image_path}` : null
            }));
            res.json(results);
        });
    });

    app.post('/api/menus', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
        const { name, price, category } = req.body;
        const image_path = req.file ? req.file.path.replace(/\\/g, '/') : null;

        if (!name || !price) {
            res.status(400).json({ error: '메뉴명과 가격은 필수입니다.' });
            return;
        }

        connection.query(
            'INSERT INTO menus (name, price, category, image_path) VALUES (?, ?, ?, ?)',
            [name, price, category, image_path],
            (error, results) => {
                if (error) {
                    console.error('메뉴 추가 실패:', error);
                    res.status(500).json({ error: '메뉴 추가에 실패했습니다.' });
                    return;
                }
                res.json({ id: results.insertId });
            }
        );
    });

    app.put('/api/menus/:id', authenticateToken, isAdmin, upload.single('image'), (req, res) => {
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

        connection.query(query, params, (error) => {
            if (error) {
                console.error('메뉴 수정 실패:', error);
                res.status(500).json({ error: '메뉴 수정에 실패했습니다.' });
                return;
            }
            res.json({ success: true });
        });
    });

    app.delete('/api/menus/:id', authenticateToken, isAdmin, (req, res) => {
        const { id } = req.params;
    
        // 1. 연관된 주문 데이터 삭제
        connection.query('DELETE FROM orders WHERE menu_id = ?', [id], (error) => {
            if (error) {
                console.error('주문 데이터 삭제 실패:', error);
                return res.status(500).json({ error: '메뉴 삭제에 실패했습니다.' });
            }
    
            // 2. 이미지 파일 삭제
            connection.query('SELECT image_path FROM menus WHERE id = ?', [id], (error, results) => {
                if (error) {
                    console.error('메뉴 조회 실패:', error);
                    return res.status(500).json({ error: '메뉴 삭제에 실패했습니다.' });
                }
    
                const menu = results[0];
                if (menu && menu.image_path) {
                    try {
                        fs.unlinkSync(menu.image_path);
                    } catch (err) {
                        console.error('이미지 파일 삭제 실패:', err);
                    }
                }
    
                // 3. 메뉴 데이터 삭제
                connection.query('DELETE FROM menus WHERE id = ?', [id], (error) => {
                    if (error) {
                        console.error('메뉴 삭제 실패:', error);
                        return res.status(500).json({ error: '메뉴 삭제에 실패했습니다.' });
                    }
                    res.json({ success: true });
                });
            });
        });
    });

    // 주문 API 수정 (결제 방식 추가)
    app.post('/api/orders', authenticateToken, (req, res) => {
        const { menuId, quantity, paymentMethod, seatNumber } = req.body;
        const userId = req.user.id;
        const userName = req.user.name;

        if (!menuId || !quantity || !paymentMethod || !seatNumber) {
            return res.status(400).json({ message: '필수 항목을 모두 입력해주세요.' });
        }

        connection.query(
            'SELECT name FROM menus WHERE id = ?',
            [menuId],
            (error, results) => {
                if (error || results.length === 0) {
                    return res.status(400).json({ message: '유효하지 않은 메뉴입니다.' });
                }

                const menuName = results[0].name;

                connection.query(
                    'INSERT INTO orders (user_id, user_name, menu_id, menu_name, seat_number, quantity, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [userId, userName, menuId, menuName, seatNumber, quantity, paymentMethod],
                    (error, results) => {
                        if (error) {
                            console.error('주문 생성 실패:', error);
                            return res.status(500).json({ message: '주문에 실패했습니다.' });
                        }
                        res.json({
                            id: results.insertId,
                            message: '주문이 완료되었습니다.'
                        });
                    }
                );
            }
        );
    });

    // 주문 조회 API
    // 주문 조회 API
app.get('/api/orders', authenticateToken, (req, res) => {
    const query = req.user.role === 'admin' 
        ? `SELECT orders.*, users.registerid, users.name as userName, menus.name as menuName, menus.price, seats.number as seatNumber 
           FROM orders 
           JOIN users ON orders.user_id = users.id 
           JOIN menus ON orders.menu_id = menus.id
           JOIN seats ON orders.seat_number = seats.number
           ORDER BY orders.created_at DESC`
        : `SELECT orders.*, menus.name as menuName, menus.price, seats.number as seatNumber 
           FROM orders 
           JOIN menus ON orders.menu_id = menus.id 
           JOIN seats ON orders.seat_number = seats.number
           WHERE orders.user_id = ?  /* orders.user_id로 명확하게 지정 */
           ORDER BY orders.created_at DESC`;

    const params = req.user.role === 'admin' ? [] : [req.user.id];

    connection.query(query, params, (error, results) => {
        if (error) {
            console.error('주문 조회 실패:', error);
            return res.status(500).json({ message: '주문 조회에 실패했습니다.' });
        }
        res.json(results);
    });
});

    // 주문 상태 변경 API
    app.put('/api/orders/:id', authenticateToken, isAdmin, (req, res) => {
        const { id } = req.params;
        const { status } = req.body;

        connection.query(
            'UPDATE orders SET status = ? WHERE id = ?',
            [status, id],
            (error) => {
                if (error) {
                    console.error('주문 상태 업데이트 실패:', error);
                    return res.status(500).json({ message: '주문 상태 변경에 실패했습니다.' });
                }
                res.json({ 
                    success: true,
                    message: '주문 상태가 변경되었습니다.'
                });
            }
        );
    });

    const PORT = 3000;
    app.listen(PORT, () => {
        console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    });
}