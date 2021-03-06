import {SPRITE_WIDTH, SPRITE_HEIGHT, PICTURE_WIDTH, PICTURE_HEIGHT, paths} from './sprite-constants.js';

let out = document.createElement('canvas');
out.width = SPRITE_WIDTH;
out.height = SPRITE_HEIGHT;
let ctx = out.getContext('2d');

let pout = document.createElement('canvas');
pout.width = PICTURE_WIDTH;
pout.height = PICTURE_HEIGHT;
let pctx = pout.getContext('2d');

let images = {};

function loadImages() {
    return Promise.all(paths.map(path => new Promise(resolve => {
        let img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = new URL(`./images/student/${path}.png`, import.meta.url);
        img.onload = resolve;

        let split = path.split('/');
        let code = split[1];
        if (split[2]) {
            code += split[2] === 'shadow' ? 's' : '';
        } else if (split[0] === 'hat') {
            code = 'hat' + (split[1] === 'shadow' ? 's' : '');
        }
        images[code] = img;
    })));
}

// If more than one parts of the code call loadImages() directly, some images
// fail to render properly initially. I think it's because the newer one
// overwrites images[code] with a new Image that needs to be loaded
let imagesLoaded;
function loadImagesSafely() {
    if (!imagesLoaded) {
        imagesLoaded = loadImages();
    }
    return imagesLoaded;
}

function drawTinted(image, y, facing, cuts) {
    cuts.push(23);
    for (let i = 0; i < cuts.length; i++) {
        ctx.drawImage(image, 0, cuts[i - 1] || 0, SPRITE_WIDTH, cuts[i] - (cuts[i - 1] || 0) + 1, 0, (cuts[i - 1] || 0) + y + i, facing * SPRITE_WIDTH, cuts[i] - (cuts[i - 1] || 0) + 1);
    }
}

function getSprite(sprite, picture=false) {
    if (picture) {
        pctx.drawImage(images.picture, 0, 0);
    }

    ctx.save();
    ctx.clearRect(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);
    ctx.scale(sprite.facing, 1);

    let cuts = [];
    for (let i = 0; i < sprite.height; i++) {
        cuts.push(i === sprite.height - 1 && i !== 0 ? 22 : 15);
    }

    drawTinted(images.skin, 3 - sprite.height, sprite.facing, cuts);
    if (!picture) {
        drawTinted(images['pants' + sprite.pants.type], 3 - sprite.height, sprite.facing, cuts);
        drawTinted(images['shoes' + sprite.shoes.type], 3, sprite.facing, []);
    }
    drawTinted(images['shirt' + sprite.shirt.type], 3 - sprite.height, sprite.facing, cuts);
    drawTinted(images.shadow, 3 - sprite.height, sprite.facing, cuts);
    drawTinted(images['hair' + sprite.hair.type], 3 - sprite.height, sprite.facing, cuts);
    drawTinted(images['hair' + sprite.hair.type + 's'], 3 - sprite.height, sprite.facing, cuts);

    if (sprite.hat.type) {
        drawTinted(images.hat, 3 - sprite.height, sprite.facing, []);
        drawTinted(images.hats, 3 - sprite.height, sprite.facing, []);
    }

    let gid = ctx.getImageData(0, 0, SPRITE_WIDTH, SPRITE_HEIGHT);

    for (let i = 0; i < gid.data.length; i += 4) {
        let id = [];

        // this method is so messy but it works
        if (gid.data[i] + gid.data[i + 1] + gid.data[i + 2] === 0 || gid.data[i + 3] === 0) {
            // #000 (eyes and mouth) or transparent
            gid.data[i] = 102;
            id = ['skin', 0];
        } else if (gid.data[i] === 51) { // #333 (hat mask)
            gid.data[i + 3] = 0; // erase pixels
            continue;
        } else if (gid.data[i] === gid.data[i + 1]) {
            if (gid.data[i] === gid.data[i + 2]) { // #xxx (hat)
                id = ['hat', 0];
            } else if (gid.data[i + 2] === 0) { // #xx0 (pants)
                id = ['pants', 0];
            } else { // #00x (shirt 2)
                id = ['shirt', 2, 1];
            }
        } else if (gid.data[i] === gid.data[i + 2]) {
            if (gid.data[i + 1] === 0) { // #x0x (hair)
                id = ['hair', 0];
            } else { // #0x0 (shoes)
                id = ['shoes', 1];
            }
        } else {
            if (gid.data[i] === 0) { // #0xx (shirt 1)
                id = ['shirt', 1, 0];
            } else { // #x00 (skin)
                id = ['skin', 0];
            }
        }

        let rgb = sprite[id[0]].tint[id[2] ? id[2] : 0];
        let base = gid.data[i + id[1]];
        gid.data[i] = Math.max(0, rgb[0] - (255 - base));
        gid.data[i + 1] = Math.max(0, rgb[1] - (255 - base));
        gid.data[i + 2] = Math.max(0, rgb[2] - (255 - base));
    }

    ctx.putImageData(gid, 0, 0);
    ctx.restore();

    if (picture) {
        pctx.drawImage(out, 2, 0);
        return pout;
    }
    return out;
}

export {
    SPRITE_WIDTH,
    SPRITE_HEIGHT,
    PICTURE_WIDTH,
    PICTURE_HEIGHT,
    loadImagesSafely as loadImages,
    getSprite,

    // Just in case??
    SPRITE_WIDTH as WIDTH,
    SPRITE_HEIGHT as HEIGHT
};
