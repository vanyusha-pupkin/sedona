'use strict';

const { src, dest, series, parallel, watch } = require('gulp');

const
  gulp              = require('gulp'),

  sass              = require('gulp-sass'),                     //конвертирует scss в css
  sassGlob          = require('gulp-sass-glob'),                //объединяет сразу несколько scss файлов по маске
  gcmq              = require('gulp-group-css-media-queries'),  //группирует медиа запросы в css файлах
  mqpacker          = require('css-mqpacker'),                  //группирует медиа запросы в css файлах
  csso              = require('gulp-csso'),                     //минифицирует css файлы
  postcss           = require('gulp-postcss'),                  //нужен для работы autoprefixer
  autoprefixer      = require('autoprefixer'),                  //расставляет автопрефиксы в css файлах

  fileinclude       = require('gulp-file-include'),             //объединяет html файлы
  htmlmin           = require('gulp-htmlmin'),                  //минифицирует html файлы
  removeEmptyLines  = require('gulp-remove-empty-lines'),       //удаляет пустын строки в html файлах и комментарии в html файлах

  uglify            = require("gulp-uglify"),                   //минифицирует js файлы

  imagemin          = require("gulp-imagemin"),                 //минифицирует картинки файлы
  imgWebp           = require('gulp-webp'),                     //конвертирует jpg и png в формат webp
  svgmin            = require("gulp-svgmin"),                   //минифицирует svg файлы
  svgstore          = require("gulp-svgstore"),                 //создает svg спрайт
  sassvg            = require('gulp-sassvg'),

  ttf2woff          = require('gulp-ttf2woff'),                 //конвертирует ttf2woff1
  ttf2woff2         = require('gulp-ttf2woff2'),                //конвертирует ttf2woff2

  browserSync       = require('browser-sync').create(),         //browser-sync

  del               = require('del'),                           //удаляет файлы
  sourcemaps        = require('gulp-sourcemaps'),               //создает sourcemaps для минифирированых файлов
  gulpif            = require('gulp-if'),                       //позволяет писать условия в gulp задачах
  newer             = require("gulp-newer"),
  rename            = require('gulp-rename'),                   //переименовывает файл
  notify            = require('gulp-notify'),                   //вывод уведомлений
  plumber           = require("gulp-plumber"),                  //обработчик ошибок
  htmlValidator     = require('gulp-w3c-html-validator'),       //html - w3c валидатор
  ghPages           = require('gulp-gh-pages');                 //размещение проекта на GitHub Pages

const isDev     = (process.argv.indexOf('--dev') !== -1);
const isProd     = !isDev;


const path = {
  build:{
    html:        'build/',
    css:         'build/css/',
    js:          'build/js/',
    img:         'build/img/',
    fonts:       'build/fonts/'
  },
  src:{
    html:        ['src/**/*.html', '!src/**/_*.html'],
    scss:        'src/scss/style.scss',
    js:          'src/js/main.js',
    img:         ['src/img/**/*.{jpeg,jpg,png,gif,svg,ico,xml,webmanifest}', '!src/img/svg-sprite/*.svg', '!src/img/svg-to-sass/*.svg'],
    imgWebpJPG:     ['src/img/**/*.{jpeg,jpg}', '!src/img/favicons/*.*', '!src/img/icons/*.*'],
    imgWebpPNG:     ['src/img/**/*.png', '!src/img/favicons/*.*', '!src/img/icons/*.*'],
    svgSprite:   ['src/img/svg-sprite/*.svg', '!src/img/svg-sprite/sprite.svg'],
    svgToSass:   'src/img/svg-to-sass/*.svg',
    fonts:       'src/fonts/**/*.{woff,woff2}',
    fontsForConvert: 'src/fonts/**/*.ttf'
  },
  watch:{
    html:        './src/**/*.html',
    scss:        'src/scss/**/*.scss',
    js:          'src/js/**/*.js',
    img:         ['src/img/**/*.{jpeg,jpg,png,gif,svg}', '!src/img/svg-sprite/*.svg'],
    svgSprite:   ['src/img/svg-sprite/*.svg', '!src/img/svg-sprite/sprite.svg'],
    svgToSass:   'src/img/svg-to-sass/*.svg',
    fonts:       'src/fonts/**/*.{ttf,woff,woff2}'
  },
  clean:         ['build/*'],
  deploy:        ['build/**/*.*'],
  baseDir:       ['build/']
};

function html(){
  return src(path.src.html)
      .pipe(plumber(
        {errorHandler:
             notify.onError({
                title: "HTML Error",
                message: "<%= error.message %>",
                sound: "Blow"
            })
        }
        ))
      .pipe(fileinclude({
        prefix: '@@',
        basepath: '@file'
      }))
      .pipe(htmlmin())
      .pipe(removeEmptyLines({
        removeComments: true
      }))
      .pipe(dest(path.build.html))
      .pipe(browserSync.stream());
};

