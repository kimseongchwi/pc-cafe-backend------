const express = require('express');
const cors = require('cors');
const path = require('path');
const { createDatabase } = require('./config/database');
const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const orderRoutes = require('./routes/order.routes');

const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 라우트 설정
app.use('/api/auth', authRoutes);
app.use('/api/menus', menuRoutes);
app.use('/api/orders', orderRoutes);

// 데이터베이스 초기화 및 서버 시작
const startServer = async () => {
    try {
        await createDatabase();
        
        const PORT = 3000;
        app.listen(PORT, () => {
            console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
        });
    } catch (error) {
        console.error('서버 시작 실패:', error);
        process.exit(1);
    }
};

startServer();