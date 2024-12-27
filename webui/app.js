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
    $.ajax({
      url: "/admin",
      type: "GET",
      success: (admins) => {

        const findAdmin = admins.find(admin => admin.authority == $("#authority").val());

        if (findAdmin !== undefined) {
          console.log("buradayım hello")
          if ($("#username").val() == findAdmin.username && $("#password").val() == findAdmin.password) {
            showAlert("success", `Login successfully ${findAdmin.username}.`);
            setTimeout(() => {
              window.location.href = "admin.html";
            }, 1500);
          }
          else {
            showAlert(
              "danger",
              "Login Failed!"
            );
          }
        }
        else {
          showAlert(
            "danger",
            "Only Authorized Authorities Can Enter.."
          );
        }
      },
      error: (xhr) => {
        showAlert(
          "danger",
          "admin verileri yüklenirken hata oluştu:", xhr
        );
      },
    });
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
        dataSubmissions.forEach((submission) => {
          const fileURL = submission.filePath.replace(/\\/g, "/"); // Windows yolunu düzelt

          // Yeni bir satır oluştur
          const row = `
                            <tr>
                                <td>${submission.fullName}</td>
                                <td>${submission.email}</td>
                                <td>${submission.position}</td>
                                <td>
                                    <a href="${fileURL}" target="_blank" class="btn btn-primary btn-sm">
                                    <img style="width:40px;height:40px;" src="/images/pdf2.png">
                                    </a>  
                                </td>
                                <td style="border:none;background:transparent;">
                                <button class="delete">
                                <i style="font-size:1.5rem;" class="fa-regular fa-trash-can"></i>
                                </button>
                                </td>
                            </tr>
                        `;
          // style="width:50px;height:50px;padding:1rem;border-radius:1px;background-color:transparent;border:none;"
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

  /* *********************************** DELETE PROCESS ****************************************** */
  $("#tbody").on("click", ".delete", function () {
    const row = $(this).closest("tr"); // Tıklanan butonun satırını al
    const email = row.find("td:nth-child(2)").text(); // E-posta sütununu al
    const position = row.find("td:nth-child(3)").text(); // Pozisyon sütununu al

    $.ajax({
      url: "/delete",
      type: "DELETE",
      contentType: "application/json",
      data: JSON.stringify({ email, position }), // E-posta ve pozisyonu gönder
      success: (response) => {
        showAlert("success", response.message);
        row.remove(); // Satırı tablodan kaldır
      },
      error: (xhr) => {
        const response = JSON.parse(xhr.responseText);
        showAlert(
          "danger",
          response.message || "An error occurred while deleting the submission."
        );
      },
    });
  });

  /* ******************************************** Search ******************************************** */

  $("#search-input").on("keyup", () => {

    const searchValue = $("#search-input").val().toLowerCase();
    if (searchValue === "") {
      $('#tbody tr').show();
    }
    else {
      $('#tbody tr').filter(function () {
        // Her satırı kontrol et
        $(this).toggle($(this).text().toLowerCase().indexOf(searchValue) > -1); // Eşleşen satırı göster, diğerlerini gizle
      });
    }
  });

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
