$(function() {
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
    var codeMap = { // Used to convert number 2 image
        '0': [255, 255, 255],
        '1': [228, 228, 228],
        '2': [136, 136, 136],
        '3': [34,  34,  34],
        '4': [255, 167, 209],
        '5': [229, 0,   0],
        '6': [229, 149, 0],
        '7': [160, 106, 66],
        '8': [229, 217, 0],
        '9': [148, 224, 68]
    };

    var canvas = $('#imageCanvas')[0];
    var ctx = canvas.getContext('2d');
    var imgWidth;
    var imgHeight;
    var imgTemplate;
    var pixelSize = 1;

    function init() {
        $('#imgUploadButton').change(function(e) {
            pixelSize = parseInt($('#pixelSize').val());
            if (pixelSize <= 0 || pixelSize > 50) {
                pixelSize = 1;
            }
            $('#template').val('Generating template...');
            loadImageToCanvas(e, convertCanvasToTemplate);
        });

        $('#number2img').click(function() {
            // format: xxxyyy
            var text = $.trim($('#number2imgText').val());
            if (text.length != 6) {
                console.log('Enter 6 numbers');
                return;
            }

            canvas.width = 6;
            canvas.height = 1;
            for (var i = 0; i < 6; i++) {
                var numberRGB = codeMap[text[i]];
                ctx.fillStyle = "rgba("+numberRGB[0]+","+numberRGB[1]+","+numberRGB[2]+","+1+")";
                ctx.fillRect(i, 0, 1, 1);
                console.log(text[i] + ' = ' + numberRGB);
            }
        });

        $('#img2number').click(function(){
            var strNumber = imgToNumber(ctx, 6);
            $('#number2imgText').val(strNumber);
        });
    }

    function imgToNumber(canvasContext, numberOfPixels) {
        var strNumber = '';
        var pix = canvasContext.getImageData(0, 0, numberOfPixels, 1);
        for (var i = 0; i < numberOfPixels; i++) {
            var rgbaI = i * 4;
            var num = getColorCode(pix.data[rgbaI], pix.data[rgbaI+1], pix.data[rgbaI+2]);
            strNumber += num;
        }
        return strNumber;
    }

    function getColorCode(r, g, b) {
        var colorKey = r + ', ' + g + ', ' + b;
        return colorMap[colorKey];
    }

    function convertCanvasToTemplate() {
        var pix = ctx.getImageData(0, 0, imgWidth, imgHeight);
        imgTemplate = [];
        var x, y, i;
        var row;

        for (y = 0; y < imgHeight; y+= 1) {
            row = [];
            for (x = 0; x < imgWidth; x+= 1) {
                i = 4 * (y * imgWidth + x);
                if (pix.data[i+3] < 255) { // ignore any pixel with transparency
                    row.push(undefined);
                    continue;
                }
                // Get color code, if none matched we ignore it
                row.push(getColorCode(pix.data[i], pix.data[i+1], pix.data[i+2]));
            }
            imgTemplate.push(row);
        }
        $('#template').val('var template = ' + templateToString(imgTemplate) + ';');
    }

    function pixelCodeToString(pixel) {
        if (typeof pixel  == 'undefined') {
            return '  ';
        }
        if (pixel < 10) {
            return ' ' + pixel;
        }
        return pixel;
    }

    function templateToString(template) {
        var height = template.length;
        if (height == 0) return '[]';
        var width = template[0].length;
        if (width == 0) return '[]';

        var strTemplate = "[\n";
        for (y = 0; y < imgHeight; y++) {
            row = '[';
            for (x = 0; x < imgWidth; x++) {
                if (x == imgWidth - 1) {
                    row += pixelCodeToString(template[y][x]);
                } else {
                    row += pixelCodeToString(template[y][x]) + ',';
                }
            }

            if (y == imgHeight - 1) {
                row += "]]";
            } else {
                row += "],\n";
            }
            
            strTemplate += row;
        }
        return strTemplate;
    }

    function loadImageToCanvas(e, onDone){
        var img = new Image();
        img.onload = function(){
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img,0,0);

            imgWidth = img.width;
            imgHeight = img.height;
            onDone();
        }
        
        if (typeof e == 'string') {
            img.src = e;
        } else {
            var reader = new FileReader();
            reader.onload = function(event){
                img.src = event.target.result;
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    }


    // todo: make pixelsize work on converter
    init();
    loadImageToCanvas('test.png', convertCanvasToTemplate);
});