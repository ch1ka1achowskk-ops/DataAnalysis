const xlsx = require('xlsx');
const ss = require('simple-statistics');
const path = require('path');
const fs = require('fs');

const FILES_TO_PROCESS = [
    { name: 'result2015.xlsx', year: 2014 },
    { name: 'result2020.xlsx', year: 2019 },
    { name: 'result2021.xlsx', year: 2020 },
    { name: 'result2022.xlsx', year: 2021 },
];

const COLUMN_TO_FORECAST = 'Доля доходов вуза из внебюджетных источников';   
const OUTPUT_FILENAME = 'prognoz_DohodiVnebajet.json';

const COLUMN_ID = 'ID';
const COLUMN_NAME = 'VUZ';
const FORECAST_YEAR = 2024;

function loadSheetData(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        return xlsx.utils.sheet_to_json(sheet);
    } catch (error) {
        console.error(`❌ Ошибка при чтении файла: ${filePath}`);
        return null;
    }
}

async function runForecast() {
    console.log(`🚀 Начинаю прогноз для: "${COLUMN_TO_FORECAST}"...`);

    const vuzDataMap = new Map();

    for (const fileInfo of FILES_TO_PROCESS) {
        const filePath = path.join(__dirname, fileInfo.name);
        const data = loadSheetData(filePath);
        if (!data) continue;

        for (const row of data) {
            const vuzId = row[COLUMN_ID];
            const vuzName = row[COLUMN_NAME];
            const value = row[COLUMN_TO_FORECAST];

            if (!vuzId || value === undefined || value === null) continue;
            const numericValue = parseFloat(String(value).replace(',', '.'));
            if (isNaN(numericValue)) continue;

            if (!vuzDataMap.has(vuzId)) {
                vuzDataMap.set(vuzId, { name: vuzName, data: [] });
            }
            vuzDataMap.get(vuzId).data.push([fileInfo.year, numericValue]);
        }
    }

    console.log(`📊 Данные собраны. Всего уникальных ВУЗов: ${vuzDataMap.size}`);
    
    const results = []; 

    vuzDataMap.forEach((vuz, id) => {
        if (vuz.data.length < 2) return; 
        
        vuz.data.sort((a, b) => a[0] - b[0]);
        
        try {
            const regressionModel = ss.linearRegression(vuz.data);
            const predictFunction = ss.linearRegressionLine(regressionModel);
            const forecastValue = predictFunction(FORECAST_YEAR);
            const slope = regressionModel.m; // <--- ВОТ ГЛАВНОЕ ИЗМЕНЕНИЕ

            results.push({
                id: id,
                name: vuz.name,
                forecast: parseFloat(forecastValue.toFixed(2)),
                slope: slope // <--- МЫ ЕГО СОХРАНЯЕМ
            });

        } catch (error) {
            
        }
    });

    try {
        fs.writeFileSync(OUTPUT_FILENAME, JSON.stringify(results, null, 2));
        console.log('============================================');
        console.log(`✅ Прогноз завершен!`);
        console.log(`   Результаты сохранены в файл: ${OUTPUT_FILENAME}`);
        console.log(`   Всего спрогнозировано ВУЗов: ${results.length}`);
        console.log('============================================');
    } catch (error) {
        console.error(`🛑 Ошибка при сохранении файла: ${error.message}`);
    }
}

runForecast();