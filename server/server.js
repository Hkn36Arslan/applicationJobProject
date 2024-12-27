require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const mysql = require("mysql2");

const PORT = process.env.PORT || 3000;
const app = express();

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MySQL bağlantısı
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("MySQL connection error:", err);
  } else {
    console.log("Connected to MySQL database");
  }
});

// Static dosya sunumu
app.use(express.static(path.join(__dirname, "../webui")));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cloudinary için multer yapılandırması
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: (req, file) => {
      const sanitizedPosition = req.body.position
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .toLowerCase();
      return `job_applications/${sanitizedPosition}`;
    },
    allowed_formats: ["pdf"],
    public_id: (req, file) => {
      const uniqueId = uuidv4(); // Her dosya için benzersiz bir ID oluşturulur
      return `${req.body.position.replace(/\s+/g, "_").toLowerCase()}-${uniqueId}`;
    },
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimum dosya boyutu
});

// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../webui", "index.html"));
});

// E-posta gönderme fonksiyonu
function sendEmail(toEmail, fullName, position) {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: "amalia.connelly33@ethereal.email",
      pass: "9jqsYJ2ygaEtQA2Fxe",
    },
  });

  const mailOptions = {
    from: "info@erarf.com",
    to: toEmail,
    subject: "Ethereal Test E-postası",
    text: `Dear ${fullName},\n\nYour application for the position "${position}" has been received. We will get back to you as soon as possible.\n\nBest regards,\nERA RF TECHNOLOGİES`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending email:", error);
    } else {
      console.log("E-posta başarıyla gönderildi:", info.messageId);
      console.log(
        "E-postayı görüntüleyin:",
        nodemailer.getTestMessageUrl(info)
      );
    }
  });
}

// Başvuru kontrolü ve form verilerini işleme
app.post("/submit", upload.single("cvFile"), (req, res) => {
  const { fullName, email, position } = req.body;
  const filePath = req.file ? req.file.path : null; // Cloudinary'den gelen dosya yolu

  // Veritabanında aynı pozisyon ve e-posta ile başvuru olup olmadığını kontrol et
  const checkQuery = 'SELECT * FROM applications WHERE email = ? AND position = ?';
  db.execute(checkQuery, [email, position], (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error checking for existing submission." });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: "You have already submitted a form for this position!" });
    }

    // Veritabanına başvuru ekleme
    const insertQuery = 'INSERT INTO applications (fullName, email, position, filePath) VALUES (?, ?, ?, ?)';
    db.execute(insertQuery, [fullName, email, position, filePath], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Error saving submission to database." });
      }

      console.log("Received data:", { fullName, email, position, filePath });

      // E-posta gönderme
      sendEmail(email, fullName, position);

      res.status(200).json({
        message: "Your application has been received successfully.",
      });
    });
  });
});

// Başvuru Silme
app.delete("/delete", (req, res) => {
  const { email, position } = req.body;

  // Veritabanından başvuru silme
  const deleteQuery = 'DELETE FROM applications WHERE email = ? AND position = ?';
  db.execute(deleteQuery, [email, position], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Error deleting submission from database." });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Submission not found." });
    }

    // Cloudinary'den dosyayı silme işlemi
    cloudinary.uploader.destroy(req.body.publicId, (error, result) => {
      if (error) {
        console.error("Error deleting file from Cloudinary:", error);
      } else {
        console.log("File deleted from Cloudinary:", result);
      }
    });

    res.status(200).json({ message: "Submission deleted successfully." });
  });
});

// Sunucudan İş Başvurularını Alma
app.get("/submissions", (req, res) => {
  const query = 'SELECT * FROM applications';
  db.execute(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving submissions from database." });
    }
    res.status(200).json(results);
  });
});

// Sunucudan Adminleri Alma
app.get("/admin", (req, res) => {
  const query = 'SELECT * FROM admin';
  db.execute(query, (err, results) => {
    if (err) {
      return res.status(500).json({ message: "Error retrieving submissions from database." });
    }
    res.status(200).json(results);
  });
});



// Sunucuyu başlat
app.listen(PORT, (error) => {
  if (error) {
    console.error("Server error:", error);
  } else {
    console.log(`Server is running on port ${PORT}`);
  }
});
