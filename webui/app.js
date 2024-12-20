$(document).ready(function () {
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
                showAlert("danger", response.message || "An error occurred while submitting the form.");
            },
        });
    });

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
