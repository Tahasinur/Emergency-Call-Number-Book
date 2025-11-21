const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Test database connection
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Middleware for authentication
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        // For demo purposes, create a default user
        req.user = { user_id: 1, username: 'demo_user', role: 'user' };
        return next();
    }
    
    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            // For demo, still allow with default user
            req.user = { user_id: 1, username: 'demo_user', role: 'user' };
            return next();
        }
        req.user = user;
        next();
    });
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// === AUTHENTICATION ENDPOINTS ===

app.post('/api/register', async (req, res) => {
    const { username, email, password, phone_number, role } = req.body;
    
    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        db.query(
            'INSERT INTO users (username, email, password_hash, phone_number, role, coin_balance, love_count, copy_count) VALUES (?, ?, ?, ?, ?, 100, 0, 0)',
            [username, email, hashedPassword, phone_number, role || 'user'],
            (err, result) => {
                if (err) {
                    console.error('Registration error:', err);
                    return res.status(400).json({ error: 'User already exists or registration failed' });
                }
                res.json({ success: true, message: 'User registered successfully' });
            }
        );
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, result) => {
        if (err || result.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = result[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const token = jwt.sign(
            { user_id: user.user_id, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                role: user.role,
                coin_balance: user.coin_balance,
                love_count: user.love_count,
                copy_count: user.copy_count
            }
        });
    });
});

// === EMERGENCY SERVICES ENDPOINTS ===

