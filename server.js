const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Konfigurasi Multer Upload Bukti TF
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'bukti_' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Middleware Setup
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'zkstore_super_secret_2026',
    resave: true,
    saveUninitialized: true
}));

// Setup Database SQLite Lokal
const dbFile = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbFile, (err) => {
    if (err) console.error('Gagal koneksi database:', err.message);
    else console.log('Connected to SQLite Database.');
});

// Inisialisasi Tabel Database Otomatis
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price INTEGER NOT NULL,
        status TEXT DEFAULT 'Ready',
        description TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        buyer_name TEXT NOT NULL,
        buyer_whatsapp TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        proof_image TEXT,
        status TEXT DEFAULT 'Pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES products(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`, async () => {
        db.get(`SELECT * FROM admins WHERE username = 'admin'`, async (err, row) => {
            if (!row) {
                const hashedPassword = await bcrypt.hash('password123', 10);
                db.run(`INSERT INTO admins (username, password) VALUES ('admin', ?)`, [hashedPassword]);
            }
        });
    });
});

/* ==========================================
   ROUTE PEMBELI (STOREFRONT)
   ========================================== */

app.get('/', (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, products) => {
        if (err) products = [];
        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head>
                <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>ZK STORE - Premium Apps</title>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
            </head>
            <body class="bg-[#0b0914] text-gray-100 min-h-screen">
                <nav class="bg-[#131022]/90 backdrop-blur-md border-b border-purple-900/40 p-4 sticky top-0 z-50 flex justify-between items-center px-6">
                    <h1 class="text-xl font-extrabold tracking-wider bg-gradient-to-r from-purple-400 via-yellow-200 to-yellow-500 bg-clip-text text-transparent">⚡ ZK STORE</h1>
                    <div><a href="/admin/login" class="text-xs bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-yellow-300 px-4 py-2 rounded-xl font-semibold shadow-md transition">Login Admin</a></div>
                </nav>

                <div class="max-w-6xl mx-auto p-6">
                    <div class="bg-gradient-to-r from-[#1d1436] via-[#2a1b4e] to-[#1d1436] border border-purple-500/20 p-8 rounded-3xl mb-10 text-center shadow-2xl relative overflow-hidden">
                        <span class="text-xs font-bold tracking-widest bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full uppercase">Official Digital Store</span>
                        <h2 class="text-3xl sm:text-4xl font-black mt-3 mb-2 text-white">Jual Beli Akun & Aplikasi Premium</h2>
                        <p class="text-purple-200/80 text-sm sm:text-base">Netflix, Canva Pro, CapCut VIP, Spotify, dan lainnya bergaransi resmi!</p>
                    </div>

                    <h3 class="text-xl font-bold mb-6 text-purple-200 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-yellow-400"></span> Katalog Produk Tersedia
                    </h3>

                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        ${products.length === 0 ? '<p class="text-gray-400 col-span-3 text-center py-10">Belum ada produk tersedia.</p>' : 
                            products.map(p => `
                                <div class="bg-[#131022] border border-purple-900/50 hover:border-yellow-500/50 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-300">
                                    <div>
                                        <div class="flex justify-between items-center mb-3">
                                            <span class="text-[10px] bg-purple-900/60 text-purple-300 px-3 py-1 rounded-full uppercase font-bold border border-purple-700/30">${p.category}</span>
                                            <span class="text-xs px-2.5 py-0.5 rounded-full font-bold ${p.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'}">${p.status}</span>
                                        </div>
                                        <h4 class="text-lg font-extrabold text-white mb-2">${p.name}</h4>
                                        <p class="text-gray-400 text-xs leading-relaxed mb-4">${p.description || 'Tanpa deskripsi'}</p>
                                    </div>
                                    <div>
                                        <div class="mb-4 pt-3 border-t border-purple-900/40 flex justify-between items-center">
                                            <span class="text-xs text-gray-400">Harga:</span>
                                            <span class="text-yellow-400 font-black text-lg">Rp ${p.price.toLocaleString('id-ID')}</span>
                                        </div>
                                        ${p.status === 'Ready' ? 
                                            `<a href="/checkout/${p.id}" class="block text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transition text-sm">Beli Sekarang</a>` :
                                            `<button disabled class="block w-full bg-gray-800 text-gray-500 font-bold py-3 rounded-xl text-sm cursor-not-allowed">Stok Habis</button>`
                                        }
                                    </div>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </body>
            </html>
        `);
    });
});

