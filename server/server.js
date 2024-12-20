const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const PORT = process.env.PORT || 3000;
const app = express();

// Başvuruları saklayacağımız dosya yolu
const submissionsFile = path.join(__dirname, "submissions.json");

// Static dosya sunumu
app.use(express.static(path.join(__dirname, "../webui")));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dosya yükleme için multer yapılandırması
const upload = multer({
    limits: { fileSize: 5 * 1024 * 1024 },
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            const jobFolder = path.join(__dirname, "uploads", req.body.position);
            if (!fs.existsSync(jobFolder)) {
                fs.mkdirSync(jobFolder, { recursive: true }); // Klasörü oluştur
            }
            cb(null, jobFolder); // Hedef klasör
        },
        filename: function (req, file, cb) {
            const uniqueName = `${file.originalname}`;
            cb(null, uniqueName); // Benzersiz dosya adı
        },
    }),
});

// Ana sayfa
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../webui", "index.html"));
});

// E-posta gönderme fonksiyonu
function sendEmail(toEmail, fullName, position, err) {
    if (err) {
        console.error("Ethereal hesap oluşturulamadı:", err);
        return;
    }
    const account = nodemailer.createTestAccount();
    // SMTP transporter ayarları
    const transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // TLS kullanımı
        auth: {
            user: 'amalia.connelly33@ethereal.email',
            pass: '9jqsYJ2ygaEtQA2Fxe'
        },
    });


    // E-posta içeriği
    const mailOptions = {
        from: '"Test Gönderen" <test@example.com>', // Gönderen
        to: toEmail,                 // Alıcı
        subject: "Ethereal Test E-postası", // Konu
        text: `Dear ${fullName},\n\nYour application for the position "${position}" has been received. We will get back to you as soon as possible.\n\nBest regards,\nERA RF TECHNOLOGİES`, // Mesaj içeriği
    };

    // E-postayı gönder
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error("Error sending email:", error);
        } else {
            console.log("E-posta başarıyla gönderildi:", info.messageId);

            // Ethereal'da e-postayı görüntülemek için önizleme URL'si
            console.log("E-postayı görüntüleyin:", nodemailer.getTestMessageUrl(info));
        }
    });
}

// Başvuru kontrolü ve form verilerini işleme
app.post("/submit", upload.single("cvFile"), (req, res) => {
    const { fullName, email, position } = req.body; // Form verileri
    const filePath = req.file ? req.file.path : null; // Dosya yolu

    // Başvuruları JSON dosyasından oku
    fs.readFile(submissionsFile, "utf8", (err, data) => {
        if (err && err.code !== "ENOENT") {
            return res.status(500).json({ message: "Error reading submission data" });
        }

        let submissions = [];
        if (data) {
            submissions = JSON.parse(data); // JSON verisini oku
        }

        // Aynı e-posta ve meslekle başvuru yapılmış mı kontrol et
        const existingSubmission = submissions.find(
            (submission) => submission.email === email && submission.position === position
        );

        if (existingSubmission) {
            return res.status(400).json({ message: "You have already submitted a form for this position !" });
        }

        // Yeni başvuruyu JSON'a ekle
        const newSubmission = { fullName, email, position, filePath };
        submissions.push(newSubmission);

        // Yeni başvuruları JSON dosyasına kaydet
        fs.writeFile(submissionsFile, JSON.stringify(submissions, null, 2), "utf8", (writeErr) => {
            if (writeErr) {
                return res.status(500).json({ message: "Error saving submission data" });
            }

            console.log("Received data:", { fullName, email, position, filePath });

            // E-posta gönder
            sendEmail(email, fullName, position);

            res.status(200).json({ message: "Your application has been received successfully." });
        });
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
