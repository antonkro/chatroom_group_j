
var obj = $('messages');
obj.scrollTop = obj.scrollHeight;

var socket = io.connect(appUrl);
// console.log("DEBUG:chatroom.js")
socket.emit('add user', user, chatroom);



// $('form').submit(function(){
//   $('#chatfield').val(' ');
// });

socket.on('message', function (msg) {
    $('#messages').append($('<li>').text(msg));
    $('#chatfield').val('');
    $('#media').val('');
});

socket.on('upload', function (msg, inner) {
    // console.log(msg);
    var list = document.createElement("li");
    var aTag = document.createElement('a');
    var diver = document.createElement('div');
    aTag.setAttribute('href', msg);
    aTag.setAttribute('target', "_blank");

    var imgpat = (/\.(gif|jpg|jpeg|tiff|png)$/i);
    var pdfpat = (/\.(pdf)$/i);
    var txtpat = (/\.(txt|rtf)$/i);
    var audpat = (/\.(txt|rtf)$/i);

    if (imgpat.test(msg)) {
        msg = "<img src='" + msg + "'style='max-width:400px;max-height: 400px;'>";
    }
    if (pdfpat.test(msg)) {
        msg = "<embed src='" + msg + "'style='width:100%;height:500px;'>";
    }
    if (txtpat.test(msg)) {
        msg = "<object data='" + msg + "' type='text/plain' width='500' style='height: 300px'><a href='" + msg + "'>" + msg + "</a></object>";
    }
        <!--Audio -->
        if(/\.(mp3)$/i.test(msg)) {
        msg = "<audio controls><source src='" + msg + "' type='audio/mpeg'>Your browser does not support the audio element.</audio>";
    }
    if (/\.(ogg)$/i.test(msg)) {
        msg = "<audio controls><source src='" + msg + "' type='audio/ogg'>Your browser does not support the audio element.</audio>";
    }
        <!--Video -->
        if(/\.(mp4|mpeg)$/i.test(msg)) {
        msg = "<video width='400px' height='100%' controls><source src='" + msg + "' type='video/mp4'>Your browser does not support the audio element.</video>";
    }
    if (/\.(ogg)$/i.test(msg)) {
        msg = "<video width='400px' height='100%' controls><source src='" + msg + "' type='video/ogg'>Your browser does not support the audio element.</video>";
    }
    if (/\.(webm)$/i.test(msg)) {
        msg = "<video width='400px' height='100%' controls><source src='" + msg + "' type='video/webm'>Your browser does not support the audio element.</video>";
    }



    aTag.innerHTML = msg;
    diver.textContent = inner;
    list.appendChild(diver);
    list.appendChild(aTag);

    // list.setAttribute("value",(inner));
    console.log(aTag);
    console.log(list);
    $('#messages').append(list);
});
// <!-- Attempt to clear upload field after send -->
// $("#media").replaceWith($("#media").val('').clone(true));

// $(':file').submit(function(msg){
//      socket.emit('message','test');
//   $('#chatfield').val('');
//   return false;
// });
$(document).ready(function () {
    document.getElementById("upload").addEventListener("click", function () {
        var formData = new FormData();
        var pictureInput = document.getElementById('media');
        // console.log(pictureInput.files[0]);
        formData.append('media', pictureInput.files[0]);
        // console.log(formData.file);
        if ($('#media').val() != "") {
            document.getElementById("upload").disabled = true;
            sendXHRequest(formData, 'api/upload');
        }



        // $('#uploadForm').submit(function() {
        //   $("#status").empty().text("File is uploading...");
        //   document.getElementById("upload").disabled = true;
        //   $("#upload").attr('upload', 'Upload...');
        //     $(this).ajaxSubmit({
        //       error: function(xhr) {
        //         status('Error: ' + xhr.status);
        //         },
        //       success: function(response) {
        //         // console.log(response)
        //         socket.emit('upload');
        //            $('#uploadForm')[0].reset();
        //            document.getElementById("upload").disabled = false;
        //         $("#upload").attr('upload', 'Upload');
        //         $("#status").empty().text(response);
        //     // console.log('HIER->>>>>>>>>>>>>>>>'+ $('#media').val());
        //         }
        //     });
        //   return false;

    });
    document.getElementById("send").addEventListener("click", function (event) {
        $('#media').val('');
        socket.emit('message', $('#chatfield').val());
         event.preventDefault();
    });

});

function sendBtn() {
    $('#media').val('');
    socket.emit('message', $('#chatfield').val());
}
function sendXHRequest(formData, uri) {
    var xhr = new XMLHttpRequest();
    xhr.addEventListener('readystatechange', onreadystatechangeHandler, false);
    xhr.open('POST', uri, true);
    xhr.send(formData);
}
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
        socket.emit('upload');
        $('#uploadForm')[0].reset();
        document.getElementById("upload").disabled = false;
        $("#upload").attr('upload', 'Upload');
    }
}