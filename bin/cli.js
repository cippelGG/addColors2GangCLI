#!/usr/bin/env node

const fs = require("fs"); // standard in Node.js

const PDFParser = require("pdf2json");
const { degrees, PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const yargs = require("yargs");


const options = yargs
    .option("i", { alias: "input", describe: "Input file", type: "string", demandOption: true })
    .option("o", { alias: "output", describe: "Output file", type: "string", demandOption: true })
    .argv;

const days = [
    { 'day': 'zondag', 'c': '0.95, 0.95, 0.1' },
    { 'day': 'maandag', 'c': '0.95, 0.1, 0.95' },
    { 'day': 'dinsdag', 'c': '0.1, 0.95, 0.1' },
    { 'day': 'woensdag', 'c': '0.1, 0.1, 0.95' },
    { 'day': 'donderdag', 'c': '0.95, 0.1, 0.1' },
    { 'day': 'vrijdag', 'c': '0.1, 0.95, 0.95' },
    { 'day': 'zaterdag', 'c': '0.95, 0.95, 0.95' },
];

main(options.input, options.output)

async function main(input, output) {
    const options = {}; /* see below */

    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError));
    pdfParser.on("pdfParser_dataReady", async pdfData => {
        var filtered = [];
        // console.log( pdfData.Pages[0] )
        // fs.writeFileSync("pages.json", JSON.stringify(pdfData.Pages[0]) );
        for (let i = 0; i < pdfData.Pages[0].Texts.length; i++) {
            const content = pdfData.Pages[0].Texts[i];
            if (content.R[0].T.substr(0, 10) == "Leverdatum") {
                var contentTop = pdfData.Pages[0].Texts[i - 5],
                    contentBot = pdfData.Pages[0].Texts[i + 1],
                    x = content.x,
                    y = content.y,
                    w = 0;

                var offset = [-5, -4, -3, -2, -1, 0, 1];
                //Check amount of lines;
                if( pdfData.Pages[0].Texts[i-4].R[0].T.substr(0,8) == "Ordernr." ){
                    offset = [-4, -3, -2, -1, 0, 1];
                } 
                for (const j of offset) {
                    var contentNow = pdfData.Pages[0].Texts[i + j];
                    if (contentNow.w > w) {
                        w = contentNow.w;
                    }
                }

                var rot = 0;
                if (content.R[0].RA != undefined) {
                    rot = content.R[0].RA
                    h = contentBot.x - contentTop.x
                }
                filtered.push({
                    x: (x),
                    y: (y)-(20/16),
                    w: (w),
                    date: content.R[0].T.substr(16, 10),
                    rotation: rot,
                    order: pdfData.Pages[0].Texts[i - 3].R[0].T
                })
            }
        }

        const pdfDoc = await addGraphics(input, filtered);
        fs.writeFileSync(output, await pdfDoc.save());
        
        console.log(`${input} writen to output`);

        // var outputImage = pdf2img.convert(output);
        // outputImage.then(function (outputImages) {
        //     for (i = 0; i < outputImages.length; i++){
        //         fs.writeFile("output" + i + ".png", outputImages[i], function (error) {
        //             if (error) { console.error("Error: " + error); } else {
        //                 console.log('writing')
        //             }
        //         });
        //     }
        // });
    });
    pdfParser.loadPDF(input);

    async function addGraphics(file, data) {
        // console.log(data);
        const pdfDoc = await PDFDocument.load(fs.readFileSync(file))

        const pages = pdfDoc.getPages()
        const firstPage = pages[0]
        const { width, height } = firstPage.getSize()
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
        // console.log([width, height])

        for (const single of data) {

            const d = new Date(single.date),
                dayi = d.getDay();
            
            if(single.rotation == 90){
                firstPage.drawRectangle({
                    x: (single.x*16)+16,
                    y: (height - (single.y*16))-32,  
                    width: 24,
                    height: single.w,
                    color: eval('rgb(' + days[dayi].c + ')')
                })
                firstPage.drawText(days[dayi].day, {
                    x: (single.x*16)+31,
                    y: (height - (single.y*16))-17,  
                    size: 12,
                    font: helveticaFont,
                    color: rgb(1, 1, 1),
                    rotate: degrees(90)
                })
            } else { 
                firstPage.drawRectangle({
                    x: (single.x*16)+5,
                    y: height - (single.y*16) - 67,  
                    width: single.w,
                    height: 24,
                    color: eval('rgb(' + days[dayi].c + ')')
                })
                firstPage.drawText(days[dayi].day, {
                    x: (single.x*16)+20,
                    y: height - (single.y*16) - 57,  
                    size: 12,
                    font: helveticaFont,
                    color: rgb(1, 1, 1),
                    rotate: degrees(0)
                })
            }
        }
        return pdfDoc;



        for (const single of data) {
            const d = new Date(single.date),
                dayi = d.getDay();
            var tx = single.x * 2.8346,
                ty = single.y * 2.8346,
                tw = 100,
                th = 20;

            if (single.rotation == 90) { //This is the normal straight one for some reason..
                tw = 20; th = 100;

                tx -= 105;
                ty -= 0;
                var tr = 90,
                    ttx = tx + 14,
                    tty = ty - 6;
            } else {
                tx += 0;
                ty -= 20;
                var tr = 00,
                    ttx = tx + 10,
                    tty = ty - 6;
            }
            firstPage.drawRectangle({
                x: tx,
                y: height - ty,
                width: tw,
                height: th,
                color: eval('rgb(' + days[dayi].c + ')')
            })
            firstPage.drawText(days[dayi].day, {
                x: ttx,
                y: height - tty,
                size: 12,
                font: helveticaFont,
                color: rgb(1, 1, 1),
                rotate: degrees(tr)
            })
        }

        return pdfDoc;
    }

    function psPointsToMm(inp) {
        return Math.round(inp / 2.83464567);
    }
    function mmToPoints(inp) {
        return Math.round(inp * 2.83464567);
    }
    function mmToPoints2(inp) {
        return mmToPoints(mmToPoints(inp));
    }
    function pointsToMm(inp) {
        // return inp;
        return Math.round((inp * 10) * 5.6445) / 10;
    }
}