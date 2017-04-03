(function() {

// Copyright Bruno Cassol <brunocassol@gmail.com>. All rights reserved.
// This was developed in a rush during a weekend while fighting Reddit devs and helping coordinating a campaign on /r/place. Don't judge me.
// License  MIT

///////////////////////////////////////////////////
// PIXEL PATROLLING AND DRAWING
///////////////////////////////////////////////////
var getPlacePixelCode = function(x, y) {
    return window.r.place.state[y*1000 + x];
};

var sleepFor = function (sleepDuration ){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ /* do nothing */ } 
}

var getServerPixelCode = function(x, y) {
    var color;
    var ajaxCall = $.ajax({
        async: false,
        url: "https://www.reddit.com/api/place/pixel.json?x=" + x + "&y=" + y,
        type: "GET",
        headers: { "x-modhash": modHash }
    })
    .then(function(data, textStatus, jqXHR) { // success
        color = data.color;
    },
    function( jqXHR, textStatus, errorThrown) { // error
        timerMsg = "Error retrieving color from server";
        console.log("Error retrieving color from server: ", textStatus, errorThrown);
    });

    return color;
};

var setPixelState = function(x, y, color) {
    return window.r.place.state[y*1000 + x] = color;
};

var drawPixel = function(xX, yY, colorCode, successCallback, errorCallback) {
    $.ajax({
        url: "https://www.reddit.com/api/place/draw.json",
        type: "POST",
        headers: { "x-modhash": modHash },
        data: { x: xX, y: yY, color: colorCode },
        success: function(data) {successCallback(data, xX, yY, colorCode)},
        error: errorCallback
    });
};

var searchAndDrawOnePixel = function(template, xBase, yBase, successCallback, errorCallback) {
    var width = template[0].length;
    var height = template.length;

    timerMsg = "Patrolling " + (width * height) + " pixels...";
    console.log(timerMsg);

    var x, y, xX, yY;
    for (y = 0; y < height; y++) {
        for (x = 0; x < width; x++) {
            xX = xBase + x;
            yY = yBase + y;
            var templatePixelCode = template[y][x];
            if (typeof templatePixelCode == 'undefined') { // Unknown pixel code, ignore it
                continue;
            }
            var placePixelCode = getPlacePixelCode(xX, yY);
            //console.log("___placePixelCode("+xX+", "+yY+"):" + placePixelCode);
            //console.log("templatePixelCode("+x+", "+y+"):" + templatePixelCode);

            if (placePixelCode != templatePixelCode) {
                var serverPixelCode = getServerPixelCode(xX, yY);
                if (templatePixelCode == serverPixelCode) {
                    setPixelState(xX, yY, serverPixelCode); // fix state so we don't mess with this next time
                    timerMsg = "Pixel " + xX + ", " + yY + " is incorrect on canvas but correct on server. Skipping.";
                    console.log(timerMsg);
                    continue;
                }
                timerMsg = "Drawing on ("+xX+", "+yY+") with color: " + templatePixelCode;
                console.log(timerMsg);
                drawPixel(xX, yY, templatePixelCode, successCallback, errorCallback);
                return;
            }
        }
    }
};


///////////////////////////////////////////////////
// DISPLAY BOT COUNTDOWN UNDER TIMER
///////////////////////////////////////////////////
var nextDrawTimeSec = 600;
var timerMsg = "BOT IS STARTING...";
var getTimerMsg = function() {
    return timerMsg + "(" + Math.floor(nextDrawTimeSec) + "s)";
}

var setupTimer = function() {
    $('#place-palette').hide();
    var $botTimer = $('#place-timer').clone();
    $botTimer.attr('id', 'bot-timer').css('top', '50px').css('font-size', '12px');
    $botTimer.insertAfter('#place-timer').show();

    setInterval(function() {
        nextDrawTimeSec = nextDrawTimeSec - 1;
        if (!$botTimer.is(':visible')) {
            $botTimer.show();
        }
        $botTimer.text(getTimerMsg());
    }, 1000);
}



///////////////////////////////////////////////////
// TEMPLATE IMAGE DOWNLOADER AND CONVERTER
///////////////////////////////////////////////////
var colorMap = {
    '255, 255, 255': 0,
    '228, 228, 228': 1,
    '136, 136, 136': 2,
    '34, 34, 34': 3,
    '255, 167, 209': 4,
    '229, 0, 0': 5,
    '229, 149, 0': 6,
    '160, 106, 66': 7,
    '229, 217, 0': 8,
    '148, 224, 68': 9,
    '2, 190, 1': 10,
    '0, 211, 221': 11,
    '0, 131, 199': 12,
    '0, 0, 234': 13,
    '207, 110, 228': 14,
    '130, 0, 128': 15
};

var getColorCode = function(r, g, b) {
    var colorKey = r + ', ' + g + ', ' + b;
    return colorMap[colorKey];
}

var getTemplateFromRemoteImage = function(imgUrl, onDone) {
    var $canvas = $('<canvas></canvas>').css('visibility', 'hidden');
    $canvas.insertAfter('#place-timer');

    var canvas = $canvas[0];
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0);
        
        var pix = ctx.getImageData(0, 0, img.width, img.height);
        var imgTemplate = [];
        var x, y, i;
        var row;

        for (y = 0; y < img.height; y+= 1) {
            row = [];
            for (x = 0; x < img.width; x+= 1) {
                i = 4 * (y * img.width + x);
                if (pix.data[i+3] < 255) { // ignore any pixel with transparency
                    row.push(undefined);
                    continue;
                }
                // Get color code, if none matched we ignore it
                row.push(getColorCode(pix.data[i], pix.data[i+1], pix.data[i+2]));
            }
            imgTemplate.push(row);
        }
        $canvas.remove();
        onDone(imgTemplate);
    }
    img.src = imgUrl
};

