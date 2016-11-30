$('#webcam_container').hide();
$('#upload_container').hide();
$('#image').hide();

var localStream;
var video = document.getElementById('video');
var img = document.getElementById('profilepic');
var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');
var video = document.getElementById('video');
var pictureInput = document.getElementById('media');
var uploadUrl = "";
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
    var dataURL = canvas.toDataURL('image/png');

    var file = dataURItoFile(dataURL);
    var formData = new FormData();

    // var file = new File([array], "webcam.png", {type: "image/png", lastModified: Date.now()});
    // console.log(pictureInput.files[0]);

    console.log(file);
    formData.append('media', file);

    sendXHRequest(formData, 'api/upload');
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

//          $('#upload-status').text("");
//  $('#progress').text("");
//   $('#result').text("");



});

document.getElementById("returnFromUpload").addEventListener("click", function () {
    $('#profile').show();
    $('#choose_container').show();
    $('#upload_container').hide();
});

document.getElementById("upload").addEventListener("click", function () {
    var formData = new FormData();
    console.log(pictureInput.files[0]);
    formData.append('media', pictureInput.files[0]);
    // console.log(formData.file);
    if ($('#media').val() != "") {
        sendXHRequest(formData, 'api/upload');
        $('#choose_container').show();
        $('#upload_container').hide();
        $('#profile').show();

    }



});
function sendXHRequest(formData, uri) {
    // Get an XMLHttpRequest instance
    var xhr = new XMLHttpRequest();
    // Set up events
    xhr.upload.addEventListener('loadstart', onloadstartHandler, false);
    xhr.upload.addEventListener('progress', onprogressHandler, false);
    xhr.upload.addEventListener('load', onloadHandler, false);
    xhr.addEventListener('readystatechange', onreadystatechangeHandler, false);
    // Set up request
    xhr.open('POST', uri, true);
    // Fire!
    xhr.send(formData);
}
// Handle the start of the transmission
function onloadstartHandler(evt) {
    var div = document.getElementById('upload-status');
    div.innerHTML = 'Upload started.';
}
// Handle the end of the transmission
function onloadHandler(evt) {
    var div = document.getElementById('upload-status');
    div.innerHTML += '<' + 'br>File uploaded. Waiting for response.';
}
// Handle the progress
function onprogressHandler(evt) {
    var div = document.getElementById('progress');
    var percent = evt.loaded / evt.total * 100;
    div.innerHTML = 'Progress: ' + percent + '%';
}
// Handle the response from the server
function onreadystatechangeHandler(evt) {
    var status, text, readyState;
    try {
        readyState = evt.target.readyState;
        text = evt.target.responseText;
        status = evt.target.status;
    }
    catch (e) {
        return;
    }
    if (readyState == 4 && status == '200' && evt.target.responseText) {
        var status = document.getElementById('upload-status');
        status.innerHTML += '<' + 'br>Success!';
        var result = document.getElementById('result');
        result.innerHTML = '<p>The server uploaded  it on:</p><pre>' + evt.target.responseText + '</pre>';
        profilepic.src = evt.target.responseText;
        $('#image').text(evt.target.responseText);
    }
}

function dataURItoFile(dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for (var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], {type: 'image/png'});;
}