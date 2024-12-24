require("dotenv").config();
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const nodemailer = require("nodemailer");
const cloudinary = require("cloudinary").v2;
const { v4: uuidv4 } = require("uuid");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const PORT = process.env.PORT || 3000;
const app = express();

// Cloudinary yapılandırması
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Başvuruları saklayacağımız dosya yolu
const submissionsFile = path.join(__dirname, "submissions.json");

// Admin data
const adminData = path.join(__dirname, "data.json");

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

  fs.readFile(submissionsFile, "utf8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ message: "Error reading submission data" });
    }

    let submissions = [];
    if (data) {
      submissions = JSON.parse(data);
    }

    const existingSubmission = submissions.find(
      (submission) =>
        submission.email === email && submission.position === position
    );

    if (existingSubmission) {
      return res.status(400).json({
        message: "You have already submitted a form for this position!",
      });
    }

    const newSubmission = { fullName, email, position, filePath };
    submissions.push(newSubmission);

    fs.writeFile(
      submissionsFile,
      JSON.stringify(submissions, null, 2),
      "utf8",
      (writeErr) => {
        if (writeErr) {
          return res
            .status(500)
            .json({ message: "Error saving submission data" });
        }

        console.log("Received data:", { fullName, email, position, filePath });

        sendEmail(email, fullName, position);

        res.status(200).json({
          message: "Your application has been received successfully.",
        });
      }
    );
  });
});

//Başvuru Silme
app.delete("/delete", (req, res) => {
  const { email, position } = req.body;

  fs.readFile(submissionsFile, "utf-8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ message: "Error reading submissions." });
    }

    let submissions = data ? JSON.parse(data) : [];

    // Silinecek başvuruyu bul
    const index = submissions.findIndex(
      (submission) =>
        submission.email === email && submission.position === position
    );
    if (index === -1) {
      return res.status(404).json({ message: "Submission not found." });
    }

    const [deletedSubmission] = submissions.splice(index, 1);

    // Cloudinary'den dosyayı silmek için URL'den public_id almak
    if (deletedSubmission.filePath) {
      const fileUrl = deletedSubmission.filePath;

      // URL'den public_id'yi çıkar
      const pathParts = fileUrl.split('/image/upload/')[1]?.split('/');
      const publicId = pathParts.slice(2).join('/').split('.')[0]; // İkinci kısımdan başlayıp uzantıyı çıkarıyoruz

      console.log("publicId:::", publicId);

      cloudinary.api.resource(publicId, function (error, result) {
        if (error) {
          console.log('Error retrieving file:', error);
        } else {
          console.log('File details:', result);
        }
      });
      // Cloudinary'den dosyayı sil
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error("Error deleting file from Cloudinary:", error);
        } else {
          console.log("File deleted from Cloudinary:", result);
        }
      });
    }


    // submissions.json dosyasını güncelle
    fs.writeFile(
      submissionsFile,
      JSON.stringify(submissions, null, 2),
      "utf8",
      (writeErr) => {
        if (writeErr) {
          return res
            .status(500)
            .json({ message: "Error updating submissions file." });
        }

        res.status(200).json({ message: "Submission deleted successfully." });
      }
    );
  });
});




// Sunucudan İş Başvurularını Alma
app.get("/submissions", (req, res) => {
  fs.readFile(submissionsFile, "utf-8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ message: "Error reading submissions." });
    }

    const submissions = data ? JSON.parse(data) : [];
    res.status(200).json(submissions);
  });
});

// Admin data bilgilerini alma
app.get("/login", (req, res) => {
  fs.readFile(adminData, "utf-8", (err, data) => {
    if (err && err.code !== "ENOENT") {
      return res.status(500).json({ message: "Error reading submissions." });
    }
    const admin = data ? JSON.parse(data) : [];
    res.status(200).json(admin);
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
