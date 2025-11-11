const xlsx = require('xlsx');
const path = require('path');

const FILE_TO_CHECK = 'result2022.xlsx'; 

const filePath = path.join(__dirname, FILE_TO_CHECK);

try {
    console.log(`🔎 Читаю файл: ${FILE_TO_CHECK}...`);
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        const headers = data[0];
        
        console.log('✅ Нашел следующие столбцы в твоем файле:');
        console.log('============================================');
        
        headers.forEach((headerName, index) => {
            console.log(` ${String(index + 1).padStart(3)}. ${headerName}`);
        });
        
        console.log('============================================');
        console.log('Теперь скопируй ОДНО из этих названий (включая все символы) и вставь его в index.js');

    } else {
        console.log('❌ Файл пустой или не удалось прочитать заголовки.');
    }

} catch (error) {
    console.error(`🛑 Ошибка при чтении файла: ${error.message}`);
    console.error('Убедись, что имя файла в "FILE_TO_CHECK" указано верно.');
}