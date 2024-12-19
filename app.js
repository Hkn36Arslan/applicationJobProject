
$(document).ready(function () {

    $("#form").on("submit", (e) => {
        e.preventDefault();

        let datas = {
            fullName: $("#fullname").val(),
            Email: $("#email").val(),
            position: $("#select").val(),
            cvFile: $("#cvFile").val()
        }

        console.log("datas:", datas);

    });

















});
