var crypto = require('crypto');


var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');
var fs = require('fs');

var visual_recognition = new VisualRecognitionV3({

    //     {
    //   "url": "https://gateway-a.watsonplatform.net/visual-recognition/api",
    //   "note": "It may take up to 5 minutes for this key to become active",
    //   "api_key": "6cc3af0fb87ce11d06eaeb8bf6ff3a1f283c765d"
    // }
    api_key: '6cc3af0fb87ce11d06eaeb8bf6ff3a1f283c765d',
    version_date: '2016-05-19'
});

var genRandomString = function (length) {
    return crypto.randomBytes(Math.ceil(length / 2))
        .toString('hex') /** convert to hexadecimal format */
        .slice(0, length);   /** return required number of characters */
};


var sha512 = function (password, salt) {
    var hash = crypto.createHmac('sha512', salt); /** Hashing algorithm sha512 */
    hash.update(password);
    var value = hash.digest('hex');
    return {
        salt: salt,
        passwordHash: value
    };
};

module.exports = {
    saltHashPassword: function (userpassword, salt) {
        if (salt == 0) {
            var salt = genRandomString(16); /** Gives us salt of length 16 */
        }
        var passwordData = sha512(userpassword, salt);
        return {
            salt: passwordData.salt,
            passwordHash: passwordData.passwordHash
        };
    },
    recognizeFace: function (file, result) {
        // console.log(__dirname +'/uploads/'+file);
        var params = {
            images_file: fs.createReadStream(__dirname + '/uploads/' + file),
            classifier_id: "faces"
        };

        visual_recognition.detectFaces(params,
            function (err, response) {
                if (err)
                    console.log(err);
                else
                var output = JSON.stringify(response, null, 2);
                result(output.includes("face_location"));
            });
    }
}