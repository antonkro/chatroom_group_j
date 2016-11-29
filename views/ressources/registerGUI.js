$('#webcam_container').hide();
$('#upload_container').hide();
$('#image').hide();

var localStream;
var video = document.getElementById('video');
var img = document.getElementById('profilepic');
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var video = document.getElementById('video');
var pictureInput = document.getElementById('pictureInput');

// Trigger photo take
document.getElementById("snap").addEventListener("click", function () {
    context.drawImage(video, 0, 0, 200, 200);
});
document.getElementById("chs_webcam").addEventListener("click", function () {
    profile_mode = "webcam"
    $('#profile').hide();
    $('#choose_container').hide();
    $('#webcam_container').show();

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { width: 200, height: 200 } }).then(function (stream) {
            localStream = stream;
            video.src = window.URL.createObjectURL(stream);
            video.play();
        });
    }
});
document.getElementById("use").addEventListener("click", function () {

    profilepic.src = canvas.toDataURL();
    $('#profile').show();
    $('#choose_container').show();
    $('#webcam_container').hide();
    localStream.getTracks().forEach(function (track) {
        track.stop();
    });
});

document.getElementById("returnFromWebcam").addEventListener("click", function () {
    $('#profile').show();
    $('#choose_container').show();
    $('#webcam_container').hide();
    localStream.getTracks().forEach(function (track) {
        track.stop();
    });
});

document.getElementById("chs_upload").addEventListener("click", function () {
    $('#upload_container').show();
    $('#profile').hide();
    $('#choose_container').hide();


});

document.getElementById("returnFromUpload").addEventListener("click", function () {
    $('#profile').show();
    $('#choose_container').show();
    $('#upload_container').hide();
});

document.getElementById("upload").addEventListener("click", function () {
    // var formData = new FormData();
    // console.log(pictureInput.files[0]);
    // formData.append('file', pictureInput.files[0]);
    // console.log(formData);

    // $.ajax({
    //     url: '/api/upload',
    //     type: 'POST',
    //     processData: false, // important
    //     contentType: false, // important
    //     dataType: 'multipart/form-data',
    //     data: myFormData,
    //     success: function (data) {
    //         $('#image').show();
    //         $('#image').text("HALLO");
    //     }
    // });

});