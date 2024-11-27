const mysql = require('mysql2');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'pc_cafe'
};

const initialConnection = mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
});

const createDatabase = () => {
    return new Promise((resolve, reject) => {
        initialConnection.connect(async (err) => {
            if (err) {
                console.error('MySQL 초기 연결 실패:', err);
                reject(err);
                return;
            }

            try {
                await query(initialConnection, 'CREATE DATABASE IF NOT EXISTS pc_cafe');
                await query(initialConnection, 'USE pc_cafe');
                
                // users 테이블 생성
                await query(initialConnection, `
                    CREATE TABLE IF NOT EXISTS users (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        password VARCHAR(255) NOT NULL,
                        name VARCHAR(50) NOT NULL,
                        address VARCHAR(255),
                        role ENUM('user', 'admin') NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // menus 테이블 생성
                await query(initialConnection, `
                    CREATE TABLE IF NOT EXISTS menus (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        price INT NOT NULL,
                        category VARCHAR(50) NOT NULL,
                        image_path VARCHAR(255),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);

                // orders 테이블 생성
                await query(initialConnection, `
                    CREATE TABLE IF NOT EXISTS orders (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        user_id INT NOT NULL,
                        user_name VARCHAR(50) NOT NULL,
                        menu_id INT NOT NULL,
                        menu_name VARCHAR(100) NOT NULL,
                        quantity INT NOT NULL,
                        status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
                        payment_method ENUM('card', 'cash') NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id),
                        FOREIGN KEY (menu_id) REFERENCES menus(id)
                    )
                `);

                initialConnection.end();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    });
};

const query = (connection, sql, params = []) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (error, results) => {
            if (error) reject(error);
            else resolve(results);
        });
    });
};

const getConnection = () => {
    const connection = mysql.createConnection(dbConfig);
    connection.connect((err) => {
        if (err) {
            console.error('DB 연결 실패:', err);
            return;
        }
        console.log('DB 연결 성공');
    });
    return connection;
};

module.exports = {
    createDatabase,
    getConnection,
    query
}; 