var pixelCodeToString = function(pixel) {
    if (typeof pixel  == 'undefined') {
        return '  ';
    }
    if (pixel < 10) {
        return ' ' + pixel;
    }
    return pixel;
}

var templateToString = function(template) {
    var height = template.length;
    if (height == 0) return '[]';
    var width = template[0].length;
    if (width == 0) return '[]';

    var strTemplate = "[\n";
    for (y = 0; y < height; y++) {
        row = '[';
        for (x = 0; x < width; x++) {
            if (x == width - 1) {
                row += pixelCodeToString(template[y][x]);
            } else {
                row += pixelCodeToString(template[y][x]) + ',';
            }
        }

        if (y == height - 1) {
            row += "]]";
        } else {
            row += "],\n";
        }
        
        strTemplate += row;
    }
    return strTemplate;
}

var imgToNumber = function(canvasContext, numberOfPixels) {
    var strNumber = '';
    var pix = canvasContext.getImageData(0, 0, numberOfPixels, 1);
    for (var i = 0; i < numberOfPixels; i++) {
        var rgbaI = i * 4;
        var num = getColorCode(pix.data[rgbaI], pix.data[rgbaI+1], pix.data[rgbaI+2]);
        strNumber += num;
    }
    return strNumber;
}

// Downloads an image from Github then convert its pixels to numbers and set xBase and yBase.
var getBaseXYFromRemoteImage = function(imgUrl, onDone) {
    var $canvas = $('<canvas></canvas>').css('visibility', 'hidden');
    $canvas.insertAfter('#place-timer');

    var canvas = $canvas[0];
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function(){
        var x, y
        if (img.width != 6 || img.height != 1) {
            console.log("Coordinate image isn't 6x1.");
            $canvas.remove();
            onDone(x, y);
            return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img,0,0);

        var strNumber = imgToNumber(ctx, 6);
        x = parseInt(strNumber.substring(0, 3));
        y = parseInt(strNumber.substring(3));
        $canvas.remove();
        onDone(x, y);
    }
    img.src = imgUrl
};

///////////////////////////////////////////////////
// START EVERYTHING
///////////////////////////////////////////////////
var onError = function (jqXHR, textStatus, errorThrown) { // Function( jqXHR jqXHR, String textStatus, String errorThrown )
    if (jqXHR.responseJSON.error == 429) {
        nextDrawTimeSec = jqXHR.responseJSON.wait_seconds + 1;
        timerMsg = "Can only paint after cooldown.";
        console.log("Can only paint after cooldown. Trying again in " + nextDrawTimeSec + " seconds.");
        setTimeout(runBot, nextDrawTimeSec * 1000);
    } else {
        timerMsg = "PAINT AJAX ERROR";
        console.log(timerMsg, jqXHR);
    }
};

var onSuccess = function (data, xX, yY, colorCode) {
    // Set pixel state so we don't draw in same pixel again
    setPixelState(xX, yY, colorCode);
    if (getPlacePixelCode(xX, yY) != colorCode) {
        timerMsg = "FOR SOME REASON COLOR STATE WASN'T CHANGED AS IT NEEDED.";
        console.log(timerMsg);
    }

    console.log("Successfully painted pixel " + xX + ',' + yY + ' with color ' + colorCode + '.');
    nextDrawTimeSec = data.wait_seconds + 2;
    timerMsg = "BOT WAITING... ";
    console.log("Painting next pixel in " + nextDrawTimeSec + " seconds...");
    setTimeout(runBot, nextDrawTimeSec * 1000);
};

var modHash = window.reddit.modhash; // This triggers Reddit devs beyond imaginable so they attempt to send an error log to their servers. You can prevent this by blocking this URL: https://www.reddit.com/web/log/error.json
setupTimer();

function runBot() {
    getTemplateFromRemoteImage('https://raw.githubusercontent.com/brunocassol/sandboxandutils/master/template.png', function(template) {
        console.log("====== GOT TEMPLATE =======");
        console.log(templateToString(template));
        getBaseXYFromRemoteImage('https://raw.githubusercontent.com/brunocassol/sandboxandutils/master/xy.png', function(x, y) {
            //console.log("====== GOT X/Y =======");
            console.log('xBase=' + x + ' yBase=' + y);
            searchAndDrawOnePixel(template, x, y, onSuccess, onError);
        });
    });

}
runBot();

})();