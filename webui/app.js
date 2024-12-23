$(document).ready(function (event) {
  $("#form").on("submit", (e) => {
    e.preventDefault();

    // FormData oluşturma
    const formData = new FormData();
    formData.append("fullName", $("#fullname").val());
    formData.append("email", $("#email").val());
    formData.append("position", $("#select").val());
    formData.append("cvFile", $("#cvFile")[0].files[0]); // Dosyayı ekliyoruz

    // AJAX ile verileri gönder
    $.ajax({
      url: "/submit",
      type: "POST",
      data: formData,
      processData: false, // FormData ile gönderdiğimiz için kapalı
      contentType: false, // FormData ile gönderdiğimiz için kapalı
      success: (res) => {
        showAlert("success", res.message);
      },
      error: (xhr) => {
        const response = JSON.parse(xhr.responseText);
        showAlert(
          "danger",
          response.message || "An error occurred while submitting the form."
        );
      },
    });
  });
  /* ****************************************** ADMİN LOGİN ******************************************* */

  $("#adminLogin").on("submit", (e) => {
    e.preventDefault();

    console.log("username:", $("#username").val())
    console.log("password:", $("#password").val())
    console.log("typeOFusername:", typeof $("#username").val())
    console.log("typeOFpassword:", typeof $("#password").val())

    if ($("#username").val() === username && $("#password").val() === password) {
      showAlert("success", `Login successfully ${userName}.`);
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1500);
    }
    else {
      showAlert(
        "danger",
        "Username or password is incorrect!"
      );
    }
  });

  /* ******************************************* ADMİN PANEL ***************************************** */
  // Sunucudan başvuru bilgilerini al
  const getApplications = () => {
    $.ajax({
      url: "/submissions",
      type: "GET",
      success: (submissions) => {
        const tableBody = $("#tbody");
        tableBody.empty(); // Eski verileri temizle
        const dataSubmissions = submissions;
        console.log("dataSubmissions", dataSubmissions);
        dataSubmissions.forEach((submission) => {
          const fileName = submission.filePath.split("/").pop(); // Dosya adını al
          const fileURL = submission.filePath.replace(/\\/g, "/"); // Windows yolunu düzelt

          // Yeni bir satır oluştur
          const row = `
                            <tr>
                                <td>${submission.fullName}</td>
                                <td>${submission.email}</td>
                                <td>${submission.position}</td>
                                <td>
                                    <a href="${fileURL}" target="_blank" class="btn btn-primary btn-sm"><img style="with:50px;height:50px;" src="/images/pdf2.png"></a>  
                                </td>
                            </tr>
                        `;
          // Satırı tabloya ekle
          tableBody.append(row);
        });
      },
      error: (xhr) => {
        console.error("Başvurular yüklenirken hata oluştu:", xhr);
      },
    });
  };
  setTimeout(() => {
    getApplications();
  }, 10);

  /* *************************************************************************************************** */
  // Alert mesajı gösteren fonksiyon
  function showAlert(type, message) {
    const alert = $(".alert." + type); // Success veya danger alert'ini al
    const alertMessage = alert.find(".alert-message"); // Mesajı göstereceğimiz alanı al

    // Alert mesajını değiştirme
    alertMessage.text(message);

    // Alert mesajını göster
    alert.fadeIn();

    // Kapatma butonuna tıklandığında alert'i gizle
    alert.find(".close-alert").on("click", function () {
      alert.fadeOut();
    });

    // 5 saniye sonra uyarıyı otomatik olarak kapat
    setTimeout(() => {
      alert.fadeOut();
    }, 5000);
  }
});