function style(){
  return src(path.src.scss)
      .pipe(plumber(
        {errorHandler:
             notify.onError({
                title: "SCSS Error",
                message: "<%= error.message %>",
                sound: "Blow"
            })
        }
        ))
      .pipe(gulpif(isDev, sourcemaps.init()))
        .pipe(sassGlob())
        .pipe(sass.sync({outputStyle: 'expanded'}))
        .pipe(postcss([
          autoprefixer(),
          // mqpacker({sort: true})
          mqpacker()
        ]))
        .pipe(dest(path.build.css))
        .pipe(csso())
        .pipe(rename({suffix: '.min'}))
      .pipe(gulpif(isDev, sourcemaps.write()))
      .pipe(dest(path.build.css))
      .pipe(browserSync.stream());
};

function js(){
  return src(path.src.js)
      .pipe(plumber())
      .pipe(fileinclude(
      // {
      //   prefix: '@@',
      //   basepath: '@file'
      // }
      ))
      .pipe(dest(path.build.js))
      .pipe(rename({ suffix: ".min" }))
      .pipe(uglify())
      .pipe(dest(path.build.js))
      .pipe(browserSync.stream());
};

function image(){
  return src(path.src.img)
      .pipe(newer(path.build.img))
      .pipe(gulpif(isProd,
        imagemin([
          imagemin.optipng({optimizationLevel: 3}),
          imagemin.mozjpeg({quality: 70, progressive: true}),
          imagemin.svgo()
        ])
      ))
      .pipe(dest(path.build.img))
      .pipe(browserSync.stream());
};

function webpJPG(){
  return src(path.src.imgWebpJPG)
      .pipe(newer(path.build.img))
      .pipe(imgWebp({quality: 65}))
      .pipe(dest(path.build.img))
      .pipe(browserSync.stream());
};

function webpPNG(){
  return src(path.src.imgWebpPNG)
      .pipe(newer(path.build.img))
      .pipe(imgWebp({
        lossless: true,
        nearLossless: 20
      }))
      .pipe(dest(path.build.img))
      .pipe(browserSync.stream());
};

function svgsprite(){
  return src(path.src.svgSprite)
      .pipe(plumber())

      .pipe(svgmin({
          plugins: [{
              removeViewBox: false
            }
            // ,{
            //    removeAttrs: {
            //     attrs: 'fill'
            //   }
            // }
            ]
      }))
      // .pipe(svgmin())
      .pipe(svgstore({inlineSvg: true}))
      .pipe(rename("sprite.svg"))
      .pipe(dest('src/img/svg-sprite'));
};

function svgscss(){
    return gulp.src(path.src.svgToSass)
        .pipe(plumber())
        .pipe(sassvg({
          outputFolder: 'src/scss/sassvg',
          optimizeSvg: true
        }));
};

function font(){
  return src(path.src.fonts)
      .pipe(plumber())
      .pipe(newer(path.build.fonts))
      .pipe(dest(path.build.fonts))
      .pipe(browserSync.stream());
};

function fontsConvertToWoff(){
  return src(path.src.fontsForConvert)
      .pipe(plumber())
      .pipe(ttf2woff())
      .pipe(newer(path.build.fonts))
      .pipe(dest(path.build.fonts))
      .pipe(browserSync.stream());
};

function fontsConvertToWoff2(){
  return src(path.src.fontsForConvert)
      .pipe(plumber())
      .pipe(ttf2woff2())
      .pipe(newer(path.build.fonts))
      .pipe(dest(path.build.fonts))
      .pipe(browserSync.stream());
};

function clean(){
  return del(path.clean);
};

function watchFiles (){
    browserSync.init({
        server: {
            baseDir: path.baseDir
        }
    });
  watch(path.watch.html, html);
  watch(path.watch.scss, style);
  watch(path.watch.img, parallel(image, webpJPG, webpPNG));
  watch(path.watch.js, js);
  watch(path.watch.fonts, parallel(font, fontsConvertToWoff, fontsConvertToWoff2));
  watch(path.watch.svgSprite, svgsprite);
  watch(path.watch.svgToSass, svgscss);
}

let build =  series(clean, svgsprite, svgscss,
             parallel(
                html,
                style,
                image,
                webpJPG,
                webpPNG,
                js,
                font,
                fontsConvertToWoff,
                fontsConvertToWoff2
));

exports.build = build;
exports.watchFiles = series(build, watchFiles);


function validateHtml(){
  return src('build/**/*.html')
     .pipe(plumber())
     .pipe(htmlValidator());
     // .pipe(htmlValidator.reporter());
};

exports.validateHtml = validateHtml;


function deploy(){
  return gulp.src('build/**/*')
    .pipe(ghPages());
};

exports.deploy = deploy;
