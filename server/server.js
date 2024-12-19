const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

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
            res.status(200).json({ message: "Data received and file uploaded successfully!" });
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
