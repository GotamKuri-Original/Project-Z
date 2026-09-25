const fs = require('fs');
const { marked } = require('marked');

const filesToConvert = [
    'Team_Presentation_Guide.md',
    'Project_Knowledge_Base.md'
];

const css = `
<style>
    body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        padding: 20px;
        max-width: 800px;
        margin: 0 auto;
        color: #333;
        background-color: #f9f9f9;
    }
    .markdown-body {
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    h1, h2, h3 { border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; font-size: 14px; }
    th, td { border: 1px solid #dfe2e5; padding: 8px 13px; text-align: left; }
    th { background-color: #f6f8fa; }
    blockquote { border-left: 4px solid #dfe2e5; margin: 0 0 16px 0; padding: 0 15px; color: #6a737d; }
    code { background-color: rgba(27,31,35,0.05); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; }
    pre { background-color: #f6f8fa; padding: 16px; overflow: auto; border-radius: 3px; }
    pre code { background-color: transparent; padding: 0; }
    img { max-width: 100%; box-sizing: content-box; }
</style>
`;

async function convertFiles() {
    for (const file of filesToConvert) {
        if (fs.existsSync(file)) {
            const mdContent = fs.readFileSync(file, 'utf8');
            const htmlContent = marked.parse(mdContent);
            
            const fullHtml = "<!DOCTYPE html>\n" +
"<html lang=\"en\">\n" +
"<head>\n" +
"    <meta charset=\"UTF-8\">\n" +
"    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
"    <title>" + file.replace('.md', '').replace(/_/g, ' ') + "</title>\n" +
"    " + css + "\n" +
"</head>\n" +
"<body>\n" +
"    <div class=\"markdown-body\">\n" +
"        " + htmlContent + "\n" +
"    </div>\n" +
"</body>\n" +
"</html>";
            
            const outFile = file.replace('.md', '.html');
            fs.writeFileSync(outFile, fullHtml);
            console.log("Converted " + file + " to " + outFile);
        } else {
            console.log("File " + file + " not found.");
        }
    }
}

convertFiles();