app.get('/api/services', authenticateToken, (req, res) => {
    const { category, search } = req.query;
    // FIXED: Use emergency_services table with correct column names
    let query = 'SELECT service_id as contact_id, service_name, phone_number, category, service_description as description FROM emergency_services WHERE is_active = 1';
    let params = [];
    
    if (category && category !== 'all') {
        query += ' AND category = ?';
        params.push(category);
    }
    
    if (search) {
        query += ' AND (service_name LIKE ? OR service_description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ' ORDER BY priority_level DESC, category, service_name';
    
    db.query(query, params, (err, result) => {
        if (err) {
            console.error('Get services error:', err);
            return res.status(500).json({ error: 'Failed to get services', details: err.message });
        }
        console.log(`Found ${result.length} services`);
        res.json(result);
    });
});

// === CALL TRACKING ENDPOINTS ===

app.post('/api/call', authenticateToken, (req, res) => {
    const { service_id, user_lat, user_lng, call_type } = req.body;
    
    // Check user's coin balance first
    const checkBalance = 'SELECT coin_balance FROM users WHERE user_id = ?';
    db.query(checkBalance, [req.user.user_id], (err, result) => {
        if (err || result.length === 0) {
            return res.status(500).json({ error: 'Failed to check balance' });
        }
        
        const currentBalance = result[0].coin_balance;
        const callCost = 20;
        
        if (currentBalance < callCost) {
            return res.status(400).json({ error: 'Insufficient coin balance' });
        }
        
        // FIXED: Record the call in call_history with service_id
        const recordCall = `
            INSERT INTO call_history 
            (user_id, service_id, call_type, call_status, user_location_lat, user_location_lng, call_time) 
            VALUES (?, ?, ?, 'completed', ?, ?, NOW())
        `;
        
        db.query(recordCall, [req.user.user_id, service_id, call_type || 'direct', user_lat, user_lng], (err, callResult) => {
            if (err) {
                console.error('Record call error:', err);
                return res.status(500).json({ error: 'Failed to record call' });
            }
            
            // Deduct coins from user balance
            const updateBalance = 'UPDATE users SET coin_balance = coin_balance - ? WHERE user_id = ?';
            db.query(updateBalance, [callCost, req.user.user_id], (err) => {
                if (err) {
                    console.error('Update balance error:', err);
                }
                
                res.json({ 
                    success: true, 
                    message: 'Call recorded successfully',
                    coins_spent: callCost,
                    remaining_balance: currentBalance - callCost,
                    call_id: callResult.insertId
                });
            });
        });
    });
});

// === USER MANAGEMENT ENDPOINTS ===

app.get('/api/user', authenticateToken, (req, res) => {
    const query = 'SELECT coin_balance, love_count, copy_count, username FROM users WHERE user_id = ?';
    db.query(query, [req.user.user_id], (err, result) => {
        if (err) {
            console.error('Get user error:', err);
            return res.status(500).json({ error: 'Failed to get user data' });
        }
        
        if (result.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result[0]);
    });
});

app.post('/api/favorite', authenticateToken, (req, res) => {
    const query = 'UPDATE users SET love_count = love_count + 1 WHERE user_id = ?';
    db.query(query, [req.user.user_id], (err, result) => {
        if (err) {
            console.error('Update favorite error:', err);
            return res.status(500).json({ error: 'Failed to update favorites' });
        }
        res.json({ success: true, message: 'Favorite count updated' });
    });
});

app.post('/api/copy', authenticateToken, (req, res) => {
    const query = 'UPDATE users SET copy_count = copy_count + 1 WHERE user_id = ?';
    db.query(query, [req.user.user_id], (err, result) => {
        if (err) {
            console.error('Update copy error:', err);
            return res.status(500).json({ error: 'Failed to update copy count' });
        }
        res.json({ success: true, message: 'Copy count updated' });
    });
});

// === EMERGENCY ENDPOINTS ===

app.post('/api/emergency', authenticateToken, (req, res) => {
    const { incident_type, user_lat, user_lng } = req.body;
    
    // FIXED: Find police emergency service ID from emergency_services table
    const findPolice = 'SELECT service_id FROM emergency_services WHERE category = "police" AND is_active = 1 ORDER BY priority_level DESC LIMIT 1';
    db.query(findPolice, (err, policeResult) => {
        const policeId = policeResult && policeResult.length > 0 ? policeResult[0].service_id : 1;
        
        // Record emergency call
        const recordEmergency = `
            INSERT INTO call_history 
            (user_id, service_id, call_type, call_status, user_location_lat, user_location_lng, call_time) 
            VALUES (?, ?, 'emergency', 'initiated', ?, ?, NOW())
        `;
        
        db.query(recordEmergency, [req.user.user_id, policeId, user_lat, user_lng], (err, result) => {
            if (err) {
                console.error('Emergency call error:', err);
                return res.status(500).json({ error: 'Failed to record emergency' });
            }
            
            // Deduct emergency call cost
            const emergencyCost = 50;
            const updateCoins = 'UPDATE users SET coin_balance = coin_balance - ? WHERE user_id = ?';
            db.query(updateCoins, [emergencyCost, req.user.user_id], (err) => {
                res.json({ 
                    success: true, 
                    message: 'Emergency alert sent!',
                    coins_spent: emergencyCost,
                    call_id: result.insertId
                });
            });
        });
    });
});

// === HISTORY AND MESSAGING ===

app.get('/api/history', authenticateToken, (req, res) => {
    // FIXED: Use emergency_services table in JOIN
    const query = `
        SELECT 
            ch.call_id,
            ch.call_type,
            ch.call_status,
            ch.call_time,
            ch.call_duration,
            es.service_name,
            es.phone_number,
            es.category
        FROM call_history ch 
        JOIN emergency_services es ON ch.service_id = es.service_id 
        WHERE ch.user_id = ? 
        ORDER BY ch.call_time DESC
        LIMIT 50
    `;
    
    db.query(query, [req.user.user_id], (err, result) => {
        if (err) {
            console.error('Get history error:', err);
            return res.status(500).json({ error: 'Failed to get call history' });
        }
        res.json(result);
    });
});

app.post('/api/messages', authenticateToken, (req, res) => {
    const { receiver_id, service_id, message_text, message_type, is_emergency } = req.body;
    
    db.query(
        'INSERT INTO messages (sender_id, receiver_id, service_id, message_text, message_type, is_emergency) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.user_id, receiver_id, service_id, message_text, message_type || 'text', is_emergency || false],
        (err, result) => {
            if (err) {
                console.error('Message error:', err);
                return res.status(500).json({ error: 'Failed to send message' });
            }
            res.json({ success: true, message_id: result.insertId });
        }
    );
});

app.post('/api/share-location', authenticateToken, (req, res) => {
    const { lat, lng, service_id } = req.body;
    
    // Update user location if location columns exist
    db.query(
        'UPDATE users SET location_lat = ?, location_lng = ? WHERE user_id = ?',
        [lat, lng, req.user.user_id],
        (err) => {
            if (err) {
                console.log('Location update failed (table may not have location columns):', err.message);
            }
            
            // Send location as emergency message if service_id provided
            if (service_id) {
                db.query(
                    'INSERT INTO messages (sender_id, service_id, message_text, message_type, is_emergency) VALUES (?, ?, ?, ?, ?)',
                    [req.user.user_id, service_id, `Emergency location: ${lat}, ${lng}`, 'location', true],
                    (err) => {
                        if (err) console.log('Location message failed:', err.message);
                    }
                );
            }
            
            res.json({ success: true, message: 'Location shared successfully' });
        }
    );
});

// === ADMIN ENDPOINTS ===

app.post('/api/admin/services', authenticateToken, requireAdmin, (req, res) => {
    const { service_name, service_description, phone_number, category, priority_level } = req.body;
    
    // FIXED: Use emergency_services table
    db.query(
        'INSERT INTO emergency_services (service_name, service_description, phone_number, category, priority_level, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [service_name, service_description, phone_number, category, priority_level || 1, req.user.user_id],
        (err, result) => {
            if (err) {
                console.error('Add service error:', err);
                return res.status(500).json({ error: 'Failed to add service' });
            }
            res.json({ success: true, service_id: result.insertId });
        }
    );
});

app.put('/api/admin/services/:id', authenticateToken, requireAdmin, (req, res) => {
    const { service_name, service_description, phone_number, category, is_active, priority_level } = req.body;
    
    // FIXED: Use emergency_services table
    db.query(
        'UPDATE emergency_services SET service_name = ?, service_description = ?, phone_number = ?, category = ?, is_active = ?, priority_level = ? WHERE service_id = ?',
        [service_name, service_description, phone_number, category, is_active !== undefined ? is_active : 1, priority_level || 1, req.params.id],
        (err) => {
            if (err) {
                console.error('Update service error:', err);
                return res.status(500).json({ error: 'Failed to update service' });
            }
            res.json({ success: true });
        }
    );
});

// Reset endpoint (useful for testing)
app.post('/api/reset', authenticateToken, (req, res) => {
    const resetUser = 'UPDATE users SET coin_balance = 100, love_count = 0, copy_count = 0 WHERE user_id = ?';
    db.query(resetUser, [req.user.user_id], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Reset failed' });
        }
        
        const clearHistory = 'DELETE FROM call_history WHERE user_id = ?';
        db.query(clearHistory, [req.user.user_id], (err) => {
            res.json({ success: true, message: 'User data reset successfully' });
        });
    });
});

// Logout endpoint
app.post('/api/logout', authenticateToken, (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Emergency Hotline API is ready!');
});