app.get('/checkout/:id', (req, res) => {
    const productId = req.params.id;
    db.get(`SELECT * FROM products WHERE id = ?`, [productId], (err, product) => {
        if (!product || product.status !== 'Ready') return res.redirect('/');
        res.send(`
            <!DOCTYPE html>
            <html lang="id">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Checkout - ${product.name}</title><script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style></head>
            <body class="bg-[#0b0914] text-gray-100 p-6 min-h-screen flex items-center justify-center">
                <div class="w-full max-w-md bg-[#131022] border border-purple-900/60 p-8 rounded-3xl shadow-2xl">
                    <h2 class="text-2xl font-black mb-2 text-white">Form Checkout</h2>
                    <div class="bg-[#0b0914] p-4 rounded-2xl mb-6 border border-purple-900/40">
                        <p class="font-bold text-sm text-white">${product.name}</p>
                        <p class="text-yellow-400 font-extrabold text-lg mt-1">Rp ${product.price.toLocaleString('id-ID')}</p>
                    </div>
                    <form action="/order/submit" method="POST" class="space-y-4">
                        <input type="hidden" name="product_id" value="${product.id}">
                        <div><label class="block text-xs font-semibold text-purple-300 mb-1">Nama Lengkap</label><input type="text" name="buyer_name" required class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></div>
                        <div><label class="block text-xs font-semibold text-purple-300 mb-1">Nomor WhatsApp Aktif</label><input type="text" name="buyer_whatsapp" required placeholder="08xxxxxxxxxx" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></div>
                        <input type="hidden" name="payment_method" value="QRIS DANA (premium zakky)">
                        <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg mt-2">Lanjut ke Halaman QRIS & Pembayaran</button>
                        <a href="/" class="block text-center text-xs text-gray-400 mt-4">Kembali</a>
                    </form>
                </div>
            </body></html>
        `);
    });
});

app.post('/order/submit', (req, res) => {
    const { product_id, buyer_name, buyer_whatsapp, payment_method } = req.body;
    db.run(`INSERT INTO orders (product_id, buyer_name, buyer_whatsapp, payment_method) VALUES (?, ?, ?, ?)`,
        [product_id, buyer_name, buyer_whatsapp, payment_method], function(err) {
            if (err) return res.status(500).send("Gagal membuat pesanan.");
            const orderId = this.lastID;
            res.send(`
                <!DOCTYPE html>
                <html lang="id">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>QRIS Pembayaran</title><script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style></head>
                <body class="bg-[#0b0914] text-gray-100 p-6 min-h-screen flex items-center justify-center">
                    <div class="w-full max-w-md bg-[#131022] border border-purple-900/60 p-8 rounded-3xl shadow-2xl text-center">
                        <span class="text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full uppercase font-bold">ID Transaksi: #${orderId}</span>
                        <h2 class="text-xl font-black text-white mt-3 mb-1">Scan QRIS Pembayaran</h2>
                        <p class="text-xs text-purple-300 mb-6">Merchant: <b class="text-yellow-400">premium zakky</b> (NMID: ID1026492470939)</p>

                        <!-- MENGGUNAKAN GAMBAR QRIS ASLI (/qris.jpg) -->
                        <div class="bg-[#0b0914] border border-purple-900/60 p-4 rounded-2xl mb-6 text-center shadow-inner flex justify-center">
                            <div class="bg-white p-2 rounded-xl shadow-md inline-block">
                                <img src="/qris.jpg" alt="QRIS Premium Zakky" class="w-56 h-auto mx-auto rounded-lg object-contain">
                            </div>
                        </div>

                        <form action="/order/confirm-upload/${orderId}" method="POST" enctype="multipart/form-data" class="space-y-4 text-left">
                            <div>
                                <label class="block text-xs font-semibold text-yellow-300 mb-1">Upload Bukti Foto Transfer:</label>
                                <input type="file" name="proof_image" accept="image/*" required class="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-900 file:text-purple-200 cursor-pointer bg-[#0b0914] border border-purple-900/60 rounded-xl p-2">
                            </div>
                            <button type="submit" class="w-full bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold py-3 rounded-xl transition text-sm shadow-lg">Kirim Konfirmasi "Saya Sudah Bayar"</button>
                        </form>
                        <a href="/" class="block text-xs text-gray-400 mt-4">Kembali ke Beranda</a>
                    </div>
                </body></html>
            `);
        }
    );
});

