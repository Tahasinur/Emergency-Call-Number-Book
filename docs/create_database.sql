CREATE TABLE Users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Emergency_Contacts: stores emergency services and phone numbers
CREATE TABLE Emergency_Contacts (
    contact_id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    category VARCHAR(100),
    description VARCHAR(255),
    image_path VARCHAR(500),
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat_Sessions: active/archived chat sessions between users and helpers
CREATE TABLE Chat_Sessions (
                session_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                helper_id INTEGER,
                status VARCHAR(50) DEFAULT 'waiting',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
                FOREIGN KEY (helper_id) REFERENCES Users(user_id) ON DELETE SET NULL
            );

-- Chat_Messages: messages posted within a chat session
CREATE TABLE Chat_Messages (
                message_id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES Chat_Sessions(session_id) ON DELETE CASCADE,
                FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE
            );


-- Contact_Favorites: user's saved favorite contacts
CREATE TABLE Contact_Favorites (
    favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES Emergency_Contacts(contact_id) ON DELETE CASCADE,
    UNIQUE(user_id, contact_id)
);

-- Contact_Reviews: user ratings/comments for emergency contacts
CREATE TABLE Contact_Reviews (
    review_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES Emergency_Contacts(contact_id) ON DELETE CASCADE
);

-- Emergency_Reports: incident reports submitted by users
CREATE TABLE Emergency_Reports (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    incident_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES Emergency_Contacts(contact_id) ON DELETE CASCADE
);

-- Notifications: messages shown to users (in-app)
CREATE TABLE Notifications (
    notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type VARCHAR(50),
    title VARCHAR(255),
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Support_Tickets: user support requests and their status
CREATE TABLE Support_Tickets (
    ticket_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    subject VARCHAR(255),
    status VARCHAR(100) DEFAULT 'open',
    priority VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- User_Sessions: login/logout records and IP addresses
CREATE TABLE User_Sessions (
    session_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    logout_time DATETIME,
    ip_address VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
);

-- Audit_Logs: lightweight audit trail for user actions (nullable user_id)
CREATE TABLE Audit_Logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action_type VARCHAR(100),
    table_name VARCHAR(100),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

-- System_Settings: key/value configuration editable via admin UI
CREATE TABLE System_Settings (
    setting_id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value VARCHAR(255),
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES Users(user_id) ON DELETE SET NULL
);


-- Call_History: records phone call events between users and emergency contacts or helpers
CREATE TABLE Call_History (
    call_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    contact_id INTEGER,
    helper_id INTEGER,
    caller_number VARCHAR(100),
    receiver_number VARCHAR(100),
    start_time DATETIME,
    end_time DATETIME,
    duration_seconds INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES Emergency_Contacts(contact_id) ON DELETE SET NULL,
    FOREIGN KEY (helper_id) REFERENCES Users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_call_history_user ON Call_History(user_id);
CREATE INDEX idx_call_history_contact ON Call_History(contact_id);
CREATE INDEX idx_call_history_helper ON Call_History(helper_id);
CREATE INDEX idx_call_history_created ON Call_History(created_at DESC);


-- =========================
-- Indexes: improve query performance on common lookups
-- =========================
CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);
CREATE INDEX idx_users_active ON Users(is_active);

CREATE INDEX idx_emergency_contacts_category ON Emergency_Contacts(category);
CREATE INDEX idx_emergency_contacts_active ON Emergency_Contacts(is_active);

CREATE INDEX idx_chat_sessions_user ON Chat_Sessions(user_id);
CREATE INDEX idx_chat_sessions_helper ON Chat_Sessions(helper_id);
CREATE INDEX idx_chat_sessions_status ON Chat_Sessions(status);
CREATE INDEX idx_chat_sessions_updated ON Chat_Sessions(updated_at DESC);
CREATE INDEX idx_chat_sessions_status_updated ON Chat_Sessions(status, updated_at DESC);

CREATE INDEX idx_chat_messages_session ON Chat_Messages(session_id);
CREATE INDEX idx_chat_messages_sender ON Chat_Messages(sender_id);
CREATE INDEX idx_chat_messages_created ON Chat_Messages(created_at DESC);
CREATE INDEX idx_chat_messages_session_created ON Chat_Messages(session_id, created_at DESC);


--

-- Contact favorites indexes
CREATE INDEX idx_contact_favorites_user ON Contact_Favorites(user_id);
CREATE INDEX idx_contact_favorites_contact ON Contact_Favorites(contact_id);

-- Contact reviews indexes
CREATE INDEX idx_contact_reviews_user ON Contact_Reviews(user_id);
CREATE INDEX idx_contact_reviews_contact ON Contact_Reviews(contact_id);

-- Emergency reports indexes
CREATE INDEX idx_emergency_reports_user ON Emergency_Reports(user_id);
CREATE INDEX idx_emergency_reports_status ON Emergency_Reports(status);

-- Notifications indexes
CREATE INDEX idx_notifications_user ON Notifications(user_id);
CREATE INDEX idx_notifications_read ON Notifications(is_read);

-- Support tickets indexes
CREATE INDEX idx_support_tickets_user ON Support_Tickets(user_id);
CREATE INDEX idx_support_tickets_status ON Support_Tickets(status);

-- User sessions indexes
CREATE INDEX idx_user_sessions_user ON User_Sessions(user_id);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_user ON Audit_Logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON Audit_Logs(timestamp);

-- ============================================
-- TRIGGERS (Auto-update timestamps)
-- ============================================

CREATE TRIGGER update_users_timestamp
AFTER UPDATE ON Users
FOR EACH ROW
BEGIN
    UPDATE Users SET updated_at = CURRENT_TIMESTAMP WHERE user_id = NEW.user_id;
END;

CREATE TRIGGER update_emergency_contacts_timestamp
AFTER UPDATE ON Emergency_Contacts
FOR EACH ROW
BEGIN
    UPDATE Emergency_Contacts SET updated_at = CURRENT_TIMESTAMP WHERE contact_id = NEW.contact_id;
END;

CREATE TRIGGER update_chat_sessions_timestamp
            AFTER UPDATE ON Chat_Sessions
            FOR EACH ROW
            BEGIN
                UPDATE Chat_Sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = NEW.session_id;
            END;

--

CREATE TRIGGER update_contact_favorites_timestamp
AFTER UPDATE ON Contact_Favorites
FOR EACH ROW
BEGIN
    UPDATE Contact_Favorites SET updated_at = CURRENT_TIMESTAMP WHERE favorite_id = NEW.favorite_id;
END;

CREATE TRIGGER update_contact_reviews_timestamp
AFTER UPDATE ON Contact_Reviews
FOR EACH ROW
BEGIN
    UPDATE Contact_Reviews SET updated_at = CURRENT_TIMESTAMP WHERE review_id = NEW.review_id;
END;

CREATE TRIGGER update_emergency_reports_timestamp
AFTER UPDATE ON Emergency_Reports
FOR EACH ROW
BEGIN
    UPDATE Emergency_Reports SET updated_at = CURRENT_TIMESTAMP WHERE report_id = NEW.report_id;
END;

CREATE TRIGGER update_notifications_timestamp
AFTER UPDATE ON Notifications
FOR EACH ROW
BEGIN
    UPDATE Notifications SET updated_at = CURRENT_TIMESTAMP WHERE notification_id = NEW.notification_id;
END;

CREATE TRIGGER update_support_tickets_timestamp
AFTER UPDATE ON Support_Tickets
FOR EACH ROW
BEGIN
    UPDATE Support_Tickets SET updated_at = CURRENT_TIMESTAMP WHERE ticket_id = NEW.ticket_id;
END;

CREATE TRIGGER update_user_sessions_timestamp
AFTER UPDATE ON User_Sessions
FOR EACH ROW
BEGIN
    UPDATE User_Sessions SET updated_at = CURRENT_TIMESTAMP WHERE session_id = NEW.session_id;
END;

CREATE TRIGGER update_audit_logs_timestamp
AFTER UPDATE ON Audit_Logs
FOR EACH ROW
BEGIN
    UPDATE Audit_Logs SET updated_at = CURRENT_TIMESTAMP WHERE log_id = NEW.log_id;
END;

CREATE TRIGGER update_system_settings_timestamp
AFTER UPDATE ON System_Settings
FOR EACH ROW
BEGIN
    UPDATE System_Settings SET updated_at = CURRENT_TIMESTAMP WHERE setting_id = NEW.setting_id;
END;

-- ============================================
-- INITIAL DATA
-- ============================================

-- Insert default admin user (password: admin123)
INSERT INTO Users (username, email, password_hash, role) VALUES
('admin', 'admin@emergency.local', 'scrypt:32768:8:1$TYrl944XgHi9FYR6$b525ac1619e571fb0016ede2940e90a5afe2d75442bb4c23a41ef12e3c996aa25f4ef4f471ae16de4101b8d1ca4608f6df27f92b59b7052d19d4b19f24f14819', 'admin');

-- Insert emergency services
INSERT INTO Emergency_Contacts (service_name, phone_number, category, description) VALUES
('National Emergency Service', '999', 'All', 'General emergency hotline for all types of emergencies'),
('Fire Service', '16163', 'Fire', 'Fire department for fire-related emergencies'),
('Police Emergency', '999', 'Police', 'Police emergency services'),
('Ambulance Service', '199', 'Medical', 'Emergency medical and ambulance services'),
('Disaster Management', '16216', 'Disaster', 'Natural disaster and emergency response'),
('Women & Children Helpline', '109', 'Social', 'Support for women and children in distress'),
('Anti-Corruption Hotline', '106', 'Legal', 'Report corruption and illegal activities'),
('RAB Control Room', '16227', 'Police', 'Rapid Action Battalion emergency contact'),
('Poison Control', '16263', 'Medical', 'Emergency poison control and toxicology information');