app.post('/order/confirm-upload/:id', upload.single('proof_image'), (req, res) => {
    const orderId = req.params.id;
    const proofImage = req.file ? req.file.filename : null;
    db.run(`UPDATE orders SET proof_image = ?, status = 'Pending' WHERE id = ?`, [proofImage, orderId], () => {
        res.send(`
            <!DOCTYPE html><html lang="id"><head><script src="https://cdn.tailwindcss.com"></script></head>
            <body class="bg-[#0b0914] text-gray-100 p-6 min-h-screen flex items-center justify-center font-sans">
                <div class="w-full max-w-md bg-[#131022] border border-purple-900/60 p-8 rounded-3xl shadow-2xl text-center">
                    <h2 class="text-2xl font-black text-white mb-2">Konfirmasi Terkirim!</h2>
                    <p class="text-xs text-purple-300 mb-6">Bukti transfer sudah diterima admin.</p>
                    <a href="/" class="block bg-purple-600 text-white font-bold py-3 rounded-xl text-sm">Kembali ke Toko</a>
                </div>
            </body></html>
        `);
    });
});


/* ==========================================
   ROUTE PANEL ADMIN
   ========================================== */

function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.redirect('/admin/login');
}

app.get('/admin/login', (req, res) => {
    res.send(`
        <!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Login Admin</title><script src="https://cdn.tailwindcss.com"></script></head>
        <body class="bg-[#0b0914] text-gray-100 flex items-center justify-center h-screen font-sans">
            <div class="w-full max-w-sm bg-[#131022] border border-purple-900/60 p-8 rounded-3xl shadow-2xl">
                <h2 class="text-2xl font-black mb-6 text-yellow-400 text-center">Panel Admin</h2>
                <form action="/admin/login" method="POST" class="space-y-4">
                    <div><label class="block text-xs text-purple-300 mb-1">Username</label><input type="text" name="username" required class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-400"></div>
                    <div><label class="block text-xs text-purple-300 mb-1">Password</label><input type="password" name="password" required class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-yellow-400"></div>
                    <button type="submit" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg">Masuk</button>
                </form>
            </div>
        </body></html>
    `);
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM admins WHERE username = ?`, [username], async (err, admin) => {
        if (err || !admin) {
            return res.send("<script>alert('Login Gagal! Username tidak ditemukan.'); window.location='/admin/login';</script>");
        }
        
        const match = await bcrypt.compare(password, admin.password);
        if (match) {
            req.session.isAdmin = true;
            req.session.save(() => {
                res.redirect('/admin/dashboard');
            });
        } else {
            res.send("<script>alert('Login Gagal! Password salah.'); window.location='/admin/login';</script>");
        }
    });
});

app.get('/admin/dashboard', requireAuth, (req, res) => {
    db.all(`SELECT * FROM products ORDER BY id DESC`, [], (err, products) => {
        if (err) products = [];

        db.all(`SELECT orders.*, products.name as product_name, products.price as product_price FROM orders JOIN products ON orders.product_id = products.id WHERE orders.status != 'Selesai' ORDER BY orders.id DESC`, [], (err, activeOrders) => {
            if (err) activeOrders = [];

            db.all(`SELECT orders.*, products.name as product_name, products.price as product_price FROM orders JOIN products ON orders.product_id = products.id WHERE orders.status = 'Selesai' ORDER BY orders.id DESC`, [], (err, completedOrders) => {
                if (err) completedOrders = [];
                
                let totalOmzet = completedOrders.reduce((sum, o) => sum + (o.product_price || 0), 0);

                res.send(`
                    <!DOCTYPE html>
                    <html lang="id">
                    <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Dashboard Admin</title><script src="https://cdn.tailwindcss.com"></script></head>
                    <body class="bg-[#0b0914] text-gray-100 font-sans p-6">
                        <div class="max-w-6xl mx-auto space-y-8">
                            <div class="flex justify-between items-center bg-[#131022] p-6 rounded-3xl border border-purple-900/50 shadow-2xl">
                                <div><h2 class="text-2xl font-black text-white">Dashboard <span class="text-yellow-400">ZK Store</span></h2></div>
                                <div class="space-x-3">
                                    <a href="/" target="_blank" class="bg-purple-950 px-4 py-2 rounded-xl text-xs font-semibold text-yellow-300">Lihat Toko</a>
                                    <a href="/admin/logout" class="bg-red-950 px-4 py-2 rounded-xl text-xs font-semibold text-red-300">Logout</a>
                                </div>
                            </div>

                            <div class="bg-gradient-to-r from-purple-900/40 via-[#131022] to-indigo-900/40 border border-purple-500/30 p-6 rounded-3xl shadow-xl flex justify-between items-center">
                                <div>
                                    <p class="text-xs uppercase tracking-widest text-purple-300 font-bold">Total Uang Masuk (Pesanan Selesai)</p>
                                    <h3 class="text-3xl font-black text-yellow-400 mt-1">Rp ${totalOmzet.toLocaleString('id-ID')}</h3>
                                </div>
                                <div class="text-xs text-gray-400 text-right"><p>Total Selesai: <b class="text-white">${completedOrders.length} Pesanan</b></p></div>
                            </div>

                            <div class="bg-[#131022] border border-purple-900/50 p-6 rounded-3xl shadow-2xl">
                                <h3 class="text-lg font-bold mb-4 text-yellow-400">Tambah Produk Baru</h3>
                                <form action="/admin/product/add" method="POST" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label class="block text-xs text-purple-300 mb-1">Nama Produk</label><input type="text" name="name" required placeholder="Netflix 1 Bulan" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></div>
                                    <div><label class="block text-xs text-purple-300 mb-1">Kategori</label><input type="text" name="category" required placeholder="Streaming" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></div>
                                    <div><label class="block text-xs text-purple-300 mb-1">Harga (Rp)</label><input type="number" name="price" required placeholder="35000" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></div>
                                    <div>
                                        <label class="block text-xs text-purple-300 mb-1">Status Ketersediaan</label>
                                        <select name="status" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white">
                                            <option value="Ready">Ready</option>
                                            <option value="Habis">Habis</option>
                                        </select>
                                    </div>
                                    <div class="sm:col-span-2"><label class="block text-xs text-purple-300 mb-1">Deskripsi Produk</label><textarea name="description" rows="2" class="w-full bg-[#0b0914] border border-purple-900/60 rounded-xl p-3 text-sm text-white"></textarea></div>
                                    <div class="sm:col-span-2"><button type="submit" class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-6 rounded-xl text-sm shadow-lg">Simpan Produk</button></div>
                                </form>
                            </div>

                            <div class="bg-[#131022] border border-purple-900/50 p-6 rounded-3xl shadow-2xl">
                                <h3 class="text-lg font-bold mb-4 text-yellow-400">Kelola Katalog Produk</h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs text-gray-300">
                                        <thead class="bg-[#0b0914] text-purple-300 uppercase">
                                            <tr><th class="p-3">Nama</th><th class="p-3">Kategori</th><th class="p-3">Harga</th><th class="p-3">Status</th><th class="p-3">Aksi</th></tr>
                                        </thead>
                                        <tbody class="divide-y divide-purple-950">
                                            ${products.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum ada produk.</td></tr>' :
                                                products.map(p => `
                                                    <tr>
                                                        <td class="p-3 font-bold text-white">${p.name}</td>
                                                        <td class="p-3">${p.category}</td>
                                                        <td class="p-3 text-yellow-400 font-bold">Rp ${p.price.toLocaleString('id-ID')}</td>
                                                        <td class="p-3"><span class="px-2 py-0.5 rounded font-bold ${p.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}">${p.status}</span></td>
                                                        <td class="p-3"><a href="/admin/product/delete/${p.id}" onclick="return confirm('Hapus produk ini?')" class="text-red-400 hover:underline">Hapus</a></td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="bg-[#131022] border border-purple-900/50 p-6 rounded-3xl shadow-2xl">
                                <h3 class="text-lg font-bold mb-4 text-yellow-400">Verifikasi Pesanan Masuk & Bukti TF</h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs text-gray-300">
                                        <thead class="bg-[#0b0914] text-purple-300 uppercase">
                                            <tr><th class="p-3">ID</th><th class="p-3">Pembeli</th><th class="p-3">WhatsApp</th><th class="p-3">Produk</th><th class="p-3">Bukti TF</th><th class="p-3">Status</th><th class="p-3">Aksi</th></tr>
                                        </thead>
                                        <tbody class="divide-y divide-purple-950">
                                            ${activeOrders.length === 0 ? '<tr><td colspan="7" class="p-4 text-center text-gray-400">Tidak ada pesanan aktif.</td></tr>' : 
                                                activeOrders.map(o => `
                                                    <tr>
                                                        <td class="p-3 font-mono">#${o.id}</td>
                                                        <td class="p-3 font-bold text-white">${o.buyer_name}</td>
                                                        <td class="p-3"><a href="https://wa.me/${o.buyer_whatsapp}" target="_blank" class="text-emerald-400 font-semibold">${o.buyer_whatsapp}</a></td>
                                                        <td class="p-3">${o.product_name}</td>
                                                        <td class="p-3">${o.proof_image ? `<a href="/uploads/${o.proof_image}" target="_blank" class="text-yellow-400 underline font-bold">Lihat Foto</a>` : 'Belum Upload'}</td>
                                                        <td class="p-3"><span class="px-2 py-0.5 rounded font-bold bg-yellow-500/10 text-yellow-400">${o.status}</span></td>
                                                        <td class="p-3 space-x-1">
                                                            <a href="/admin/order/process/${o.id}" class="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">Proses</a>
                                                            <a href="/admin/order/finish/${o.id}" class="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-bold">Selesai</a>
                                                        </td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="bg-[#131022] border border-purple-900/50 p-6 rounded-3xl shadow-2xl">
                                <h3 class="text-lg font-bold mb-4 text-emerald-400">Riwayat Pesanan Selesai</h3>
                                <div class="overflow-x-auto">
                                    <table class="w-full text-left text-xs text-gray-300">
                                        <thead class="bg-[#0b0914] text-purple-300 uppercase">
                                            <tr><th class="p-3">ID</th><th class="p-3">Pembeli</th><th class="p-3">Produk</th><th class="p-3">Harga</th><th class="p-3">Waktu</th></tr>
                                        </thead>
                                        <tbody class="divide-y divide-purple-950">
                                            ${completedOrders.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-gray-400">Belum ada pesanan selesai.</td></tr>' : 
                                                completedOrders.map(o => `
                                                    <tr>
                                                        <td class="p-3 font-mono">#${o.id}</td>
                                                        <td class="p-3 font-bold text-white">${o.buyer_name}</td>
                                                        <td class="p-3">${o.product_name}</td>
                                                        <td class="p-3 text-yellow-400 font-bold">Rp ${o.product_price.toLocaleString('id-ID')}</td>
                                                        <td class="p-3 text-gray-400">${o.created_at}</td>
                                                    </tr>
                                                `).join('')
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </body></html>
                `);
            });
        });
    });
});

app.post('/admin/product/add', requireAuth, (req, res) => {
    const { name, category, price, status, description } = req.body;
    db.run(`INSERT INTO products (name, category, price, status, description) VALUES (?, ?, ?, ?, ?)`,
        [name, category, parseInt(price) || 0, status || 'Ready', description || ''], 
        (err) => {
            if (err) console.error("Gagal tambah produk:", err.message);
            res.redirect('/admin/dashboard');
        }
    );
});

app.get('/admin/order/process/:id', requireAuth, (req, res) => {
    db.run(`UPDATE orders SET status = 'Diproses' WHERE id = ?`, [req.params.id], () => res.redirect('/admin/dashboard'));
});

app.get('/admin/order/finish/:id', requireAuth, (req, res) => {
    db.run(`UPDATE orders SET status = 'Selesai' WHERE id = ?`, [req.params.id], () => res.redirect('/admin/dashboard'));
});

app.get('/admin/product/delete/:id', requireAuth, (req, res) => {
    db.run(`DELETE FROM products WHERE id = ?`, [req.params.id], () => res.redirect('/admin/dashboard'));
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/admin/login'));
});

app.listen(PORT, () => {
    console.log(`🚀 ZK Store aktif di http://localhost:${PORT}`);
});
